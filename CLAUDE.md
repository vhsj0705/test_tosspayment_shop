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

- 이 PC에는 Node.js가 없고, Git은 `C:\Program Files\Git`에 설치돼 있어요. 셸의 PATH에 git이 없으면 머신/사용자 PATH를 다시 읽거나 전체 경로로 실행하세요.
- 배포는 Vercel이에요. `vercel.json`이 프레임워크·빌드 없이 루트 폴더를 그대로 정적 배포하도록 고정해요. `main`에 푸시하면 재배포돼요.

## 구조

전역 스크립트 방식이에요(ES 모듈 아님). 모든 페이지가 같은 순서로 스크립트를 불러오고, 뒤 파일이 앞 파일의 전역을 그대로 써요.

`js/data.js` → `js/common.js` → (주문서·결제 성공 페이지만) `js/supabase.js` → (주문서만) `js/checkout.js`

- **`js/data.js`**: `CATEGORIES`(카테고리 키·라벨·링크·세부 탭), `PRODUCTS` 배열, `getProduct()`, SVG 썸네일 생성기 `ART`/`renderThumb()`. `finalPrice`와 `sizes`는 로드할 때 `price`·`sale`·`cat`으로 계산해 붙여요. 상품 이미지는 실제 사진이 아니라 `art` 종류별 SVG 일러스트예요.
- **`js/common.js`**: 모든 페이지의 부트스트랩. `DOMContentLoaded`에서 `<body data-page="...">` 값을 읽어 헤더/푸터를 `#header`·`#footer` 자리에 주입하고, 장바구니 드로어·상품 모달·토스트를 body 끝에 붙여요. `data-page`가 `CATEGORIES`의 키(`top`/`shoes`/`pants`)이면 `initListPage()`로 목록 페이지를 그려요. 장바구니(`Cart`), 금액 계산(`calcOrder`, 5만원 이상 무료배송)도 여기 있어요.
- **목록 페이지**(`top.html`, `shoes.html`, `pants.html`): 마크업이 같고 `data-page`, 제목, 프로모션 문구만 달라요. 카테고리를 추가하려면 `CATEGORIES`와 `PRODUCTS`에 넣고 같은 마크업의 HTML을 하나 더 만들면 돼요.
- **`index.html`은 `top.html`을 복사한 파일이에요.** Vercel에서 `/`가 빈 화면이 되지 않게 리다이렉트 대신 실제 페이지로 둔 거예요. `top.html`을 고치면 `index.html`도 같이 고치세요.

## 결제 흐름

1. 상품 모달에서 "장바구니"는 `localStorage`(`fitlog-cart`)에, "바로 구매"는 `sessionStorage`(`fitlog-direct-order`)에 담고 `checkout.html?mode=direct`로 이동해요.
2. `checkout.js`: `TossPayments(clientKey).widgets({ customerKey: ANONYMOUS })` → `setAmount()` → `renderPaymentMethods()`·`renderAgreement()`. 쿠폰을 바꾸면 `setAmount()`를 다시 불러요. 결제하기를 누르면 화면용으로 `localStorage`의 `fitlog-pending-order`에 저장하고, Edge Function `create-order`로 서버에 `pending` 주문을 저장한 **뒤에** `requestPayment()`를 호출해요. `successUrl`/`failUrl`은 `new URL("success.html", location.href)`처럼 현재 위치 기준으로 만들어요.
3. `success.html`: 쿼리의 `paymentKey`·`orderId`·`amount`를 Edge Function `confirm-payment`로 보내고, 응답으로 결과 화면을 그려요. 성공하면 주문 `mode`에 따라 장바구니나 바로 구매 데이터를 비워요.
4. **결제 승인은 서버에서만 해요.** `confirm-payment`가 저장된 주문 금액과 비교한 뒤 시크릿 키로 `POST https://api.tosspayments.com/v1/payments/confirm`을 호출하고, 주문을 `paid`(실패면 `failed`)로 바꿔요. 이미 `paid`인 주문은 같은 결과를 돌려줘요(새로고침 대비).

`TOSS_CLIENT_KEY`(`js/checkout.js`)는 토스 문서에 공개된 테스트 키예요. 테스트 키에서는 가상계좌가 보이지 않아요.

## Supabase

프로젝트 `fitlog`(ID `etdvzqlvqfrnkxmzythf`, 서울 리전). 코드는 `js/supabase.js`의 `callFunction()`으로 Edge Function만 호출해요.

- `public.orders`: RLS가 켜져 있고 정책이 없어서 anon 키로는 읽고 쓸 수 없어요. Edge Function의 service role만 접근해요. (보안 어드바이저의 "RLS Enabled No Policy"는 의도한 상태예요.)
- Edge Function `create-order`, `confirm-payment`는 `verify_jwt: true`예요. 브라우저는 공개 anon 키로 호출해요. 함수 소스는 저장소에 없고 Supabase에 배포돼 있어요. 수정하려면 Supabase 도구로 다시 배포하세요.
- 토스 시크릿 키는 함수 환경변수 `TOSS_SECRET_KEY`에서 읽고, 설정이 없으면 토스 문서용 테스트 시크릿 키를 써요. 운영 전에 Supabase 대시보드(Edge Functions → Secrets)에서 내 상점 시크릿 키로 설정해야 해요.
- 주문 금액은 클라이언트가 계산해서 `create-order`에 보내고, 서버는 상품 가격표가 없어서 다시 계산하지 못해요. 금액 위변조까지 막으려면 상품을 Supabase 테이블로 옮기고 서버에서 합계를 계산해야 해요.

## 토스페이먼츠 문서 참고

- `.mcp.json`에 토스페이먼츠 문서 검색 MCP 서버(`tosspayments-integration-guide`)가 설정돼 있어요. Node.js가 있어야 실행돼요.
- MCP를 쓸 수 없으면 문서 URL 끝에 `.md`를 붙여 원문을 읽으세요. 예: https://docs.tosspayments.com/guides/v2/payment-widget/integration.md
