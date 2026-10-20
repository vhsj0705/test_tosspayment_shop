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
  const items = isDirect ? readJSON(sessionStorage, DIRECT_KEY, []) : Cart.get();
  const order = calcOrder(items);

  if (!order.lines.length) {
    $(".checkout__grid").innerHTML = `
      <div class="cart-empty" style="grid-column:1/-1">
        주문할 상품이 없어요.<br /><br />
        <a href="top.html" class="btn btn--black" style="width:200px">쇼핑하러 가기</a>
      </div>`;
    return;
  }

  /* ---------- 주문 상품 ---------- */
  $("#itemCount").textContent = `${order.lines.length}개`;
  $("#orderItems").innerHTML = order.lines
    .map(
      (l) => `
      <div class="order-item">
        <div class="order-item__thumb">${renderThumb(l.product)}</div>
        <div>
          <p class="cart-item__brand">${l.product.brand}</p>
          <p class="cart-item__name">${l.product.name}</p>
          <p class="cart-item__opt">사이즈 ${l.size} / 수량 ${l.qty}개</p>
        </div>
        <p class="order-item__price">${won(l.lineTotal)}</p>
      </div>`
    )
    .join("");

  /* ---------- 금액 계산 ---------- */
  const couponEl = $("#coupon");
  function getAmount() {
    const coupon = couponEl.checked ? Math.min(Math.floor((order.subtotal * 0.2) / 10) * 10, 10000) : 0;
    const total = order.subtotal - coupon + order.shipping;
    return { coupon, total };
  }
  function paintSummary() {
    const { coupon, total } = getAmount();
    $("#sumOrigin").textContent = won(order.origin);
    $("#sumDiscount").textContent = "-" + won(order.productDiscount);
    $("#sumCoupon").textContent = coupon ? "-" + won(coupon) : "0원";
    $("#sumShip").textContent = order.shipping ? won(order.shipping) : "무료";
    $("#sumTotal").textContent = won(total);
    $("#payBtn").textContent = `${won(total)} 결제하기`;
  }
  paintSummary();

  if (location.protocol === "file:") {
    $("#payment-method").innerHTML = `<p class="widget-loading">결제위젯은 <b>http://localhost</b> 같은 웹 서버에서 열어야 동작해요.<br />README의 실행 방법을 참고하세요.</p>`;
    return;
  }

  /* ---------- 1. SDK 초기화 & 위젯 인스턴스 ---------- */
  const tossPayments = TossPayments(TOSS_CLIENT_KEY);
  // 비회원 결제는 ANONYMOUS, 회원이라면 회원별 고유 customerKey(UUID 등)를 넣으세요.
  const widgets = tossPayments.widgets({ customerKey: TossPayments.ANONYMOUS });

  /* ---------- 2. 금액 설정 & 결제 UI 렌더링 ---------- */
  try {
    await widgets.setAmount({ currency: "KRW", value: getAmount().total });
    $("#payment-method").innerHTML = "";
    await Promise.all([
      widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
    ]);
    $("#payBtn").disabled = false;
  } catch (err) {
    console.error(err);
    $("#payment-method").innerHTML = `<p class="widget-loading">결제 수단을 불러오지 못했어요. (${err.code || ""} ${err.message || err})</p>`;
    return;
  }

  // 쿠폰 적용 등으로 금액이 바뀌면 setAmount()로 다시 알려줘요.
  couponEl.addEventListener("change", async () => {
    paintSummary();
    await widgets.setAmount({ currency: "KRW", value: getAmount().total });
  });

  /* ---------- 3. 결제 요청 ---------- */
  $("#payBtn").addEventListener("click", async () => {
    const form = validateForm();
    if (!form) return;

    const { total, coupon } = getAmount();
    const first = order.lines[0].product.name;
    const orderName = order.lines.length > 1 ? `${first} 외 ${order.lines.length - 1}건` : first;
    const orderId = "FITLOG-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    // 결제 요청 전에 orderId·amount를 저장해 두고, successUrl에서 금액 위변조 여부를 확인해요.
    // 실제 서비스에서는 이 값을 반드시 '서버'에 저장하세요.
    writeJSON(localStorage, PENDING_KEY, {
      orderId,
      amount: total,
      orderName,
      coupon,
      mode: isDirect ? "direct" : "cart",
      items,
      orderer: form,
      createdAt: Date.now(),
    });

    const btn = $("#payBtn");
    btn.disabled = true;
    try {
      await widgets.requestPayment({
        orderId,
        orderName,
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
      btn.disabled = false;
    }
  });
});

function validateForm() {
  const name = $("#name");
  const phone = $("#phone");
  const email = $("#email");
  const address = $("#address");
  const digits = phone.value.replace(/\D/g, "");
  const checks = [
    [name, name.value.trim().length > 0, "이름을 입력해 주세요"],
    [phone, /^01\d{8,9}$/.test(digits), "휴대폰 번호를 정확히 입력해 주세요"],
    [email, !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value), "이메일 형식을 확인해 주세요"],
    [address, address.value.trim().length > 0, "배송지를 입력해 주세요"],
  ];
  $$(".input").forEach((el) => el.classList.remove("is-error"));
  const bad = checks.find(([, ok]) => !ok);
  if (bad) {
    bad[0].classList.add("is-error");
    bad[0].focus();
    toast(bad[2]);
    return null;
  }
  return { name: name.value.trim(), phone: digits, email: email.value.trim(), address: address.value.trim(), memo: $("#memo").value };
}
