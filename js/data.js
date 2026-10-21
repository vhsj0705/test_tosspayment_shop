/* =========================================================
 * 상품 데이터(Supabase DB) + 상품 썸네일(SVG) 생성
 * 상품·가격·사이즈별 재고는 DB의 products / product_sizes 표에서 불러와요.
 * 가격·재고를 바꾸려면 코드가 아니라 Supabase 표를 고치면 돼요.
 * ======================================================= */

const CATEGORIES = {
  top: {
    label: "상의",
    href: "top.html",
    subs: ["전체", "반소매 티셔츠", "긴소매 티셔츠", "셔츠/블라우스", "후드 티셔츠", "니트/스웨터"],
  },
  shoes: {
    label: "신발",
    href: "shoes.html",
    subs: ["전체", "스니커즈", "러닝화", "로퍼", "부츠"],
  },
  pants: {
    label: "바지",
    href: "pants.html",
    subs: ["전체", "데님 팬츠", "슬랙스", "카고 팬츠", "트레이닝 팬츠", "숏 팬츠"],
  },
};

/* ---------- 상품 불러오기 ----------
 * 모든 페이지가 `await productsReady` 뒤에 PRODUCTS를 써요.
 * DB를 못 읽으면 마지막으로 불러온 목록(브라우저 저장본)을 대신 보여줘요. 결제 금액은 어차피 서버가 다시 계산해요. */
const PRODUCTS = [];
const PRODUCTS_CACHE_KEY = "fitlog-products-cache";
const PRODUCT_SELECT = "products?select=*,product_sizes(size,stock,sort_order)&order=sort_order";

function toProduct(row) {
  const sizes = [...(row.product_sizes || [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    cat: row.category,
    sub: row.sub_category,
    brand: row.brand,
    name: row.name,
    price: row.price,
    sale: row.sale_rate,
    finalPrice: row.final_price,
    badges: row.badges || [],
    art: row.art,
    bg: row.bg_color,
    main: row.main_color,
    accent: row.accent_color,
    stripe: row.stripe,
    sizes: sizes.map((s) => s.size),
    stock: Object.fromEntries(sizes.map((s) => [s.size, s.stock])),
    soldout: sizes.filter((s) => s.stock <= 0).map((s) => s.size),
    // 상품 사진: Unsplash (Unsplash License, 상업적 이용 가능). 촬영자 목록은 README "이미지 출처".
    image: row.photo_id ? `https://images.unsplash.com/photo-${row.photo_id}?auto=format&fit=crop&w=600&h=720&q=75` : null,
    credit: row.photo_by,
  };
}

const productsReady = (async () => {
  let rows;
  let fromCache = false;
  try {
    rows = await restGet(PRODUCT_SELECT);
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(rows));
    } catch (e) {}
  } catch (err) {
    try {
      rows = JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY));
    } catch (e) {}
    if (!rows) throw err;
    fromCache = true;
  }
  PRODUCTS.splice(0, PRODUCTS.length, ...rows.map(toProduct));
  return { fromCache };
})();

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

// 상품 모달을 열 때 그 상품의 재고만 다시 읽어 와요(실시간 품절 표시).
async function refreshStock(id) {
  const p = getProduct(id);
  if (!p) return null;
  const rows = await restGet(`product_sizes?select=size,stock&product_id=eq.${encodeURIComponent(id)}`);
  rows.forEach((r) => (p.stock[r.size] = r.stock));
  p.soldout = p.sizes.filter((s) => !(p.stock[s] > 0));
  return p;
}

/* ---------- SVG 썸네일 ---------- */
const ART = {
  tee: (p) => `
    <path d="M170 140 L212 118 Q250 150 288 118 L330 140 L410 200 L372 262 L335 238 L335 480 L165 480 L165 238 L128 262 L90 200 Z" fill="${p.main}"/>
    <path d="M212 118 Q250 150 288 118 Q250 138 212 118 Z" fill="${p.accent}"/>
    ${p.id === "T007" ? `<text x="250" y="300" font-family="Arial Black,Arial" font-weight="900" font-size="34" fill="${p.accent}" text-anchor="middle">CITYBOY</text>` : ""}`,
  long: (p) => `
    <path d="M170 140 L212 118 Q250 150 288 118 L330 140 L385 185 L420 400 L380 410 L340 250 L335 480 L165 480 L160 250 L120 410 L80 400 L115 185 Z" fill="${p.main}"/>
    ${p.stripe ? [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="165" y="${200 + i * 40}" width="170" height="12" fill="${p.accent}"/>`).join("") : ""}
    <path d="M212 118 Q250 150 288 118 Q250 138 212 118 Z" fill="${p.stripe ? p.main : p.accent}" opacity="0.8"/>
    <rect x="165" y="462" width="170" height="18" fill="${p.accent}" opacity="${p.stripe ? 0 : 0.5}"/>`,
  shirt: (p) => `
    <path d="M170 140 L215 120 L250 150 L285 120 L330 140 L385 185 L420 400 L380 410 L340 250 L335 480 L165 480 L160 250 L120 410 L80 400 L115 185 Z" fill="${p.main}"/>
    <path d="M215 120 L250 150 L232 172 L205 132 Z M285 120 L250 150 L268 172 L295 132 Z" fill="${p.accent}"/>
    <line x1="250" y1="150" x2="250" y2="480" stroke="${p.accent}" stroke-width="3"/>
    ${[190, 240, 290, 340, 390, 440].map((y) => `<circle cx="258" cy="${y}" r="4" fill="${p.accent}"/>`).join("")}
    <rect x="190" y="210" width="38" height="44" fill="none" stroke="${p.accent}" stroke-width="3"/>`,
  hood: (p) => `
    <path d="M195 135 Q250 50 305 135 Z" fill="${p.accent}"/>
    <path d="M170 140 L212 122 Q250 165 288 122 L330 140 L385 185 L420 400 L380 410 L340 250 L335 480 L165 480 L160 250 L120 410 L80 400 L115 185 Z" fill="${p.main}"/>
    <path d="M200 340 L300 340 L320 420 L180 420 Z" fill="${p.accent}" opacity="0.55"/>
    <line x1="238" y1="160" x2="236" y2="230" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>
    <line x1="262" y1="160" x2="264" y2="230" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>
    <rect x="160" y="460" width="180" height="20" fill="${p.accent}" opacity="0.6"/>`,
  pants: (p) => `
    <path d="M172 105 L328 105 L352 500 L272 500 L250 230 L228 500 L148 500 Z" fill="${p.main}"/>
    <rect x="172" y="105" width="156" height="22" fill="${p.accent}"/>
    <line x1="250" y1="127" x2="250" y2="225" stroke="${p.accent}" stroke-width="3"/>
    <path d="M180 135 Q200 170 220 135" fill="none" stroke="${p.accent}" stroke-width="3"/>
    <path d="M280 135 Q300 170 320 135" fill="none" stroke="${p.accent}" stroke-width="3"/>`,
  cargo: (p) => `
    <path d="M168 105 L332 105 L368 500 L268 500 L250 240 L232 500 L132 500 Z" fill="${p.main}"/>
    <rect x="168" y="105" width="164" height="22" fill="${p.accent}"/>
    <rect x="150" y="270" width="52" height="66" rx="4" fill="${p.accent}"/>
    <rect x="298" y="270" width="52" height="66" rx="4" fill="${p.accent}"/>
    <rect x="150" y="270" width="52" height="16" fill="${p.main}" opacity="0.4"/>
    <rect x="298" y="270" width="52" height="16" fill="${p.main}" opacity="0.4"/>
    <line x1="250" y1="127" x2="250" y2="235" stroke="${p.accent}" stroke-width="3"/>`,
  shorts: (p) => `
    <path d="M170 180 L330 180 L352 360 L262 366 L250 280 L238 366 L148 360 Z" fill="${p.main}"/>
    <rect x="170" y="180" width="160" height="22" fill="${p.accent}"/>
    <line x1="250" y1="202" x2="250" y2="275" stroke="${p.accent}" stroke-width="3"/>
    <line x1="152" y1="345" x2="236" y2="350" stroke="${p.accent}" stroke-width="3"/>
    <line x1="264" y1="350" x2="348" y2="345" stroke="${p.accent}" stroke-width="3"/>`,
  sneaker: (p) => `
    <ellipse cx="258" cy="440" rx="180" ry="14" fill="#000" opacity="0.08"/>
    <path d="M85 392 L425 392 Q435 392 435 405 L435 412 Q435 428 418 428 L102 428 Q82 428 82 410 Z" fill="#f4f4f4" stroke="#d8d8d8" stroke-width="2"/>
    <path d="M95 392 L102 312 Q108 282 150 276 L228 266 Q258 240 292 240 L322 242 Q344 306 400 326 Q428 338 428 366 L428 392 Z" fill="${p.main}" stroke="#00000022" stroke-width="2"/>
    <path d="M150 360 Q250 330 330 290" fill="none" stroke="${p.accent}" stroke-width="16" stroke-linecap="round"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="${246 + i * 18}" y1="${268 + i * 10}" x2="${270 + i * 18}" y2="${258 + i * 10}" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>`).join("")}
    <path d="M95 392 L102 312 Q108 282 150 276 L150 392 Z" fill="${p.accent}" opacity="0.18"/>`,
  loafer: (p) => `
    <ellipse cx="258" cy="440" rx="180" ry="14" fill="#000" opacity="0.08"/>
    <path d="M88 405 L428 405 L428 420 Q428 428 418 428 L98 428 Q88 428 88 420 Z" fill="#3a2a20"/>
    <path d="M92 405 L98 352 Q116 312 200 310 L300 310 Q380 318 410 350 Q428 368 428 405 Z" fill="${p.main}"/>
    <path d="M250 312 Q300 300 360 322 L350 345 Q300 330 255 338 Z" fill="${p.accent}"/>
    <rect x="290" y="324" width="40" height="10" rx="5" fill="${p.bg}" opacity="0.9"/>`,
  boot: (p) => `
    <ellipse cx="270" cy="440" rx="170" ry="14" fill="#000" opacity="0.08"/>
    <path d="M115 400 L430 400 L430 418 Q430 428 418 428 L125 428 Q115 428 115 418 Z" fill="#2b2118"/>
    <path d="M120 400 L126 160 L262 156 L266 288 Q350 300 405 324 Q430 336 430 362 L430 400 Z" fill="${p.main}"/>
    <rect x="126" y="160" width="136" height="22" fill="${p.accent}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="240" cy="${205 + i * 22}" r="5" fill="${p.accent}"/>`).join("")}
    <path d="M266 288 Q340 300 405 324" fill="none" stroke="${p.accent}" stroke-width="4"/>`,
};

/* 사진이 있으면 사진을, 불러오지 못하면 뒤에 깔린 SVG 일러스트가 그대로 보여요. */
function renderThumb(p) {
  const svg = `<svg viewBox="0 0 500 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${p.name}">
    <rect width="500" height="600" fill="${p.bg}"/>
    <g ${p.cat === "shoes" ? 'transform="translate(0 -40)"' : ""}>${ART[p.art](p)}</g>
  </svg>`;
  if (!p.image) return svg;
  return `<span class="thumb">${svg}<img class="thumb__img" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()" /></span>`;
}
