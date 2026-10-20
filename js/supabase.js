/* =========================================================
 * Supabase 호출 도우미 (모든 페이지에서 data.js보다 먼저 불러와요)
 * - restGet()       : 상품·재고 읽기 (누구나 읽을 수 있게 열어 둔 표만)
 * - create-order    : 금액 계산(dryRun) / 서버 계산 금액으로 'pending' 주문 저장
 * - confirm-payment : 재고 차감 + 토스 결제 승인 + 주문을 'paid'로 저장
 * - guest-order     : 비회원 주문 조회·취소(주문번호 + 휴대폰 번호)
 * 아래 anon 키는 브라우저에 공개돼도 되는 키예요. 주문 표는 RLS로 막혀 있어서
 * 이 키로 직접 읽거나 쓸 수 없고, Edge Function만 거쳐서 접근해요.
 * (토스 시크릿 키는 Edge Function 쪽에만 있어요.)
 * ======================================================= */

const SUPABASE_URL = "https://etdvzqlvqfrnkxmzythf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZHZ6cWx2cWZybmt4bXp5dGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MzQ4OTUsImV4cCI6MjEwODAxMDg5NX0.5xRKFqeBI2UYCW0bEx5h3v7Gfv58ht40v-cUAPAfaRo";

async function callFunction(name, body) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error("서버에 연결하지 못했어요. 네트워크를 확인해 주세요.");
    err.code = "NETWORK_ERROR";
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `요청에 실패했어요 (${res.status})`);
    err.code = data.code || String(res.status);
    err.data = data;
    throw err;
  }
  return data;
}

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`데이터를 불러오지 못했어요 (${res.status})`);
  return res.json();
}

/* ---------- 로그인(Supabase Auth) ----------
 * 브라우저 라이브러리(supabase-js, 각 페이지에서 CDN으로 먼저 불러와요)가 로그인 상태를 브라우저에 보관해요.
 * authReady: 로그인한 회원(user) 또는 null */
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const authReady = sb
  ? sb.auth.getSession().then(({ data }) => (data.session ? data.session.user : null), () => null)
  : Promise.resolve(null);
