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

// 키는 Supabase 대시보드(Edge Functions → Secrets)에 넣어요.
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini";
const UPSTAGE_API_KEY = Deno.env.get("UPSTAGE_API_KEY");

// IP별로 10분에 20번까지(요금 폭주 방지).
const MAX_REQUESTS = 20;
const WINDOW_MINUTES = 10;
const MAX_MESSAGES = 10;
const MAX_USER_CHARS = 500;
const MAX_TOOL_ROUNDS = 4;

const CATEGORY_LABEL: Record<string, string> = { top: "상의", shoes: "신발", pants: "바지" };

// 쇼핑 안내 문서. 배송비·쿠폰 규칙을 바꾸면 목록 페이지 FAQ, llms.txt와 함께 여기도 고쳐요.
// 내용이 바뀌면 다음 대화 요청 때 자동으로 다시 임베딩해요.
const GUIDE = [
  { id: "shipping", text: "배송비: 상품 합계가 5만원 이상이면 무료배송이고, 5만원 미만이면 배송비 3,000원이 붙어요. 결제 다음 날 출발해요." },
  { id: "coupon", text: "신규 회원 첫 구매 쿠폰: 상품 합계의 20%를 깎아 줘요. 10원 단위는 버리고 최대 1만원까지 할인돼요. 로그인한 회원이 처음 결제할 때 한 번만 쓸 수 있어요. 비회원은 쓸 수 없어요." },
  { id: "payment", text: "결제 수단: 주문서에서 토스페이먼츠 결제위젯으로 카드·간편결제 등을 골라요. 이 사이트는 퍼블리싱 예시라 결제는 토스페이먼츠 테스트 환경에서 진행되고 실제로 청구되지 않아요. 주문 금액은 1원부터 1,000만원까지예요." },
  { id: "guest-order", text: "주문 조회·취소: 회원가입 없이 비회원으로 주문할 수 있어요. 상단 '주문조회'(order.html)에서 주문번호와 주문할 때 쓴 휴대폰 번호를 넣으면 주문 내역을 보고 결제 완료 주문을 취소할 수 있어요. 회원 주문은 주문한 계정으로 로그인해야 취소돼요. 잘못 입력하면 주문번호별로 30분 안에 5번까지 시도할 수 있어요." },
  { id: "cancel-refund", text: "취소·환불: 결제 완료 주문을 취소하면 토스페이먼츠 결제가 바로 취소되고 재고도 되돌아와요. 결제 대기·실패 주문은 취소할 게 없어요." },
  { id: "stock", text: "재고·품절: 사이즈별 재고를 실시간으로 보여줘요. 재고가 없는 사이즈는 품절로 표시하고, 결제할 때도 재고를 다시 확인해서 모자라면 결제를 막아요. 한 번에 상품당 최대 10개까지 담을 수 있어요." },
  { id: "login", text: "로그인: 지금은 이메일로 가입하고 로그인할 수 있어요. 카카오·네이버·구글 간편 로그인은 준비 중이에요. 좋아요(찜)는 로그인한 회원만 쓸 수 있어요." },
  { id: "cart", text: "장바구니·바로 구매: 상품을 눌러 사이즈와 수량을 고른 뒤 '장바구니'에 담거나 '바로 구매'로 주문서로 가요. 장바구니는 이 브라우저에 저장돼요." },
];

const SYSTEM_PROMPT = `너는 패션 쇼핑몰 FITLOG의 쇼핑 도우미야. 상의·신발·바지를 팔아.
- 상품 질문(추천, 가격, 재고, 사이즈)은 반드시 search_products로 찾고, 도구 결과에 있는 상품·가격·사이즈만 말해. 없는 상품이나 숫자를 지어내지 마.
- 배송·쿠폰·결제·취소·로그인 같은 쇼핑몰 규칙은 search_guide로 찾고 그 내용대로만 답해. 모르면 모른다고 하고 고객센터나 해당 페이지를 안내해.
- 손님이 자기 주문(배송, 결제 상태, 취소)을 물으면 show_order_lookup을 호출해. 화면에 뜬 조회 칸에 주문번호와 휴대폰 번호를 넣으라고 안내하고, 채팅창에 휴대폰 번호를 쓰지 말라고 말해. 조회 결과는 그 칸 아래에 바로 보여.
- 후기, 평점, 사이즈 추천표, 적립금은 이 쇼핑몰에 없어. 있는 것처럼 말하지 마.
- FITLOG와 관계없는 질문은 정중히 쇼핑 관련 질문만 도울 수 있다고 해.
- 한국어로 짧게(3~6문장) 답해. 모든 문장을 해요체로 끝내('~합니다', '~드리겠습니다'는 쓰지 마). 마크다운(별표, 샵, 표)은 쓰지 마. 줄바꿈은 써도 돼.
- 답에 상품 id(T008 같은 코드)는 쓰지 말고 브랜드와 상품명으로 말해. 상품 카드는 화면이 따로 보여줘.
- product_ids에는 답에서 소개한 상품의 id만, 도구 결과에 있던 것만 넣어(최대 4개). 소개한 상품이 없으면 빈 배열.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "FITLOG 상품을 의미 검색해요. 지금 가격·할인율·재고 있는 사이즈를 돌려줘요.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "찾을 상품 설명(예: '오버핏 회색 후드', '출근용 슬랙스')" },
          category: { type: "string", enum: ["top", "shoes", "pants"], description: "상의 top, 신발 shoes, 바지 pants. 모르면 생략" },
          max_price: { type: "integer", description: "판매가 상한(원). 없으면 생략" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_guide",
      description: "배송비, 쿠폰, 결제, 주문 조회·취소, 재고, 로그인 같은 쇼핑몰 안내를 찾아요.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "show_order_lookup",
      description: "손님 화면에 주문번호·휴대폰 번호 조회 칸을 띄워요. 개인정보는 채팅으로 받지 않아요.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const REPLY_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "chat_reply",
    strict: true,
    schema: {
      type: "object",
      properties: {
        reply: { type: "string" },
        product_ids: { type: "array", items: { type: "string" } },
      },
      required: ["reply", "product_ids"],
      additionalProperties: false,
    },
  },
};

// 채팅에 휴대폰 번호를 써도 OpenAI로 보내지 않아요.
const maskPhone = (s: string) => s.replace(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/g, "[휴대폰 번호 생략]");

async function embed(input: string[], model: "embedding-passage" | "embedding-query"): Promise<number[][]> {
  const res = await fetch("https://api.upstage.ai/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTAGE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upstage embeddings ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return [...data.data].sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

const productText = (p: any) =>
  `${CATEGORY_LABEL[p.category] ?? p.category} > ${p.sub_category}. ${p.brand} ${p.name}${(p.badges ?? []).includes("only") ? " (FITLOG 단독)" : ""}`;

// 판매 중인 상품과 안내 문서 중 내용이 바뀐 것만 다시 임베딩해요. 내린 상품의 문서는 지워요.
async function syncDocuments(supabase: SupabaseClient) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, category, sub_category, brand, name, badges")
    .eq("is_active", true);
  if (error) throw error;
  const wanted = new Map<string, { kind: string; product_id: string | null; content: string }>();
  for (const p of products ?? []) wanted.set(`product:${p.id}`, { kind: "product", product_id: p.id, content: productText(p) });
  for (const g of GUIDE) wanted.set(`faq:${g.id}`, { kind: "faq", product_id: null, content: g.text });

  const { data: existing, error: docError } = await supabase.from("chat_documents").select("id, content");
  if (docError) throw docError;
  const have = new Map((existing ?? []).map((d) => [d.id, d.content]));

  const stale = [...wanted].filter(([id, d]) => have.get(id) !== d.content);
  if (stale.length) {
    const vectors = await embed(stale.map(([, d]) => d.content), "embedding-passage");
    const rows = stale.map(([id, d], i) => ({ id, ...d, embedding: vectors[i], updated_at: new Date().toISOString() }));
    const { error: upsertError } = await supabase.from("chat_documents").upsert(rows);
    if (upsertError) throw upsertError;
  }
  const removed = [...have.keys()].filter((id) => !wanted.has(id));
  if (removed.length) await supabase.from("chat_documents").delete().in("id", removed);
}

async function match(supabase: SupabaseClient, query: string, count: number) {
  const [vector] = await embed([query.slice(0, 300)], "embedding-query");
  const { data, error } = await supabase.rpc("match_chat_documents", { query_embedding: vector, match_count: count });
  if (error) throw error;
  return data as { id: string; kind: string; product_id: string | null; content: string; similarity: number }[];
}

async function searchProducts(supabase: SupabaseClient, args: any) {
  const hits = (await match(supabase, String(args.query ?? ""), 20)).filter((d) => d.kind === "product");
  const ids = hits.map((d) => d.product_id!);
  if (!ids.length) return { products: [] };
  const { data, error } = await supabase
    .from("products")
    .select("id, category, sub_category, brand, name, price, sale_rate, final_price, badges, product_sizes(size, stock, sort_order)")
    .in("id", ids)
    .eq("is_active", true);
  if (error) throw error;
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  const maxPrice = Number.isInteger(args.max_price) ? args.max_price : null;
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .filter((p) => (!args.category || p.category === args.category) && (maxPrice == null || p.final_price <= maxPrice))
    .slice(0, 6)
    .map((p) => {
      const sizes = [...(p.product_sizes ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const inStock = sizes.filter((s) => s.stock > 0).map((s) => s.size);
      return {
        id: p.id,
        category: CATEGORY_LABEL[p.category],
        sub_category: p.sub_category,
        brand: p.brand,
        name: p.name,
        price: p.price,
        sale_rate: p.sale_rate,
        final_price: p.final_price,
        exclusive: (p.badges ?? []).includes("only"),
        sizes_in_stock: inStock,
        sold_out: inStock.length === 0,
      };
    });
  return { products };
}

async function searchGuide(supabase: SupabaseClient, args: any) {
  const hits = (await match(supabase, String(args.query ?? ""), 8)).filter((d) => d.kind === "faq").slice(0, 3);
  return { guide: hits.map((d) => d.content) };
}

async function callOpenAI(messages: any[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      tools: TOOLS,
      response_format: REPLY_FORMAT,
      reasoning_effort: "low",
      max_completion_tokens: 4000,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`openai ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data.choices[0].message;
}

// 쇼핑 도우미 챗봇. 대화 내용은 저장하지 않아요.
// 요청: { messages: [{ role: "user" | "assistant", content }] } (마지막은 user)
// 응답: { reply, productIds, action: "order_lookup" | null }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED", message: "POST만 지원해요." }, 405);
  if (!OPENAI_API_KEY || !UPSTAGE_API_KEY) {
    return json({ code: "CHAT_NOT_CONFIGURED", message: "챗봇이 아직 준비 중이에요." }, 503);
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ code: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아니에요." }, 400);
  }
  const history = (Array.isArray(b?.messages) ? b.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map((m: any) => ({ role: m.role, content: maskPhone(m.content.trim().slice(0, m.role === "user" ? MAX_USER_CHARS : 1500)) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return json({ code: "INVALID_REQUEST", message: "질문을 입력해 주세요." }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabase.from("chat_requests").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
  if ((count ?? 0) >= MAX_REQUESTS) {
    return json({ code: "TOO_MANY_REQUESTS", message: "질문이 너무 많아요. 잠시 후 다시 물어봐 주세요." }, 429);
  }
  await supabase.from("chat_requests").insert({ ip });

  try {
    await syncDocuments(supabase);

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
    const shown = new Set<string>();
    let action: string | null = null;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const msg = await callOpenAI(messages);
      if (!msg.tool_calls?.length) {
        const out = JSON.parse(msg.content ?? "{}");
        const productIds = (out.product_ids ?? []).filter((id: string) => shown.has(id)).slice(0, 4);
        return json({ reply: String(out.reply ?? ""), productIds, action });
      }
      if (round === MAX_TOOL_ROUNDS) break;
      messages.push(msg);
      for (const call of msg.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {}
        let result: unknown;
        if (call.function.name === "search_products") {
          const r = await searchProducts(supabase, args);
          r.products.forEach((p) => shown.add(p.id));
          result = r;
        } else if (call.function.name === "search_guide") {
          result = await searchGuide(supabase, args);
        } else if (call.function.name === "show_order_lookup") {
          action = "order_lookup";
          result = { shown: true };
        } else {
          result = { error: "unknown tool" };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    return json({ code: "CHAT_FAILED", message: "답변을 만들지 못했어요. 질문을 바꿔 다시 물어봐 주세요." }, 502);
  } catch (e) {
    console.error("chat failed", e);
    return json({ code: "CHAT_FAILED", message: "답변을 만들지 못했어요. 잠시 후 다시 물어봐 주세요." }, 502);
  }
});
