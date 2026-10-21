import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// 운영에서는 `supabase secrets set TOSS_SECRET_KEY=...`로 내 상점 시크릿 키를 넣으세요.
// 설정이 없으면 토스 문서용 테스트 시크릿 키로 동작해요(실제 결제 안 됨).
const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

async function loadItems(supabase: SupabaseClient, orderUuid: string) {
  const { data } = await supabase
    .from("order_items")
    .select("product_id, product_name, brand, size, qty, unit_price, line_total")
    .eq("order_id", orderUuid)
    .order("id");
  return (data ?? []).map((i) => ({
    productId: i.product_id,
    name: i.product_name,
    brand: i.brand,
    size: i.size,
    qty: i.qty,
    unitPrice: i.unit_price,
    lineTotal: i.line_total,
  }));
}

const summary = (o: any, items: unknown[]) => ({
  orderId: o.order_id,
  orderName: o.order_name,
  amount: o.amount,
  amounts: { origin: o.origin_amount, subtotal: o.subtotal, coupon: o.coupon_amount, shipping: o.shipping_fee, total: o.amount },
  status: o.status,
  method: o.payment_method,
  approvedAt: o.approved_at,
  items,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED", message: "POST만 지원해요." }, 405);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ code: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아니에요." }, 400);
  }

  const { paymentKey, orderId } = b ?? {};
  const amount = Number(b?.amount);
  if (typeof paymentKey !== "string" || !paymentKey || typeof orderId !== "string" || !orderId || !Number.isInteger(amount)) {
    return json({ code: "INVALID_REQUEST", message: "paymentKey, orderId, amount가 필요해요." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // 실패로 바꾸면서, 잡아 둔 재고가 있으면 되돌려요(없으면 아무 일도 안 해요).
  const markFailed = async (code: string, message: string | null) => {
    await supabase.from("orders").update({ status: "failed", failure_code: code, failure_message: message }).eq("order_id", orderId).eq("status", "pending");
    await supabase.rpc("release_order_stock", { p_order_id: orderId });
  };

  const { data: order, error: findError } = await supabase.from("orders").select("*").eq("order_id", orderId).maybeSingle();
  if (findError) {
    console.error("confirm-payment select failed", findError);
    return json({ code: "DB_ERROR", message: "주문을 조회하지 못했어요." }, 500);
  }
  if (!order) return json({ code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없어요." }, 404);

  // 이미 승인된 주문이면 같은 결과를 돌려줘요(새로고침·중복 요청 대비).
  if (order.status === "paid") {
    if (order.payment_key === paymentKey) return json({ ok: true, ...summary(order, await loadItems(supabase, order.id)) });
    return json({ code: "ALREADY_PROCESSED_PAYMENT", message: "이미 결제된 주문이에요." }, 409);
  }
  if (order.status !== "pending") {
    return json({ code: "ORDER_NOT_PENDING", message: order.failure_message || "이미 처리가 끝난 주문이에요. 다시 주문해 주세요." }, 409);
  }

  // 서버가 계산해 저장해 둔 금액과 다르면 승인하지 않아요(금액 위변조 방지).
  // (재고를 이미 잡아 둔 주문은 다른 요청이 승인 중일 수 있어서 상태는 건드리지 않아요.)
  if (order.amount !== amount) {
    if (!order.stock_reserved) await markFailed("AMOUNT_MISMATCH", `주문 ${order.amount}원 / 결제 요청 ${amount}원`);
    return json({ code: "AMOUNT_MISMATCH", message: "주문 금액과 결제 금액이 달라요." }, 400);
  }

  // 첫 구매 쿠폰 주문인데 그 사이 같은 회원의 다른 주문이 먼저 결제됐으면(창 두 개로 동시 주문 등) 승인하지 않아요.
  // (재고를 이미 잡아 둔 주문은 토스 승인을 다시 확인하는 중일 수 있어서 건너뛰어요.)
  if (order.use_coupon && order.user_id && !order.stock_reserved) {
    const { count, error: couponError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", order.user_id)
      .eq("status", "paid")
      .neq("id", order.id);
    if (couponError) {
      console.error("confirm-payment coupon check failed", couponError);
      return json({ code: "DB_ERROR", message: "쿠폰 사용 여부를 확인하지 못했어요." }, 500);
    }
    if (count) {
      const message = "첫 구매 쿠폰은 이미 다른 주문에서 썼어요. 쿠폰 없이 다시 주문해 주세요.";
      await markFailed("COUPON_ALREADY_USED", message);
      return json({ code: "COUPON_ALREADY_USED", message }, 409);
    }
  }

  // 토스 승인 전에 재고를 먼저 줄여요. 모자라면 승인하지 않아요(동시 구매 시 한 명만 성공).
  const { error: stockError } = await supabase.rpc("reserve_order_stock", { p_order_id: orderId });
  if (stockError) {
    const msg = stockError.message ?? "";
    if (msg.startsWith("SOLD_OUT:")) {
      const [, name, size] = msg.split(":");
      const message = `${name} ${size} 사이즈 재고가 부족해 결제하지 않았어요.`;
      await markFailed("SOLD_OUT", message);
      return json({ code: "SOLD_OUT", message }, 409);
    }
    if (msg.includes("ORDER_NOT_PENDING")) return json({ code: "ORDER_NOT_PENDING", message: "이미 처리가 끝난 주문이에요." }, 409);
    console.error("confirm-payment reserve stock failed", stockError);
    return json({ code: "DB_ERROR", message: "재고를 확인하지 못했어요." }, 500);
  }

  let res: Response;
  try {
    res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TOSS_SECRET_KEY}:`),
        "Content-Type": "application/json",
        "Idempotency-Key": orderId,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
  } catch (e) {
    // 승인 여부를 알 수 없어요. 재고는 잡아 둔 채로 두고, 새로고침하면 같은 Idempotency-Key로 다시 확인해요.
    console.error("confirm-payment toss request failed", orderId, e);
    return json({ code: "TOSS_NETWORK_ERROR", message: "결제 승인 결과를 확인하지 못했어요. 잠시 후 새로고침해 주세요." }, 502);
  }
  const toss = await res.json().catch(() => ({}));

  if (!res.ok) {
    await markFailed(toss.code ?? String(res.status), toss.message ?? null);
    return json({ code: toss.code ?? "TOSS_ERROR", message: toss.message ?? "결제 승인에 실패했어요." }, res.status >= 500 ? 502 : 400);
  }

  const { data: paid, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_key: toss.paymentKey,
      payment_method: toss.method ?? null,
      approved_at: toss.approvedAt ?? new Date().toISOString(),
      toss_response: toss,
      failure_code: null,
      failure_message: null,
    })
    .eq("order_id", orderId)
    .select()
    .single();

  const items = await loadItems(supabase, order.id);
  if (updateError) {
    // 토스에서는 이미 승인됐으니 로그를 남기고, 화면에는 승인 사실을 알려요.
    console.error("confirm-payment update failed AFTER toss approval", orderId, updateError);
    return json({
      ok: true,
      ...summary({ ...order, status: "paid", payment_method: toss.method ?? null, approved_at: toss.approvedAt ?? null }, items),
      warning: "저장 중 오류가 있었어요. 고객센터에 주문번호를 알려주세요.",
    });
  }

  return json({ ok: true, ...summary(paid, items) });
});
