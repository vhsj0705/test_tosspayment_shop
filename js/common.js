/* =========================================================
 * 공통: 헤더/푸터, 장바구니, 토스트, 상품 목록, 상품 상세 모달
 * ======================================================= */

const STORE_NAME = "FITLOG";
const CART_KEY = "fitlog-cart";
const DIRECT_KEY = "fitlog-direct-order";

const won = (n) => n.toLocaleString("ko-KR") + "원";
const compact = (n) => (n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, "") + "만" : n.toLocaleString("ko-KR"));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function readJSON(storage, key, fallback) {
  try {
    const v = storage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* 저장소를 쓸 수 없는 환경에서는 무시 */
  }
}

/* ---------- 장바구니 ---------- */
const Cart = {
  get() {
    // 상품 목록을 아직 못 불러왔으면(PRODUCTS가 비어 있으면) 거르지 않아요.
    return readJSON(localStorage, CART_KEY, []).filter((it) => !PRODUCTS.length || getProduct(it.id));
  },
  set(items) {
    writeJSON(localStorage, CART_KEY, items);
    updateCartCount();
  },
  add(id, size, qty) {
    const items = Cart.get();
    const found = items.find((it) => it.id === id && it.size === size);
    if (found) found.qty = Math.min(found.qty + qty, 10);
    else items.push({ id, size, qty });
    Cart.set(items);
  },
  update(index, qty) {
    const items = Cart.get();
    if (!items[index]) return;
    items[index].qty = Math.max(1, Math.min(qty, 10));
    Cart.set(items);
  },
  remove(index) {
    const items = Cart.get();
    items.splice(index, 1);
    Cart.set(items);
  },
  clear() {
    Cart.set([]);
  },
  count() {
    return Cart.get().reduce((s, it) => s + it.qty, 0);
  },
};

function calcOrder(items) {
  const lines = items
    .map((it) => {
      const p = getProduct(it.id);
      return p ? { ...it, product: p, lineTotal: p.finalPrice * it.qty, lineOrigin: p.price * it.qty } : null;
    })
    .filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const origin = lines.reduce((s, l) => s + l.lineOrigin, 0);
  const shipping = subtotal === 0 || subtotal >= 50000 ? 0 : 3000;
  return { lines, subtotal, origin, productDiscount: origin - subtotal, shipping, total: subtotal + shipping };
}

/* ---------- 레이아웃 ---------- */
function renderHeader(active) {
  const el = $("#header");
  if (!el) return;
  const nav = Object.entries(CATEGORIES)
    .map(([key, c]) => `<li class="gnb__item ${key === active ? "is-active" : ""}"><a href="${c.href}">${c.label}</a></li>`)
    .join("");
  el.outerHTML = `
    <div class="top-banner">신규 회원 첫 구매 20% 쿠폰 · 5만원 이상 무료배송</div>
    <header class="header">
      <div class="inner header__row">
        <a href="index.html" class="logo">${STORE_NAME}</a>
        <form class="search" role="search" onsubmit="return false">
          <label class="blind" for="q">상품 검색</label>
          <input id="q" type="search" placeholder="상품, 브랜드를 검색하세요" />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </form>
        <div class="header__util">
          <a href="login.html" class="auth-link" id="authLink">로그인</a>
          <a href="order.html" class="hide-m">주문조회</a>
          <a href="#" class="hide-m">마이페이지</a>
          <button type="button" class="cart-btn" data-open-cart>
            장바구니 <span class="cart-count" id="cartCount">0</span>
          </button>
        </div>
      </div>
      <nav class="gnb" aria-label="카테고리">
        <ul class="inner gnb__list">${nav}<li class="gnb__item"><a href="#" onclick="return false" style="color:#666">세일</a></li><li class="gnb__item"><a href="#" onclick="return false" style="color:#666">랭킹</a></li></ul>
      </nav>
    </header>`;
  updateCartCount();

  // 로그인 상태에 따라 "로그인" ↔ "로그아웃"
  authReady.then((user) => {
    const link = $("#authLink");
    if (!user || !link) return;
    link.textContent = "로그아웃";
    link.title = user.email;
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      location.reload();
    });
  });
}

function renderFooter() {
  const el = $("#footer");
  if (!el) return;
  el.outerHTML = `
    <footer class="footer">
      <div class="inner">
        <p class="footer__logo">${STORE_NAME}</p>
        <div class="footer__links"><a href="#">회사소개</a><a href="#">이용약관</a><a href="#">개인정보처리방침</a><a href="#">고객센터</a></div>
        <p>(주)핏로그 · 대표 홍길동 · 사업자등록번호 000-00-00000 · 통신판매업신고 제0000-서울-0000호</p>
        <p>고객센터 1588-0000 (평일 10:00~17:00) · help@fitlog.example</p>
        <p>본 사이트는 퍼블리싱 예시이며, 결제는 토스페이먼츠 테스트 환경에서 진행돼요.</p>
        <p>상품 사진: <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">Unsplash</a> (Unsplash License) · 촬영자 목록은 저장소 README 참고</p>
      </div>
    </footer>`;
}

function renderOverlays() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="drawer-dim" data-close-cart></div>
    <aside class="drawer" id="cartDrawer" aria-label="장바구니" aria-hidden="true">
      <div class="drawer__head"><span>장바구니</span><button type="button" data-close-cart aria-label="닫기">×</button></div>
      <div class="drawer__list" id="cartList"></div>
      <div class="drawer__foot" id="cartFoot"></div>
    </aside>
    <div class="dim" id="productDim"><div class="modal" role="dialog" aria-modal="true" id="productModal"></div></div>
    <div class="toast" id="toast"></div>`
  );

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cart]")) openCart();
    if (e.target.closest("[data-close-cart]")) closeCart();
  });
  $("#productDim").addEventListener("click", (e) => {
    if (e.target.id === "productDim" || e.target.closest(".modal__close")) closeProduct();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProduct();
      closeCart();
    }
  });
}

function updateCartCount() {
  const el = $("#cartCount");
  if (el) el.textContent = Cart.count();
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 1800);
}

/* ---------- 장바구니 드로어 ---------- */
function openCart() {
  renderCart();
  productsReady.then(renderCart, () => {});
  $("#cartDrawer").classList.add("is-open");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
  $(".drawer-dim").classList.add("is-open");
}
function closeCart() {
  const d = $("#cartDrawer");
  if (!d) return;
  d.classList.remove("is-open");
  d.setAttribute("aria-hidden", "true");
  $(".drawer-dim").classList.remove("is-open");
}
function renderCart() {
  const items = Cart.get();
  const order = calcOrder(items);
  const list = $("#cartList");
  const foot = $("#cartFoot");

  if (!order.lines.length) {
    list.innerHTML = `<p class="cart-empty">장바구니에 담긴 상품이 없어요.</p>`;
    foot.innerHTML = `<button type="button" class="btn btn--line btn--block" data-close-cart>쇼핑 계속하기</button>`;
    return;
  }

  list.innerHTML = order.lines
    .map(
      (l, i) => `
      <div class="cart-item">
        <div class="cart-item__thumb">${renderThumb(l.product)}</div>
        <div>
          <p class="cart-item__brand">${l.product.brand}</p>
          <p class="cart-item__name">${l.product.name}</p>
          <p class="cart-item__opt">사이즈 ${l.size}</p>
          <div class="qty">
            <button type="button" data-qty="${i}" data-delta="-1" aria-label="수량 빼기">−</button>
            <span>${l.qty}</span>
            <button type="button" data-qty="${i}" data-delta="1" aria-label="수량 더하기">+</button>
          </div>
        </div>
        <div>
          <p class="cart-item__price">${won(l.lineTotal)}</p>
          <button type="button" class="cart-item__remove" data-remove="${i}">삭제</button>
        </div>
      </div>`
    )
    .join("");

  foot.innerHTML = `
    <div class="drawer__sum"><span>상품 금액</span><span>${won(order.subtotal)}</span></div>
    <div class="drawer__sum"><span>배송비</span><span>${order.shipping ? won(order.shipping) : "무료"}</span></div>
    <div class="drawer__sum total"><span>결제 예정 금액</span><span>${won(order.total)}</span></div>
    <a href="checkout.html" class="btn btn--black btn--block">${order.lines.length}개 상품 주문하기</a>`;

  $$("[data-qty]", list).forEach((b) =>
    b.addEventListener("click", () => {
      const i = +b.dataset.qty;
      Cart.update(i, Cart.get()[i].qty + +b.dataset.delta);
      renderCart();
    })
  );
  $$("[data-remove]", list).forEach((b) =>
    b.addEventListener("click", () => {
      Cart.remove(+b.dataset.remove);
      renderCart();
    })
  );
}

/* ---------- 상품 카드 / 목록 ---------- */
/* 좋아요(찜): 로그인한 회원만 쓸 수 있고, DB wishlists 표에 회원별로 저장돼요(본인 것만 읽고 쓸 수 있어요). */
const Likes = {
  ids: new Set(),
  // 로그인했으면 내 좋아요 목록을 불러와요.
  ready: authReady.then(async (user) => {
    if (!user) return;
    const { data, error } = await sb.from("wishlists").select("product_id");
    if (error) throw error;
    data.forEach((r) => Likes.ids.add(r.product_id));
  }).catch((err) => console.error(err)),
  has(id) {
    return Likes.ids.has(id);
  },
  // 바뀐 상태(true = 좋아요)를 돌려줘요. 저장에 실패하면 오류를 던져요.
  async toggle(id) {
    if (Likes.ids.has(id)) {
      const { error } = await sb.from("wishlists").delete().eq("product_id", id);
      if (error) throw error;
      Likes.ids.delete(id);
      return false;
    }
    const { error } = await sb.from("wishlists").insert({ product_id: id });
    if (error && error.code !== "23505") throw error; // 23505: 이미 좋아요한 상품
    Likes.ids.add(id);
    return true;
  },
};
// 예전에 브라우저에만 저장하던 좋아요는 더 이상 쓰지 않아요.
try {
  localStorage.removeItem("fitlog-likes");
} catch (e) {}

function goLogin(message) {
  const here = location.pathname.split("/").pop() || "index.html";
  if (confirm(message)) location.href = `login.html?next=${encodeURIComponent(here + location.search)}`;
}

const BADGE_LABEL = { free: "무료배송", only: "단독" };
const isSoldOut = (p) => p.sizes.length > 0 && p.soldout.length === p.sizes.length;

function productCard(p, rank) {
  const liked = Likes.has(p.id);
  return `
    <li class="product-card" data-id="${p.id}" tabindex="0">
      <div class="product-card__thumb">
        ${rank <= 10 ? `<span class="rank">${rank}</span>` : ""}
        ${renderThumb(p)}
        <button type="button" class="like-btn ${liked ? "is-liked" : ""}" data-like="${p.id}" aria-label="좋아요">
          <svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.6C1.5 7.5 3.7 4 7.2 4c2 0 3.5 1.1 4.8 2.8C13.3 5.1 14.8 4 16.8 4c3.5 0 5.7 3.5 4.5 6.9-1.8 5-9.3 9.6-9.3 9.6Z"/></svg>
        </button>
      </div>
      <div class="product-card__info">
        <p class="product-card__brand">${p.brand}</p>
        <p class="product-card__name">${p.name}</p>
        <div class="price-row"><span class="discount">${p.sale}%</span><span class="price">${won(p.finalPrice)}</span></div>
        <div class="product-card__meta"><span class="heart">♥ ${compact(p.likes)}</span><span>★ ${p.rating} (${compact(p.reviews)})</span></div>
        ${isSoldOut(p) || p.badges.length ? `<div class="badges">${isSoldOut(p) ? '<span class="badge badge--soldout">품절</span>' : ""}${p.badges.map((b) => `<span class="badge badge--${b}">${BADGE_LABEL[b]}</span>`).join("")}</div>` : ""}
      </div>
    </li>`;
}

/* 검색엔진·AI가 읽는 상품 목록 구조화 데이터(JSON-LD). 상품은 DB에서 불러오니 불러온 뒤에 붙여요. */
function renderProductListLd(cat, list) {
  const pageUrl = $('link[rel="canonical"]')?.href || location.href;
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${STORE_NAME} ${cat.label}`,
    url: pageUrl,
    numberOfItems: list.length,
    itemListElement: list.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        sku: p.id,
        name: p.name,
        brand: { "@type": "Brand", name: p.brand },
        category: `${cat.label} > ${p.sub}`,
        ...(p.image && { image: p.image }),
        offers: {
          "@type": "Offer",
          price: p.finalPrice,
          priceCurrency: "KRW",
          availability: isSoldOut(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          url: pageUrl,
        },
        ...(p.reviews > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews } }),
      },
    })),
  };
  let el = $("#productListLd");
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "productListLd";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

async function initListPage(catKey) {
  const cat = CATEGORIES[catKey];
  const state = { sub: "전체", sort: "popular", freeOnly: false };
  const grid = $("#productGrid");

  grid.innerHTML = `<li class="empty">상품을 불러오는 중이에요…</li>`;
  let loaded;
  try {
    loaded = await productsReady;
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<li class="empty">상품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.<br /><br /><button type="button" class="btn btn--line" onclick="location.reload()" style="width:160px">다시 불러오기</button></li>`;
    return;
  }
  await Likes.ready;
  if (loaded.fromCache) toast("최신 상품 정보를 불러오지 못해 저장된 정보를 보여드려요");
  updateCartCount();
  const all = PRODUCTS.filter((p) => p.cat === catKey);
  renderProductListLd(cat, all);

  $("#subTabs").innerHTML = cat.subs
    .map((s) => `<button type="button" class="sub-tab ${s === "전체" ? "is-active" : ""}" data-sub="${s}">${s}</button>`)
    .join("");

  function draw() {
    let list = all.filter((p) => (state.sub === "전체" || p.sub === state.sub) && (!state.freeOnly || p.badges.includes("free")));
    const sorters = {
      popular: (a, b) => b.likes - a.likes,
      low: (a, b) => a.finalPrice - b.finalPrice,
      high: (a, b) => b.finalPrice - a.finalPrice,
      sale: (a, b) => b.sale - a.sale,
      review: (a, b) => b.reviews - a.reviews,
    };
    list = [...list].sort(sorters[state.sort]);
    $("#productCount").textContent = list.length;
    grid.innerHTML = list.length
      ? list.map((p, i) => productCard(p, state.sort === "popular" ? i + 1 : 99)).join("")
      : `<li class="empty">조건에 맞는 상품이 없어요.</li>`;
  }

  $("#subTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sub]");
    if (!b) return;
    state.sub = b.dataset.sub;
    $$(".sub-tab").forEach((t) => t.classList.toggle("is-active", t === b));
    draw();
  });
  $("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    draw();
  });
  $("#freeOnly").addEventListener("change", (e) => {
    state.freeOnly = e.target.checked;
    e.target.closest(".filter-chip").classList.toggle("is-on", state.freeOnly);
    draw();
  });

  grid.addEventListener("click", async (e) => {
    const like = e.target.closest("[data-like]");
    if (like) {
      e.stopPropagation();
      if (!(await authReady)) return goLogin("좋아요는 로그인한 회원만 쓸 수 있어요. 로그인할까요?");
      like.disabled = true;
      try {
        const on = await Likes.toggle(like.dataset.like);
        like.classList.toggle("is-liked", on);
        toast(on ? "좋아요한 상품에 추가했어요" : "좋아요를 취소했어요");
      } catch (err) {
        console.error(err);
        toast("좋아요를 저장하지 못했어요");
      } finally {
        like.disabled = false;
      }
      return;
    }
    const card = e.target.closest(".product-card");
    if (card) openProduct(card.dataset.id);
  });
  grid.addEventListener("keydown", (e) => {
    const card = e.target.closest(".product-card");
    if (card && e.key === "Enter") openProduct(card.dataset.id);
  });

  draw();
}

/* ---------- 상품 상세 모달 ---------- */
function openProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  const sel = { size: null, qty: 1 };
  const modal = $("#productModal");

  modal.innerHTML = `
    <button type="button" class="modal__close" aria-label="닫기">×</button>
    <div class="modal__thumb">${renderThumb(p)}</div>
    <div class="modal__body">
      <p class="modal__brand">${p.brand}</p>
      <h2 class="modal__name">${p.name}</h2>
      <div class="modal__price">
        <p class="origin">${won(p.price)}</p>
        <div class="price-row"><span class="discount">${p.sale}%</span><span class="price">${won(p.finalPrice)}</span></div>
      </div>
      <ul class="info-list">
        <li><span class="k">배송</span><span>${p.badges.includes("free") ? "무료배송" : "3,000원 (5만원 이상 무료)"} · 내일 출발</span></li>
        <li><span class="k">적립</span><span>최대 ${won(Math.round(p.finalPrice * 0.05))} (5%)</span></li>
        <li><span class="k">후기</span><span>★ ${p.rating} · ${p.reviews.toLocaleString("ko-KR")}개</span></li>
      </ul>
      <p class="option-label">사이즈</p>
      <div class="size-list">
        ${p.sizes.map((s) => `<button type="button" class="size-btn" data-size="${s}" ${p.soldout.includes(s) ? "disabled" : ""}>${s}</button>`).join("")}
      </div>
      <p class="size-note" id="mStockNote"></p>
      <p class="option-label">수량</p>
      <div class="qty">
        <button type="button" data-d="-1" aria-label="수량 빼기">−</button>
        <span id="mQty">1</span>
        <button type="button" data-d="1" aria-label="수량 더하기">+</button>
      </div>
      <div class="modal__total"><span>총 상품 금액</span><b id="mTotal">${won(p.finalPrice)}</b></div>
      <div class="modal__actions">
        <button type="button" class="btn btn--line" id="mCart">장바구니</button>
        <button type="button" class="btn btn--black" id="mBuy">바로 구매</button>
      </div>
    </div>`;

  // 남은 재고가 적으면 알려주고, 수량은 재고와 10개 중 작은 값까지만 올려요.
  const maxQty = () => Math.min(10, sel.size ? p.stock[sel.size] ?? 10 : 10);
  const paintStock = () => {
    const left = sel.size ? p.stock[sel.size] : null;
    $("#mStockNote").textContent = left != null && left > 0 && left <= 5 ? `${sel.size} 사이즈 ${left}개 남았어요` : "";
    if (sel.qty > maxQty()) {
      sel.qty = Math.max(1, maxQty());
      $("#mQty").textContent = sel.qty;
      $("#mTotal").textContent = won(p.finalPrice * sel.qty);
    }
  };
  $$(".size-btn", modal).forEach((b) =>
    b.addEventListener("click", () => {
      sel.size = b.dataset.size;
      $$(".size-btn", modal).forEach((x) => x.classList.toggle("is-selected", x === b));
      paintStock();
    })
  );
  refreshStock(p.id)
    .then(() => {
      $$(".size-btn", modal).forEach((b) => (b.disabled = p.soldout.includes(b.dataset.size)));
      if (sel.size && p.soldout.includes(sel.size)) {
        sel.size = null;
        $$(".size-btn", modal).forEach((x) => x.classList.remove("is-selected"));
        toast("선택한 사이즈가 방금 품절됐어요");
      }
      paintStock();
    })
    .catch(() => {});
  $$(".qty button", modal).forEach((b) =>
    b.addEventListener("click", () => {
      const next = sel.qty + +b.dataset.d;
      if (next > maxQty() && sel.size && maxQty() < 10) toast(`재고가 ${maxQty()}개 남았어요`);
      sel.qty = Math.max(1, Math.min(maxQty(), next));
      $("#mQty").textContent = sel.qty;
      $("#mTotal").textContent = won(p.finalPrice * sel.qty);
    })
  );
  const needSize = () => {
    if (sel.size) return false;
    toast("사이즈를 선택해 주세요");
    return true;
  };
  $("#mCart").addEventListener("click", () => {
    if (needSize()) return;
    Cart.add(p.id, sel.size, sel.qty);
    closeProduct();
    toast("장바구니에 담았어요");
  });
  $("#mBuy").addEventListener("click", () => {
    if (needSize()) return;
    writeJSON(sessionStorage, DIRECT_KEY, [{ id: p.id, size: sel.size, qty: sel.qty }]);
    location.href = "checkout.html?mode=direct";
  });

  $("#productDim").classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeProduct() {
  const dim = $("#productDim");
  if (!dim || !dim.classList.contains("is-open")) return;
  dim.classList.remove("is-open");
  document.body.style.overflow = "";
}

/* ---------- 부트스트랩 ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  renderHeader(page);
  renderFooter();
  renderOverlays();
  productsReady.then(updateCartCount, () => {});
  if (CATEGORIES[page]) initListPage(page);
});
