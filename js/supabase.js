/* =========================================================
 * Supabase Edge Function 호출 도우미
 * - create-order    : 결제 요청 전에 주문을 'pending'으로 저장
 * - confirm-payment : 토스 결제 승인 API 호출 + 주문을 'paid'로 저장
 * 아래 anon 키는 브라우저에 공개돼도 되는 키예요. orders 테이블은 RLS로 막혀 있어서
 * 이 키로 DB를 직접 읽거나 쓸 수 없고, Edge Function만 거쳐서 접근해요.
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
    throw err;
  }
  return data;
}
