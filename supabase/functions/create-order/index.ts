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

const isStr = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

// 금액 규칙 (prd.md 4장)
const FREE_SHIPPING_MIN = 50_000;
const SHIPPING_FEE = 3_000;
const COUPON_MAX = 10_000;
const MAX_QTY = 10;
const MAX_AMOUNT = 10_000_000;

type Item = { id: string; size: string; qty: number };
type Problem = { id: string; size: string; reason: "NOT_FOUND" | "INVALID_SIZE" | "SOLD_OUT"; message: string; stock?: number };

// 주문서는 상품·사이즈·수량·쿠폰 사용 여부만 보내요. 가격·할인·배송비·쿠폰은 DB 상품 정보로 서버가 직접 계산해요.
async function quote(supabase: SupabaseClient, raw: Item[], useCoupon: boolean) {
  const merged = new Map<string, Item>();
  for (const it of raw) {
    const key = `${it.id}|${it.size}`;
    const prev = merged.get(key);
    if (prev) prev.qty += it.qty;
    else merged.set(key, { id: it.id, size: it.size, qty: it.qty });
  }
  const items = [...merged.values()];

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, price, final_price, is_active, product_sizes(size, stock)")
    .in("id", [...new Set(items.map((it) => it.id))]);
  if (error) throw error;

  const lines = [];
  const problems: Problem[] = [];
  for (const it of items) {
    const p = products?.find((x) => x.id === it.id);
    if (!p || !p.is_active) {
      problems.push({ id: it.id, size: it.size, reason: "NOT_FOUND", message: "판매하지 않는 상품이 있어요." });
      continue;
    }
    const size = p.product_sizes.find((s: { size: string }) => s.size === it.size);
    if (!size) {
      problems.push({ id: it.id, size: it.size, reason: "INVALID_SIZE", message: `${p.name}: ${it.size} 사이즈가 없어요.` });
      continue;
    }
    if (it.qty > MAX_QTY) {
      problems.push({ id: it.id, size: it.size, reason: "SOLD_OUT", message: `${p.name} ${it.size}: 한 번에 ${MAX_QTY}개까지 살 수 있어요.`, stock: size.stock });
      continue;
    }
    if (size.stock < it.qty) {
      problems.push({
        id: it.id,
        size: it.size,
        reason: "SOLD_OUT",
        stock: size.stock,
        message: size.stock > 0 ? `${p.name} ${it.size}: 재고가 ${size.stock}개 남았어요.` : `${p.name} ${it.size}: 품절됐어요.`,
      });
      continue;
    }
    lines.push({
      productId: p.id,
      name: p.name,
      brand: p.brand,
      size: it.size,
      qty: it.qty,
      unitPrice: p.final_price,
      unitOriginPrice: p.price,
      lineTotal: p.final_price * it.qty,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const origin = lines.reduce((s, l) => s + l.unitOriginPrice * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  // 쿠폰: 상품 합계의 20%, 10원 단위 내림, 최대 1만원 (subtotal × 0.2 ÷ 10 = subtotal ÷ 50)
  const coupon = useCoupon ? Math.min(Math.floor(subtotal / 50) * 10, COUPON_MAX) : 0;
  const total = subtotal - coupon + shipping;
  const orderName = lines.length > 1 ? `${lines[0].name} 외 ${lines.length - 1}건` : lines[0]?.name ?? "";

  return {
    lines,
    problems,
    orderName,
    amounts: { origin, productDiscount: origin - subtotal, subtotal, coupon, shipping, total },
  };
}

// dryRun: true  → 저장하지 않고 금액만 계산해서 돌려줘요(주문서 화면 표시용).
// dryRun 없음   → 다시 계산해서 화면 금액(expectedAmount)과 같을 때만 'pending' 주문과 주문 상세를 저장해요.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED", message: "POST만 지원해요." }, 405);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ code: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아니에요." }, 400);
  }

  const items = b?.items;
  const itemsValid =
    Array.isArray(items) && items.length > 0 && items.length <= 50 &&
    items.every((it: any) => isStr(it?.id, 20) && isStr(it?.size, 10) && Number.isInteger(it?.qty) && it.qty >= 1 && it.qty <= MAX_QTY);
  if (!itemsValid) return json({ code: "INVALID_REQUEST", message: "주문 상품 정보가 올바르지 않아요." }, 400);
  // 이전 버전 주문서는 쿠폰 할인 금액(coupon)을 보내요. 금액은 무시하고 사용 여부만 봐요.
  const useCoupon = b?.useCoupon === true || (Number.isInteger(b?.coupon) && b.coupon > 0);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let q;
  try {
    q = await quote(supabase, items, useCoupon);
  } catch (e) {
    console.error("create-order quote failed", e);
    return json({ code: "DB_ERROR", message: "상품 정보를 불러오지 못했어요." }, 500);
  }

  if (b?.dryRun === true) return json({ ok: true, ...q });

  // ---------- 주문 저장 ----------
  // 화면에 보인 금액. (이전 버전 주문서는 amount로 보내요)
  const expectedAmount = b?.expectedAmount ?? b?.amount;
  const o = b?.orderer ?? {};
  const valid =
    isStr(b?.orderId, 64) &&
    /^[A-Za-z0-9_\-=.@]{6,64}$/.test(b.orderId) &&
    Number.isInteger(expectedAmount) &&
    isStr(o.name, 50) && /^01\d{8,9}$/.test(o.phone ?? "") && isStr(o.address, 300) &&
    (!o.email || (typeof o.email === "string" && o.email.length <= 200)) &&
    (!o.memo || (typeof o.memo === "string" && o.memo.length <= 200));
  if (!valid) return json({ code: "INVALID_REQUEST", message: "주문 정보가 올바르지 않아요." }, 400);

  if (q.problems.length) {
    return json({ code: q.problems[0].reason === "SOLD_OUT" ? "SOLD_OUT" : "PRODUCT_UNAVAILABLE", message: q.problems[0].message, problems: q.problems, amounts: q.amounts }, 409);
  }
  const { total } = q.amounts;
  if (total < 1 || total > MAX_AMOUNT) return json({ code: "INVALID_AMOUNT", message: "주문 금액은 1원 이상 1,000만원 이하여야 해요." }, 400);
  if (expectedAmount !== total) {
    return json({ code: "AMOUNT_CHANGED", message: "결제 금액이 바뀌었어요. 금액을 확인하고 다시 결제해 주세요.", amounts: q.amounts }, 409);
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_id: b.orderId,
      order_name: q.orderName,
      amount: total,
      origin_amount: q.amounts.origin,
      subtotal: q.amounts.subtotal,
      shipping_fee: q.amounts.shipping,
      coupon_amount: q.amounts.coupon,
      use_coupon: useCoupon,
      orderer_name: o.name.trim(),
      orderer_phone: o.phone,
      orderer_email: o.email || null,
      address: o.address.trim(),
      memo: o.memo || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return json({ code: "DUPLICATE_ORDER", message: "이미 있는 주문번호예요." }, 409);
    console.error("create-order insert failed", error);
    return json({ code: "DB_ERROR", message: "주문을 저장하지 못했어요." }, 500);
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    q.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      product_name: l.name,
      brand: l.brand,
      size: l.size,
      qty: l.qty,
      unit_price: l.unitPrice,
      unit_origin_price: l.unitOriginPrice,
      line_total: l.lineTotal,
    })),
  );
  if (itemsError) {
    console.error("create-order items insert failed", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);
    return json({ code: "DB_ERROR", message: "주문을 저장하지 못했어요." }, 500);
  }

  return json({ ok: true, orderId: b.orderId, orderName: q.orderName, amount: total, amounts: q.amounts });
});
