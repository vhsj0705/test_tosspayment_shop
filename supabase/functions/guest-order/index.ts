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

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

// 주문번호별로 30분 안에 5번 틀리면 잠가요(휴대폰 번호 무작위 대입 방지).
const MAX_FAILS = 5;
const LOCK_MINUTES = 30;

// 화면에 보여 줄 때 이름·주소 일부를 가려요(홍*동, 서울 강남구 ***).
const maskName = (s: string | null) => {
  const c = [...(s ?? "")];
  if (c.length <= 1) return "*";
  if (c.length === 2) return c[0] + "*";
  return c[0] + "*".repeat(c.length - 2) + c[c.length - 1];
};
const maskAddress = (s: string | null) => {
  const parts = (s ?? "").trim().split(/\s+/);
  return parts.length <= 2 ? parts[0] + " ***" : parts.slice(0, 2).join(" ") + " ***";
};

// 토스 응답 중 필요한 항목만 저장해요(휴대폰 번호·secret 등은 저장하지 않아요).
const pickToss = (t: any) => ({
  paymentKey: t.paymentKey,
  orderId: t.orderId,
  orderName: t.orderName,
  status: t.status,
  method: t.method,
  totalAmount: t.totalAmount,
  balanceAmount: t.balanceAmount,
  requestedAt: t.requestedAt,
  approvedAt: t.approvedAt,
  receiptUrl: t.receipt?.url,
  card: t.card ? { ...t.card, number: undefined } : undefined,
  easyPay: t.easyPay,
  cancels: t.cancels,
});

async function detail(supabase: SupabaseClient, o: any) {
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, product_name, brand, size, qty, unit_price, line_total")
    .eq("order_id", o.id)
    .order("id");
  return {
    orderId: o.order_id,
    orderName: o.order_name,
    status: o.status,
    amount: o.amount,
    amounts: { origin: o.origin_amount, subtotal: o.subtotal, coupon: o.coupon_amount, shipping: o.shipping_fee, total: o.amount },
    method: o.payment_method,
    createdAt: o.created_at,
    approvedAt: o.approved_at,
    canceledAt: o.canceled_at,
    cancelReason: o.cancel_reason,
    failureMessage: o.failure_message,
    ordererName: maskName(o.orderer_name),
    address: maskAddress(o.address),
    items: (items ?? []).map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      brand: i.brand,
      size: i.size,
      qty: i.qty,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
  };
}

// 비회원 주문 조회·취소. 주문번호와 주문할 때 쓴 휴대폰 번호가 둘 다 맞아야 해요.
// action: "get"    → 주문 상세
// action: "cancel" → 토스 결제 취소 + 주문 'canceled' + 재고 복구
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED", message: "POST만 지원해요." }, 405);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ code: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아니에요." }, 400);
  }

  const action = b?.action;
  const orderId = typeof b?.orderId === "string" ? b.orderId.trim() : "";
  const phone = typeof b?.phone === "string" ? b.phone.replace(/\D/g, "") : "";
  if (!["get", "cancel"].includes(action) || !/^[A-Za-z0-9_\-=.@]{6,64}$/.test(orderId) || !/^01\d{8,9}$/.test(phone)) {
    return json({ code: "INVALID_REQUEST", message: "주문번호와 휴대폰 번호를 확인해 주세요." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  const { count: fails, error: failError } = await supabase
    .from("guest_order_attempts")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .gte("failed_at", since);
  if (failError) {
    console.error("guest-order attempts select failed", failError);
    return json({ code: "DB_ERROR", message: "주문을 조회하지 못했어요." }, 500);
  }
  if ((fails ?? 0) >= MAX_FAILS) {
    return json({ code: "TOO_MANY_ATTEMPTS", message: `잘못 입력한 횟수가 많아 ${LOCK_MINUTES}분 동안 조회할 수 없어요. 잠시 후 다시 시도해 주세요.` }, 429);
  }

  const { data: order, error } = await supabase.from("orders").select("*").eq("order_id", orderId).eq("orderer_phone", phone).maybeSingle();
  if (error) {
    console.error("guest-order select failed", error);
    return json({ code: "DB_ERROR", message: "주문을 조회하지 못했어요." }, 500);
  }
  // 주문번호만 맞고 번호가 틀려도 같은 안내를 해요(다른 사람 주문 존재 여부를 알려주지 않기 위해).
  if (!order) {
    await supabase.from("guest_order_attempts").insert({ order_id: orderId });
    return json({ code: "ORDER_NOT_FOUND", message: "주문번호와 휴대폰 번호가 일치하는 주문이 없어요." }, 404);
  }

  if (action === "get") return json({ ok: true, ...(await detail(supabase, order)) });

  // ---------- 취소 ----------
  if (order.status === "canceled") return json({ ok: true, ...(await detail(supabase, order)) });
  // 회원 주문은 주문한 회원이 로그인해야 취소할 수 있어요.
  if (order.user_id) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await supabase.auth.getUser(token);
    if (auth?.user?.id !== order.user_id) {
      return json({ code: "LOGIN_REQUIRED", message: "회원 주문은 주문한 계정으로 로그인한 뒤 취소할 수 있어요." }, 403);
    }
  }
  if (order.status !== "paid" || !order.payment_key) {
    return json({ code: "NOT_CANCELABLE", message: "결제 완료된 주문만 취소할 수 있어요." }, 409);
  }

  const reason = typeof b?.reason === "string" && b.reason.trim() ? b.reason.trim().slice(0, 200) : "고객 요청";
  let res: Response;
  try {
    res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(order.payment_key)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TOSS_SECRET_KEY}:`),
        "Content-Type": "application/json",
        "Idempotency-Key": `cancel-${orderId}`,
      },
      body: JSON.stringify({ cancelReason: reason }),
    });
  } catch (e) {
    console.error("guest-order toss cancel request failed", orderId, e);
    return json({ code: "TOSS_NETWORK_ERROR", message: "결제 취소 결과를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
  const toss = await res.json().catch(() => ({}));
  if (!res.ok && toss.code !== "ALREADY_CANCELED_PAYMENT") {
    return json({ code: toss.code ?? "TOSS_ERROR", message: toss.message ?? "결제를 취소하지 못했어요." }, res.status >= 500 ? 502 : 400);
  }

  const { data: canceled, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      cancel_reason: reason,
      ...(res.ok ? { toss_response: pickToss(toss) } : {}),
    })
    .eq("id", order.id)
    .select()
    .single();
  const { error: stockError } = await supabase.rpc("release_order_stock", { p_order_id: orderId });

  if (updateError || stockError) {
    console.error("guest-order update failed AFTER toss cancel", orderId, updateError, stockError);
    return json({ ok: true, ...(await detail(supabase, { ...order, status: "canceled" })), warning: "취소는 됐지만 저장 중 오류가 있었어요. 고객센터에 주문번호를 알려주세요." });
  }
  return json({ ok: true, ...(await detail(supabase, canceled)) });
});
