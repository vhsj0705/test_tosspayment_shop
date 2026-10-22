/* =========================================================
 * 쇼핑 도우미 챗봇 (모든 페이지, common.js 뒤에 불러와요)
 * - 서버 함수 `chat`: Upstage 임베딩으로 상품·안내를 찾고 OpenAI가 답해요.
 * - 주문 조회는 채팅으로 개인정보를 보내지 않도록, 화면에 뜬 조회 칸이 `guest-order`를 바로 불러요.
 * - 대화는 이 탭(sessionStorage)에만 보관해요. 서버는 저장하지 않아요.
 * ======================================================= */

const CHAT_KEY = "fitlog-chat";
const CHAT_GREETING = "안녕하세요, FITLOG 쇼핑 도우미예요. 상품 추천, 배송·쿠폰 안내, 주문 조회를 도와드려요.";
const CHAT_STATUS_LABEL = { pending: "결제 대기", paid: "결제 완료", failed: "결제 실패", canceled: "취소됨" };

const Chat = {
  history: readJSON(sessionStorage, CHAT_KEY, []),
  busy: false,
  save() {
    writeJSON(sessionStorage, CHAT_KEY, this.history.slice(-20));
  },
};

function renderChat() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button type="button" class="chat-fab" id="chatFab" aria-label="쇼핑 도우미 열기" aria-expanded="false">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
    </button>
    <section class="chat" id="chatPanel" aria-label="쇼핑 도우미" hidden>
      <div class="chat__head">
        <span>쇼핑 도우미</span>
        <div>
          <button type="button" class="chat__reset" id="chatReset">새 대화</button>
          <button type="button" class="chat__close" id="chatClose" aria-label="닫기">×</button>
        </div>
      </div>
      <div class="chat__log" id="chatLog" aria-live="polite"></div>
      <form class="chat__form" id="chatForm">
        <input type="text" id="chatInput" maxlength="500" placeholder="예) 5만원 이하 후드 추천해줘" autocomplete="off" aria-label="질문" />
        <button type="submit" class="btn btn--black">전송</button>
      </form>
      <p class="chat__note">AI 답변은 틀릴 수 있어요. 휴대폰 번호는 채팅에 쓰지 마세요.</p>
    </section>`
  );

  $("#chatFab").addEventListener("click", () => toggleChat(true));
  $("#chatClose").addEventListener("click", () => toggleChat(false));
  $("#chatReset").addEventListener("click", () => {
    Chat.history = [];
    Chat.save();
    drawChat();
  });
  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("#chatInput").value.trim();
    if (!text || Chat.busy) return;
    $("#chatInput").value = "";
    sendChat(text);
  });
  $("#chatLog").addEventListener("click", (e) => {
    const card = e.target.closest("[data-chat-product]");
    if (card) openProduct(card.dataset.chatProduct);
  });
  $("#chatLog").addEventListener("submit", (e) => {
    if (e.target.matches(".chat-order")) {
      e.preventDefault();
      lookupOrder(e.target);
    }
  });
}

function toggleChat(open) {
  $("#chatPanel").hidden = !open;
  $("#chatFab").setAttribute("aria-expanded", String(open));
  $("#chatFab").classList.toggle("is-hidden", open);
  if (open) {
    drawChat();
    $("#chatInput").focus();
  }
}

function chatProducts(ids) {
  const list = (ids || []).map(getProduct).filter(Boolean);
  if (!list.length) return "";
  return `<div class="chat-products">${list
    .map(
      (p) => `
      <button type="button" class="chat-product" data-chat-product="${esc(p.id)}">
        <span class="chat-product__thumb">${renderThumb(p)}</span>
        <span class="chat-product__info">
          <span class="chat-product__brand">${esc(p.brand)}</span>
          <span class="chat-product__name">${esc(p.name)}</span>
          <span><b class="discount">${p.sale}%</b> <b>${won(p.finalPrice)}</b></span>
        </span>
      </button>`
    )
    .join("")}</div>`;
}

const chatOrderForm = () => `
  <form class="chat-order">
    <input type="text" name="orderId" placeholder="주문번호 (FITLOG-...)" required autocomplete="off" />
    <input type="tel" name="phone" placeholder="주문할 때 쓴 휴대폰 번호" required autocomplete="off" />
    <button type="submit" class="btn btn--line">주문 조회</button>
  </form>`;

function drawChat() {
  const log = $("#chatLog");
  if (!log) return;
  const bubble = (m) => {
    if (m.role === "order") return `<div class="chat-msg chat-msg--bot">${m.html}</div>`;
    const cls = m.role === "user" ? "chat-msg--user" : "chat-msg--bot";
    return `<div class="chat-msg ${cls}"><p>${esc(m.content).replace(/\n/g, "<br>")}</p>${m.productIds ? chatProducts(m.productIds) : ""}${
      m.action === "order_lookup" ? chatOrderForm() : ""
    }</div>`;
  };
  log.innerHTML =
    bubble({ role: "assistant", content: CHAT_GREETING }) +
    Chat.history.map(bubble).join("") +
    (Chat.busy ? `<div class="chat-msg chat-msg--bot chat-msg--typing"><p>답변을 찾고 있어요…</p></div>` : "");
  log.scrollTop = log.scrollHeight;
}

async function sendChat(text) {
  Chat.history.push({ role: "user", content: text });
  Chat.busy = true;
  drawChat();
  try {
    const messages = Chat.history.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: m.content }));
    const [res] = await Promise.all([callFunction("chat", { messages }), productsReady.catch(() => {})]);
    Chat.history.push({ role: "assistant", content: res.reply, productIds: res.productIds, action: res.action });
  } catch (err) {
    Chat.history.push({ role: "assistant", content: err.message || "답변을 받지 못했어요. 잠시 후 다시 물어봐 주세요." });
  } finally {
    Chat.busy = false;
    Chat.save();
    drawChat();
  }
}

// 주문번호·휴대폰 번호는 OpenAI를 거치지 않고 주문조회 서버 함수로만 보내요. 결과도 대화 기록에 번호 없이 남겨요.
async function lookupOrder(form) {
  const btn = $("button", form);
  btn.disabled = true;
  try {
    const o = await callFunction("guest-order", { action: "get", orderId: form.orderId.value.trim(), phone: form.phone.value });
    const items = o.items.map((i) => `${esc(i.name)} (${esc(i.size)}) ${i.qty}개`).join("<br>");
    Chat.history.push({
      role: "order",
      html: `<p><b>${esc(CHAT_STATUS_LABEL[o.status] || o.status)}</b> · ${won(o.amount)}<br>${items}</p>
        <p><a class="chat-link" href="order.html">주문조회에서 자세히 보기·취소</a></p>`,
    });
  } catch (err) {
    Chat.history.push({ role: "order", html: `<p>${esc(err.message)}</p>` });
  }
  Chat.save();
  drawChat();
}

document.addEventListener("DOMContentLoaded", renderChat);
