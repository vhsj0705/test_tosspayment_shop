/* =========================================================
 * 상품 데이터 + 상품 썸네일(SVG) 생성
 * 실제 이미지가 준비되면 product.image 경로를 넣고
 * renderThumb()에서 <img>를 반환하도록 바꾸면 돼요.
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

const TOP_SIZES = ["S", "M", "L", "XL", "XXL"];
const PANTS_SIZES = ["28", "30", "32", "34", "36"];
const SHOE_SIZES = ["230", "240", "250", "260", "270", "280"];

const PRODUCTS = [
  /* ---------- 상의 ---------- */
  { id: "T001", cat: "top", sub: "반소매 티셔츠", art: "tee", brand: "LAYERED", name: "오버핏 피그먼트 반소매 티셔츠 차콜", price: 39000, sale: 32, bg: "#e9e6e1", main: "#3b3b3d", accent: "#2a2a2c", likes: 18234, reviews: 4211, rating: 4.9, badges: ["free", "only"], soldout: ["XXL"] },
  { id: "T002", cat: "top", sub: "반소매 티셔츠", art: "tee", brand: "MONOWAVE", name: "베이직 코튼 크루넥 티셔츠 화이트", price: 25000, sale: 20, bg: "#dfe6ec", main: "#fafafa", accent: "#e1e1e1", likes: 9821, reviews: 2810, rating: 4.8, badges: ["free"] },
  { id: "T003", cat: "top", sub: "긴소매 티셔츠", art: "long", brand: "NORTHFOLK", name: "헤비웨이트 롱슬리브 티셔츠 네이비", price: 45000, sale: 15, bg: "#ece8df", main: "#1f2b4a", accent: "#17213a", likes: 7310, reviews: 1203, rating: 4.8, badges: ["free"] },
  { id: "T004", cat: "top", sub: "셔츠/블라우스", art: "shirt", brand: "STUDIO K", name: "옥스포드 버튼다운 셔츠 스카이블루", price: 59000, sale: 30, bg: "#f1ece6", main: "#a9c6e8", accent: "#8db0d8", likes: 6522, reviews: 980, rating: 4.7, badges: ["only"] },
  { id: "T005", cat: "top", sub: "후드 티셔츠", art: "hood", brand: "LAYERED", name: "투웨이 스웻 후드 집업 멜란지 그레이", price: 69000, sale: 25, bg: "#e3e8e4", main: "#b9bbbd", accent: "#9fa2a5", likes: 15420, reviews: 3320, rating: 4.9, badges: ["free", "only"], soldout: ["S"] },
  { id: "T006", cat: "top", sub: "니트/스웨터", art: "long", brand: "WOOLMARK HOUSE", name: "램스울 크루넥 니트 오트밀", price: 79000, sale: 40, bg: "#e7e2ea", main: "#d9c8ad", accent: "#c4b291", likes: 11205, reviews: 1755, rating: 4.8, badges: ["free"] },
  { id: "T007", cat: "top", sub: "반소매 티셔츠", art: "tee", brand: "CITYBOY CLUB", name: "로고 그래픽 반소매 티셔츠 블랙", price: 35000, sale: 10, bg: "#f3e9d8", main: "#151515", accent: "#ffffff", likes: 5310, reviews: 802, rating: 4.7, badges: [] },
  { id: "T008", cat: "top", sub: "후드 티셔츠", art: "hood", brand: "MONOWAVE", name: "헤비 기모 오버핏 후드 티셔츠 버건디", price: 59000, sale: 35, bg: "#e8e4dc", main: "#6e1f2a", accent: "#561820", likes: 8740, reviews: 1430, rating: 4.8, badges: ["free"] },
  { id: "T009", cat: "top", sub: "셔츠/블라우스", art: "shirt", brand: "NORTHFOLK", name: "코듀로이 오버셔츠 브라운", price: 72000, sale: 22, bg: "#e4e8ee", main: "#7a5236", accent: "#5f3f29", likes: 4120, reviews: 512, rating: 4.6, badges: [] },
  { id: "T010", cat: "top", sub: "긴소매 티셔츠", art: "long", brand: "CITYBOY CLUB", name: "스트라이프 롱슬리브 티셔츠 아이보리", price: 42000, sale: 18, bg: "#e0e7e9", main: "#f2ede1", accent: "#2b3d6b", likes: 3950, reviews: 640, rating: 4.7, badges: ["free"], stripe: true },

  /* ---------- 신발 ---------- */
  { id: "S001", cat: "shoes", sub: "스니커즈", art: "sneaker", brand: "RUNLAB", name: "클래식 레더 로우 스니커즈 화이트", price: 99000, sale: 20, bg: "#e7ebef", main: "#fbfbfb", accent: "#1d1d1d", likes: 22140, reviews: 6890, rating: 4.9, badges: ["free", "only"], soldout: ["230"] },
  { id: "S002", cat: "shoes", sub: "러닝화", art: "sneaker", brand: "STRIDE", name: "쿠셔닝 데일리 러닝화 블랙", price: 129000, sale: 15, bg: "#ece7df", main: "#202020", accent: "#ff5a1f", likes: 13200, reviews: 2840, rating: 4.8, badges: ["free"] },
  { id: "S003", cat: "shoes", sub: "로퍼", art: "loafer", brand: "OXFORD ROW", name: "페니 로퍼 블랙 레더", price: 149000, sale: 30, bg: "#ebe5df", main: "#1a1a1a", accent: "#3a3a3a", likes: 9870, reviews: 1650, rating: 4.8, badges: ["free"] },
  { id: "S004", cat: "shoes", sub: "부츠", art: "boot", brand: "TRAILMADE", name: "6인치 워커 부츠 휘트", price: 189000, sale: 25, bg: "#e2e7e3", main: "#c38d4e", accent: "#8a5b2b", likes: 7340, reviews: 980, rating: 4.7, badges: ["free", "only"], soldout: ["280"] },
  { id: "S005", cat: "shoes", sub: "스니커즈", art: "sneaker", brand: "COURTSIDE", name: "캔버스 하이브리드 스니커즈 크림", price: 69000, sale: 10, bg: "#e6e3ec", main: "#efe6d2", accent: "#2c4b8a", likes: 6120, reviews: 1220, rating: 4.7, badges: [] },
  { id: "S006", cat: "shoes", sub: "러닝화", art: "sneaker", brand: "RUNLAB", name: "경량 메쉬 러닝화 라이트그레이", price: 119000, sale: 28, bg: "#efe8de", main: "#c9cdd2", accent: "#2f7df6", likes: 8420, reviews: 1730, rating: 4.8, badges: ["free"] },
  { id: "S007", cat: "shoes", sub: "로퍼", art: "loafer", brand: "OXFORD ROW", name: "스웨이드 태슬 로퍼 브라운", price: 139000, sale: 35, bg: "#e4e9ed", main: "#7a5038", accent: "#5c3a26", likes: 3420, reviews: 410, rating: 4.6, badges: [] },
  { id: "S008", cat: "shoes", sub: "부츠", art: "boot", brand: "TRAILMADE", name: "첼시 부츠 블랙 스무스", price: 169000, sale: 20, bg: "#ece4e1", main: "#222222", accent: "#3b3b3b", likes: 5890, reviews: 760, rating: 4.8, badges: ["free"] },
  { id: "S009", cat: "shoes", sub: "스니커즈", art: "sneaker", brand: "COURTSIDE", name: "레트로 스웨이드 스니커즈 그린", price: 89000, sale: 22, bg: "#efebe3", main: "#2f6b4f", accent: "#f3efe4", likes: 4780, reviews: 690, rating: 4.7, badges: ["only"] },

  /* ---------- 바지 ---------- */
  { id: "P001", cat: "pants", sub: "데님 팬츠", art: "pants", brand: "INDIGO WORKS", name: "와이드 스트레이트 데님 팬츠 미드블루", price: 69000, sale: 30, bg: "#ece8e1", main: "#4a6d9c", accent: "#3a5880", likes: 19870, reviews: 5320, rating: 4.9, badges: ["free", "only"], soldout: ["36"] },
  { id: "P002", cat: "pants", sub: "슬랙스", art: "pants", brand: "STUDIO K", name: "세미와이드 원턱 슬랙스 블랙", price: 49000, sale: 25, bg: "#e3e8ec", main: "#1c1c1e", accent: "#333336", likes: 16540, reviews: 4410, rating: 4.9, badges: ["free"] },
  { id: "P003", cat: "pants", sub: "카고 팬츠", art: "cargo", brand: "FIELDNOTE", name: "나일론 파라슈트 카고 팬츠 올리브", price: 79000, sale: 20, bg: "#efe9e2", main: "#5b6041", accent: "#474b33", likes: 9120, reviews: 1670, rating: 4.8, badges: ["free"] },
  { id: "P004", cat: "pants", sub: "트레이닝 팬츠", art: "pants", brand: "MONOWAVE", name: "스웻 조거 트레이닝 팬츠 멜란지", price: 45000, sale: 15, bg: "#e6e2ea", main: "#a9abae", accent: "#8f9295", likes: 7340, reviews: 1290, rating: 4.7, badges: [] },
  { id: "P005", cat: "pants", sub: "숏 팬츠", art: "shorts", brand: "CITYBOY CLUB", name: "코튼 버뮤다 쇼츠 베이지", price: 39000, sale: 30, bg: "#e1e7e6", main: "#cdb48f", accent: "#b39a74", likes: 5210, reviews: 830, rating: 4.7, badges: ["free"] },
  { id: "P006", cat: "pants", sub: "데님 팬츠", art: "pants", brand: "INDIGO WORKS", name: "슬림 테이퍼드 데님 팬츠 블랙", price: 72000, sale: 18, bg: "#efe7de", main: "#2b2d33", accent: "#1f2025", likes: 6610, reviews: 1180, rating: 4.8, badges: [] },
  { id: "P007", cat: "pants", sub: "카고 팬츠", art: "cargo", brand: "FIELDNOTE", name: "코튼 립스탑 카고 팬츠 베이지", price: 75000, sale: 35, bg: "#e5e9ee", main: "#d2c2a2", accent: "#b6a582", likes: 8020, reviews: 1410, rating: 4.8, badges: ["free", "only"] },
  { id: "P008", cat: "pants", sub: "슬랙스", art: "pants", brand: "NORTHFOLK", name: "울 블렌드 테이퍼드 슬랙스 그레이", price: 89000, sale: 40, bg: "#ece6e0", main: "#6e7176", accent: "#55585c", likes: 4390, reviews: 560, rating: 4.7, badges: ["free"] },
  { id: "P009", cat: "pants", sub: "숏 팬츠", art: "shorts", brand: "STRIDE", name: "러닝 나일론 쇼츠 네이비", price: 35000, sale: 10, bg: "#efebe5", main: "#1f2b4a", accent: "#2f7df6", likes: 2980, reviews: 420, rating: 4.6, badges: [] },
];

/* ---------- 상품 사진 (Unsplash, Unsplash License: 상업적 이용 가능) ----------
 * photo: images.unsplash.com 의 photo-XXXX 부분, by: 촬영자
 * 출처 목록은 README.md 의 "이미지 출처"에도 정리해 뒀어요. */
const PHOTOS = {
  T001: ["1621951767587-b24334f11c65", "Geoffroy Danest"],
  T002: ["1581655353564-df123a1eb820", "Haryo Setyadi"],
  T003: ["1618354691551-44de113f0164", "Ryan Hoffman"],
  T004: ["1602810316693-3667c854239a", "Nimble Made"],
  T005: ["1556821840-3a63f95609a7", "Jannes Jacobs"],
  T006: ["1634901581982-6b408cf4226a", "Kateryna Hliznitsova"],
  T007: ["1618354691438-25bc04584c23", "Ryan Hoffman"],
  T008: ["1578768079052-aa76e52ff62e", "Ali Saadat"],
  T009: ["1782227293813-040b9f9ce99e", "Jonathan Adams"],
  T010: ["1620799140408-edc6dcb6d633", "Mediamodifier"],
  S001: ["1561282109-3a8f490997cc", "Aymen Chabani"],
  S002: ["1560769629-975ec94e6a86", "Irene Kredenets"],
  S003: ["1760616172899-0681b97a2de3", "taha siddiqui"],
  S004: ["1605812860427-4024433a70fd", "Maxim Hopman"],
  S005: ["1641997465126-c73cc4070337", "Axel Bimashanda"],
  S006: ["1720019315323-5e2b98a58ba8", "Elie Dagher"],
  S007: ["1676121270762-47c8d3a7b9d5", "Nelibar Shoes"],
  S008: ["1605732440685-d0654d81aa30", "mostafa mahmoudi"],
  S009: ["1727061180303-d91cdeca6f9c", "SJ"],
  P001: ["1624378440847-4a64ee1a889d", "Matthew Moloney"],
  P002: ["1718252540511-e958742e4165", "TuanAnh Blue"],
  P003: ["1766575696324-5b65330f23c2", "sammy swae"],
  P004: ["1602573991155-21f0143bb45c", "engin akyurt"],
  P005: ["1591195853828-11db59a44f6b", "engin akyurt"],
  P006: ["1714143136372-ddaf8b606da7", "TuanAnh Blue"],
  P007: ["1548883354-7622d03aca27", "Kyle Loftus"],
  P008: ["1619032209422-fc090f6a3f5f", "Zoe"],
  P009: ["1789110520350-db58d2271c63", "engin akyurt"],
};

PRODUCTS.forEach((p) => {
  p.finalPrice = Math.round((p.price * (1 - p.sale / 100)) / 100) * 100;
  p.sizes = p.cat === "top" ? TOP_SIZES : p.cat === "shoes" ? SHOE_SIZES : PANTS_SIZES;
  p.soldout = p.soldout || [];
  const photo = PHOTOS[p.id];
  if (photo) {
    p.image = `https://images.unsplash.com/photo-${photo[0]}?auto=format&fit=crop&w=600&h=720&q=75`;
    p.credit = photo[1];
  }
});

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
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
