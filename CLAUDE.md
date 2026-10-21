# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

무신사 스타일 패션 쇼핑몰 "FITLOG"의 퍼블리싱(순수 HTML/CSS/JS)과 토스페이먼츠 주문서형 결제(결제위젯 SDK v2) 연동 예제예요. 빌드 도구, 패키지 매니저, 테스트, 린트가 없어요. 파일을 고치면 브라우저 새로고침으로 바로 확인해요.

## 실행

결제위젯은 `file://`에서 동작하지 않아요(`checkout.js`가 감지해서 안내 문구만 보여줘요). 반드시 로컬 서버로 여세요.

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

http://localhost:5500 에서 확인해요. `serve.ps1`은 Node/Python 없이 도는 `HttpListener` 정적 서버예요. Node.js가 있으면 `npx serve -l 5500 .`도 돼요.

- 작업하는 PC마다 도구가 달라요. 어떤 PC는 Git(`C:\Program Files\Git`)과 Node.js LTS(v24)가 winget으로 설치돼 있고(설치 전에 열린 셸은 PATH에 없을 수 있으니 PATH를 다시 읽거나 전체 경로로 실행), 어떤 PC는 둘 다 없어요. 먼저 `git`이 있는지 확인하세요.
- Git이 없으면 저장소가 공개라서 `https://codeload.github.com/vhsj0705/test_tosspayment_shop/zip/refs/heads/main`으로 받아 고친 뒤, Claude in Chrome으로 GitHub "Upload files"(`/upload/main`)에서 한 커밋으로 올려요. GitHub 페이지는 CSP 때문에 `localhost`를 `fetch`할 수 없어서, `serve.ps1`로 띄운 로컬 페이지를 GitHub 탭에서 `window.open`하고 그 페이지가 파일을 `postMessage`로 `window.opener`에 넘겨요. 받은 파일은 `DataTransfer`로 `#upload-manifest-files-input`에 넣어요. 파일 이름을 `js/common.js`처럼 주면 하위 폴더에 들어가요. 이렇게 띄운 임시 페이지는 커밋하지 말고 지우세요.- 배포는 Vercel이에요. `vercel.json`이 프레임워크·빌드 없이 루트 폴더를 그대로 정적 배포하도록 고정해요. `main`에 푸시하면 재배포돼요.
- 운영 주소는 https://testtosspaymentshop-xv13.vercel.app 이에요(Vercel 프로젝트 `test_tosspayment_shop-xv13`, GitHub 저장소 연동). `vercel login`은 PC 이름에 한글이 있어서 `ByteString` 오류로 실패하니, CLI 대신 대시보드의 Git 연동을 쓰세요.

## DB 연동 계획

`prd.md`에 Supabase DB 연동 PRD(5단계)가 있어요. 단계 순서대로 진행해요.
- **1단계(결제 안전) 완료**: 상품·재고 DB화, 서버 금액 계산, 주문 상세, 재고 차감·복구, 비회원 주문 조회·취소(환불).
- 2단계 중 **이메일 로그인·회원가입**과 3단계 중 **좋아요(찜) 회원 저장**을 먼저 했어요. 좋아요는 로그인한 회원만 쓸 수 있어요.
- 남은 2단계: 내 정보·배송지, 주문서 자동 입력, 회원 결제(`customerKey`), 회원 주문 보호.

사용자는 비개발자예요. 설명은 기능 중심으로 하고 코드 용어는 줄이세요.

## 구조

전역 스크립트 방식이에요(ES 모듈 아님). 모든 페이지가 같은 순서로 스크립트를 불러오고, 뒤 파일이 앞 파일의 전역을 그대로 써요.

supabase-js CDN(`@supabase/supabase-js@2.45.4` UMD, 전역 `supabase`) → `js/supabase.js` → `js/data.js` → `js/common.js` → (주문서만) `js/checkout.js`. 새 페이지를 만들면 이 순서를 그대로 넣으세요.

- **`js/supabase.js`**: Supabase 주소·공개 anon 키, `restGet()`(공개 표 읽기), `callFunction()`(Edge Function 호출, 실패 시 `err.code`·`err.data`), 로그인용 클라이언트 `sb`와 `authReady`(Promise → 로그인한 user 또는 null). 로그인 상태는 supabase-js가 `localStorage`에 보관해요.
- **`js/data.js`**: `CATEGORIES`, 상품을 DB에서 불러오는 `productsReady`(Promise)와 `PRODUCTS` 배열, `getProduct()`, `refreshStock(id)`, SVG 썸네일 `ART`/`renderThumb()`. DB 행은 `toProduct()`가 화면용 모양(`cat`, `sale`, `finalPrice`, `sizes`, `stock`, `soldout`, `image`)으로 바꿔요. **`PRODUCTS`는 처음엔 비어 있으니 쓰기 전에 `await productsReady`** 하세요. DB를 못 읽으면 `localStorage`(`fitlog-products-cache`)의 마지막 목록을 써요. `renderThumb()`는 사진 뒤에 SVG 일러스트를 깔아 둬서 사진이 안 불러와지면 SVG가 보여요. 사진을 바꿀 땐(`products.photo_id`/`photo_by`) 다른 회사 로고가 보이는 사진은 피하고 README "이미지 출처"도 같이 고치세요.
- **`js/common.js`**: 모든 페이지의 부트스트랩. `DOMContentLoaded`에서 `<body data-page="...">` 값을 읽어 헤더/푸터를 주입하고, 장바구니 드로어·상품 모달·토스트를 body 끝에 붙여요. `data-page`가 `CATEGORIES`의 키(`top`/`shoes`/`pants`)이면 `initListPage()`로 목록을 그려요(로딩·오류 표시 포함). 상품 모달은 열 때 `refreshStock()`으로 재고를 다시 읽어요. 헤더의 `#authLink`는 로그인 상태면 "로그아웃"이 돼요. 좋아요는 `Likes`(로그인 회원의 `wishlists` 표, `Likes.ready`/`has`/`toggle`)이고, 로그인 안 했으면 `goLogin()`으로 로그인 페이지(`login.html?next=현재 페이지`)를 권해요. 장바구니(`Cart`)와 화면용 금액 추정(`calcOrder`)도 여기 있어요.
- **목록 페이지**(`top.html`, `shoes.html`, `pants.html`): 마크업이 같고 `data-page`, 제목, 프로모션 문구만 달라요. 카테고리를 추가하려면 `CATEGORIES`, DB `products.category` CHECK 제약, 서버 함수를 같이 고치고 같은 마크업의 HTML을 하나 더 만들어요.
- **`index.html`은 `top.html`을 복사한 파일이에요.** Vercel에서 `/`가 빈 화면이 되지 않게 리다이렉트 대신 실제 페이지로 둔 거예요. `top.html`을 고치면 `index.html`도 같이 고치세요.
- **`login.html`**: 간편 로그인(카카오 `kakao`, 네이버 `custom:naver`, 구글 `google`)이 메인이고, 이메일 로그인·가입은 "이메일로 로그인 · 가입" 아래 접혀 있어요. 버튼마다 `isProviderReady()`가 `/auth/v1/authorize`를 `redirect: "manual"`로 찔러 보고, 대시보드에서 안 켠 제공자는 "(준비 중)"으로 비활성화해요. 간편 로그인은 `signInWithOAuth({ redirectTo: login.html?next=... })`로 돌아오고, 로그인 상태로 `next`가 있으면 바로 그 페이지로 보내요. `?next=`는 같은 사이트 `.html`만 받아요. 제공자 설정 방법은 `docs/social-login-setup.md`.
- **`order.html`**: 비회원 주문 조회·취소(주문번호 + 휴대폰 번호). 헤더의 "주문조회"와 결제 완료 화면에서 들어와요.
- **검색 최적화(SEO·AEO·GEO)**: 목록 페이지 `<head>`에 설명·canonical·OG 태그와 JSON-LD(`Organization`·`WebSite`·`CollectionPage`+`BreadcrumbList`·`FAQPage`)가 있고, 본문 아래에 같은 내용의 "자주 묻는 질문"(`.faq`)이 있어요. 배송비·쿠폰 같은 규칙을 바꾸면 FAQ 본문, JSON-LD, `llms.txt`를 같이 고치세요. 상품 목록 JSON-LD(`ItemList`/`Product`)는 `renderProductListLd()`가 DB에서 불러온 뒤 붙여요. `index.html`과 `top.html`은 canonical이 둘 다 `/`예요. 주문서·결제 결과·로그인·주문조회는 `noindex`예요(`robots.txt`에서 막지 않아요). 주소는 `js/supabase.js`의 `SITE_URL`과 같은 운영 주소를 쓰고, 도메인을 바꾸면 HTML·`robots.txt`·`sitemap.xml`·`llms.txt`를 모두 바꾸세요. 페이지를 추가하면 `sitemap.xml`에도 넣으세요. `index.html`·`top.html`의 `google-site-verification`·`naver-site-verification` 메타는 Google Search Console(URL 접두어 속성 `https://testtosspaymentshop-xv13.vercel.app/`)과 네이버 서치어드바이저 소유 확인용이라 지우면 확인이 풀려요. 네이버 서치어드바이저는 Claude in Chrome에서 막혀 있어서 네이버 화면 작업은 사용자가 직접 해요.
- `$(sel)`은 요소 하나, `$$(sel)`은 배열이에요. 스크립트로 파일을 고칠 때 JS `String.replace`의 바꿀 문자열에 `$$`를 넣으면 `$` 하나로 바뀌니 조심하세요.

## 결제 흐름

1. 상품 모달에서 "장바구니"는 `localStorage`(`fitlog-cart`)에, "바로 구매"는 `sessionStorage`(`fitlog-direct-order`)에 담고 `checkout.html?mode=direct`로 이동해요. 항목 모양은 `{ id, size, qty }`(수량 최대 10).
2. `checkout.js`: `create-order`를 `dryRun: true`로 불러 **서버가 계산한 금액**을 보여줘요(쿠폰을 바꿀 때도 다시 불러요). 재고가 부족한 상품이 있으면 표시하고 결제를 막아요("품절 상품 정리" 버튼). 결제위젯은 `setAmount(서버 금액)` → `renderPaymentMethods()`·`renderAgreement()`.
3. 결제하기: `create-order`에 `{ orderId, items, useCoupon, expectedAmount, orderer }`를 보내요. 서버가 다시 계산해서 `expectedAmount`와 다르면 `AMOUNT_CHANGED`, 재고가 모자라면 `SOLD_OUT`(409)로 거부하고, 같으면 `orders`(pending)와 `order_items`를 저장해요. 그 뒤 `localStorage`의 `fitlog-pending-order`에 저장하고 `requestPayment()`를 호출해요.
4. `success.html` → `confirm-payment`: 금액 비교 → `reserve_order_stock()`로 재고 차감(모자라면 승인 안 함) → 시크릿 키로 토스 승인 API 호출 → `paid`. 토스가 거절하면 재고를 되돌리고 `failed`. 이미 `paid`면 같은 결과를 돌려줘요(새로고침 대비). 응답에 주문 상세(`items`)가 있어요.
5. 취소: `order.html` → `guest-order`(`action: "cancel"`) → 토스 취소 API(`POST /v1/payments/{paymentKey}/cancel`) → `canceled` + `release_order_stock()`.

- 금액 규칙(서버 `create-order`의 `quote()`가 기준): 판매가=정가×(1−할인율) 100원 단위 반올림(DB `products.final_price` 계산 컬럼), 상품 합계 5만원 미만 배송비 3,000원, 쿠폰=상품 합계 20%(10원 단위 내림, 최대 1만원), 주문 금액 1원~1,000만원. 화면의 `calcOrder()`는 장바구니 드로어용 추정치예요.
- `create-order`는 예전 주문서가 보내던 `amount`·`coupon`도 `expectedAmount`·`useCoupon`으로 받아줘요(배포 전환기 호환).

`TOSS_CLIENT_KEY`(`js/checkout.js`)는 토스 문서에 공개된 테스트 키예요. 테스트 키에서는 가상계좌가 보이지 않아요.

## Supabase

프로젝트 `fitlog`(ID `etdvzqlvqfrnkxmzythf`, 서울 리전). DB 구조는 `supabase/migrations/`, 함수 소스는 `supabase/functions/`에 있어요(배포본과 같게 유지).

| 표 | 내용 | 접근 |
|---|---|---|
| `products` | 상품(가격 `price`, 할인율 `sale_rate`, 판매가 `final_price` 자동 계산, 배지, 사진, 썸네일 색) | 누구나 읽기(`is_active`만), 수정은 서버만 |
| `product_sizes` | 상품별 사이즈·재고(`stock`, 0이면 품절) | 누구나 읽기, 수정은 서버만 |
| `orders` | 주문 요약·금액 내역·상태(`pending`/`paid`/`failed`/`canceled`)·`stock_reserved` | 서버만 |
| `order_items` | 주문 당시 상품명·가격·사이즈·수량 | 서버만 |
| `wishlists` | 회원별 좋아요(`user_id`, `product_id`) | 로그인한 본인만 읽기·추가·삭제 |

- 보안 어드바이저의 `orders`·`order_items` "RLS Enabled No Policy"는 의도한 상태예요.
- DB 함수 `reserve_order_stock(order_id)`/`release_order_stock(order_id)`: `stock_reserved` 플래그로 한 번만 차감·복구해요. `stock >= qty` 조건부 UPDATE라 마지막 1개는 한 명만 가져가요. service role만 실행할 수 있어요.
- Edge Function `create-order`, `confirm-payment`, `guest-order`는 모두 `verify_jwt: true`이고 브라우저는 공개 anon 키로 호출해요.
- 토스 시크릿 키는 함수 환경변수 `TOSS_SECRET_KEY`에서 읽고, 없으면 토스 문서용 테스트 시크릿 키를 써요. 운영 전에 Supabase 대시보드(Edge Functions → Secrets)에서 내 상점 시크릿 키로 설정해야 해요.
- Supabase 도구(`mcp__…__list_tables`, `get_edge_function`, `apply_migration`, `deploy_edge_function`, `execute_sql`)는 `ToolSearch`로 스키마를 불러온 뒤 써요. 함수를 고치기 전엔 `get_edge_function`으로 배포본을 먼저 읽고, 고친 소스는 `supabase/functions/`에도 남기세요. 마이그레이션도 `supabase/migrations/`에 파일로 남기세요.
- 로그인은 Supabase Auth예요. 간편 로그인 키(카카오·구글·네이버)는 사용자가 대시보드에 직접 넣어야 해요(`docs/social-login-setup.md`). 네이버는 기본 제공자가 아니라 사용자 지정 OAuth2 제공자이고, 네이버 회원 정보 응답이 `response`로 감싸져 있어 실제 동작은 아직 확인 못 했어요. 가입 확인 메일 링크는 `SITE_URL`(`js/supabase.js`, 운영 주소)의 `login.html`로 고정돼 있어요(로컬에서 가입해도). 링크를 누르고 돌아오면 `AUTH_RETURN`(supabase-js가 지우기 전에 읽어 둔 `#` 뒤 값)의 `type=signup`을 보고 "이메일 인증이 완료됐어요"를 보여줘요. 이 주소가 대시보드 Authentication → URL Configuration의 Redirect URLs에 없으면 Supabase가 Site URL(기본값 `http://localhost:3000`)로 보내 버려요. 2026-10-20에 Site URL을 운영 주소로, Redirect URLs에 `https://testtosspaymentshop-xv13.vercel.app/**`와 `http://localhost:5500/**`를 설정해 뒀어요. 새 도메인을 쓰면 여기에 추가하세요. 기본 메일 발송은 시간당 몇 통으로 제한돼요.
- 로컬 테스트 계정은 `.claude/test-account.txt`(Git 제외)에 있어요. 브라우저 확인은 이 계정으로 하고, 가입 테스트로 실제 메일을 보내지 마세요.
- 보안 어드바이저의 "Leaked Password Protection Disabled" 경고는 대시보드 Auth 설정에서 켤 수 있어요(유료 플랜 기능일 수 있음).
- 비회원 주문 조회·취소는 주문번호 + 휴대폰 번호로만 확인해요. 2단계(회원)에서 로그인 기반으로 강화할 예정이에요.

## 토스페이먼츠 문서 참고

- `.mcp.json`에 토스페이먼츠 문서 검색 MCP 서버(`tosspayments-integration-guide`)가 설정돼 있어요. Node.js가 있어야 실행돼요.
- MCP를 쓸 수 없으면 문서 URL 끝에 `.md`를 붙여 원문을 읽으세요. 예: https://docs.tosspayments.com/guides/v2/payment-widget/integration.md
