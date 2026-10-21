/* =========================================================
 * 주문서 + 토스페이먼츠 주문서형 결제(결제위젯) 연동
 * https://docs.tosspayments.com/guides/v2/payment-widget/integration
 * ======================================================= */

// 토스페이먼츠 문서용 테스트 클라이언트 키(주문서형/결제창형 연동 키).
// 운영 시 개발자센터 > API 키 메뉴의 내 상점 클라이언트 키로 바꾸세요.
// 시크릿 키는 절대 프론트엔드 코드에 넣지 마세요.
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const PENDING_KEY = "fitlog-pending-order";

document.addEventListener("DOMContentLoaded", async () => {
  const isDirect = new URLSearchParams(location.search).get("mode") === "direct";
  const couponEl = $("#coupon");
  const payBtn = $("#payBtn");

  const showEmpty = (msg) => {
    $(".checkout__grid").innerHTML = `
      <div class="cart-empty" style="grid-column:1/-1">
        ${msg}<br /><br />
        <a href="top.html" class="btn btn--black" style="width:200px">쇼핑하러 가기</a>
      </div>`;
  };

  try {
    await productsReady;
  } catch (err) {
    console.error(err);
    return showEmpty("상품 정보를 불러오지 못했어요.<br />잠시 후 다시 시도해 주세요.");
  }

  const items = isDirect ? readJSON(sessionStorage, DIRECT_KEY, []) : Cart.get();
  const lines = calcOrder(items).lines;
  if (!lines.length) return showEmpty("주문할 상품이 없어요.");
  // 서버에는 상품·사이즈·수량과 쿠폰 사용 여부만 보내요. 금액은 서버가 계산해요.
  const orderItems = lines.map(({ id, size, qty }) => ({ id, size, qty }));

  /* ---------- 서버 금액 계산 ---------- */
  let quote = null;
  const canPay = () => !!quote && !quote.problems.length && quote.amounts.total > 0;

  async function refreshQuote() {
    payBtn.disabled = true;
    $("#sumTotal").textContent = "계산 중…";
    quote = await callFunction("create-order", { dryRun: true, useCoupon: couponEl.checked, items: orderItems });
    paint();
    return quote;
  }

  function paint() {
    const problems = quote ? quote.problems : [];
    const serverLine = (l) => quote && quote.lines.find((x) => x.productId === l.id && x.size === l.size);

    $("#itemCount").textContent = `${lines.length}개`;
    $("#orderItems").innerHTML = lines
      .map((l) => {
        const bad = problems.find((x) => x.id === l.id && x.size === l.size);
        const sl = serverLine(l);
        return `
        <div class="order-item">
          <div class="order-item__thumb">${renderThumb(l.product)}</div>
          <div>
            <p class="cart-item__brand">${esc(l.product.brand)}</p>
            <p class="cart-item__name">${esc(l.product.name)}</p>
            <p class="cart-item__opt">사이즈 ${l.size} / 수량 ${l.qty}개</p>
            ${bad ? `<p class="order-item__warn">${esc(bad.message)}</p>` : ""}
          </div>
          <p class="order-item__price">${bad ? "-" : won(sl ? sl.lineTotal : l.lineTotal)}</p>
        </div>`;
      })
      .join("");

    const notice = $("#orderNotice");
    notice.hidden = !problems.length;
    notice.innerHTML = problems.length
      ? `재고가 부족한 상품이 있어 결제할 수 없어요.
         <button type="button" class="btn btn--line" id="fixItems">품절 상품 정리하고 다시 계산하기</button>`
      : "";
    if (problems.length) $("#fixItems").addEventListener("click", () => fixItems(problems));

    if (!quote) return;
    paintCoupon();
    const a = quote.amounts;
    $("#sumOrigin").textContent = won(a.origin);
    $("#sumDiscount").textContent = "-" + won(a.productDiscount);
    $("#sumCoupon").textContent = a.coupon ? "-" + won(a.coupon) : "0원";
    $("#sumShip").textContent = a.shipping ? won(a.shipping) : "무료";
    $("#sumTotal").textContent = won(a.total);
    payBtn.textContent = `${won(a.total)} 결제하기`;
  }

  // 신규 회원 첫 구매 쿠폰은 서버가 자격(로그인 회원 + 결제 완료 주문 없음)을 확인해요. 못 쓰면 이유를 보여줘요.
  const couponOk = () => !quote || !quote.couponInfo || quote.couponInfo.status === "OK";
  function paintCoupon() {
    const note = $("#couponNote");
    const info = quote.couponInfo;
    if (couponOk()) {
      couponEl.disabled = false;
      note.hidden = true;
      return;
    }
    couponEl.checked = false;
    couponEl.disabled = true;
    note.hidden = false;
    note.innerHTML =
      info.status === "LOGIN_REQUIRED"
        ? `${info.message} <a href="login.html?next=${encodeURIComponent("checkout.html" + location.search)}">로그인하기</a>`
        : esc(info.message);
  }

  // 품절은 빼고, 재고가 조금 남은 상품은 남은 수량으로 줄여요.
  function fixItems(problems) {
    const fix = (list) =>
      list
        .map((it) => {
          const p = problems.find((x) => x.id === it.id && x.size === it.size);
          if (!p) return it;
          return p.reason === "SOLD_OUT" && p.stock > 0 ? { ...it, qty: Math.min(p.stock, 10) } : null;
        })
        .filter(Boolean);
    if (isDirect) writeJSON(sessionStorage, DIRECT_KEY, fix(items));
    else Cart.set(fix(Cart.get()));
    location.reload();
  }

  paint();
  try {
    await refreshQuote();
  } catch (err) {
    console.error(err);
    $("#sumTotal").textContent = "-";
    $("#payment-method").innerHTML = `<p class="widget-loading">결제 금액을 계산하지 못했어요. 새로고침해 주세요. (${esc(err.message)})</p>`;
    return;
  }

  if (location.protocol === "file:") {
    $("#payment-method").innerHTML = `<p class="widget-loading">결제위젯은 <b>http://localhost</b> 같은 웹 서버에서 열어야 동작해요.<br />README의 실행 방법을 참고하세요.</p>`;
    return;
  }
  if (quote.amounts.total < 1) {
    $("#payment-method").innerHTML = `<p class="widget-loading">결제할 수 있는 상품이 없어요.</p>`;
    return;
  }

  /* ---------- 1. SDK 초기화 & 위젯 인스턴스 ---------- */
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  // 비회원 결제는 ANONYMOUS, 회원이라면 회원별 고유 customerKey(UUID 등)를 넣으세요.
  const widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS });

  /* ---------- 2. 금액 설정 & 결제 UI 렌더링 ---------- */
  try {
    await widgets.setAmount({ currency: "KRW", value: quote.amounts.total });
    $("#payment-method").innerHTML = "";
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
    payBtn.disabled = !canPay();
  } catch (err) {
    console.error(err);
    $("#payment-method").innerHTML = `<p class="widget-loading">결제 수단을 불러오지 못했어요. (${esc(err.code || "")} ${esc(err.message || err)})</p>`;
    return;
  }

  // 쿠폰을 바꾸면 서버에 금액을 다시 물어보고, setAmount()로 위젯에도 알려줘요.
  async function syncAmount() {
    await refreshQuote();
    if (quote.amounts.total > 0) await widgets.setAmount({ currency: "KRW", value: quote.amounts.total });
  }
  couponEl.addEventListener("change", async () => {
    couponEl.disabled = true;
    try {
      await syncAmount();
    } catch (err) {
      toast(err.message || "금액을 다시 계산하지 못했어요");
    } finally {
      couponEl.disabled = !couponOk();
      payBtn.disabled = !canPay();
    }
  });

  /* ---------- 3. 결제 요청 ---------- */
  payBtn.addEventListener("click", async () => {
    const form = validateForm();
    if (!form || !canPay()) return;

    // 추측할 수 없는 무작위 주문번호(주문조회는 주문번호 + 휴대폰 번호로 하니까요).
    const orderId = "FITLOG-" + crypto.randomUUID();
    payBtn.disabled = true;

    // 서버가 금액을 다시 계산하고 재고를 확인한 뒤 'pending' 주문으로 저장해요.
    // 화면 금액(expectedAmount)과 다르면 저장하지 않고 바뀐 금액을 알려줘요.
    let created;
    try {
      created = await callFunction("create-order", {
        orderId,
        useCoupon: couponEl.checked,
        expectedAmount: quote.amounts.total,
        items: orderItems,
        orderer: { name: form.name, phone: form.phone, email: form.email, address: form.address, memo: form.memo },
      });
    } catch (err) {
      console.error(err);
      if (["AMOUNT_CHANGED", "SOLD_OUT", "PRODUCT_UNAVAILABLE", "COUPON_NOT_AVAILABLE"].includes(err.code)) {
        await syncAmount().catch(() => {});
      }
      toast(err.message || "주문을 저장하지 못했어요");
      payBtn.disabled = !canPay();
      return;
    }

    // 결제 결과 화면에서 장바구니/바로 구매 데이터를 정리할 때 써요.
    writeJSON(localStorage, PENDING_KEY, {
      orderId,
      amount: created.amount,
      orderName: created.orderName,
      mode: isDirect ? "direct" : "cart",
      items: orderItems,
      orderer: form,
      createdAt: Date.now(),
    });

    try {
      await widgets.requestPayment({
        orderId,
        orderName: created.orderName,
        successUrl: new URL("success.html", location.href).href,
        failUrl: new URL("fail.html", location.href).href,
        customerName: form.name,
        customerMobilePhone: form.phone,
        ...(form.email ? { customerEmail: form.email } : {}),
      });
    } catch (err) {
      // 결제창을 닫는 등 리다이렉트 없이 끝나는 경우
      console.error(err);
      toast(err.message || "결제를 진행하지 못했어요");
      payBtn.disabled = false;
    }
  });
});

function validateForm() {
  const name = $("#name");
  const phone = $("#phone");
  const email = $("#email");
  const address = $("#address");
  const agree = $("#privacyAgree");
  const digits = phone.value.replace(/\D/g, "");
  const checks = [
    [name, name.value.trim().length > 0, "이름을 입력해 주세요"],
    [phone, /^01\d{8,9}$/.test(digits), "휴대폰 번호를 정확히 입력해 주세요"],
    [email, !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value), "이메일 형식을 확인해 주세요"],
    [address, address.value.trim().length > 0, "배송지를 입력해 주세요"],
    [agree, agree.checked, "개인정보 수집·이용에 동의해 주세요"],
  ];
  $$(".input, .consent-box").forEach((el) => el.classList.remove("is-error"));
  const bad = checks.find(([, ok]) => !ok);
  if (bad) {
    (bad[0] === agree ? $("#privacyBox") : bad[0]).classList.add("is-error");
    bad[0].focus();
    toast(bad[2]);
    return null;
  }
  return { name: name.value.trim(), phone: digits, email: email.value.trim(), address: address.value.trim(), memo: $("#memo").value };
}
