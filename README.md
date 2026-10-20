# FITLOG — 토스페이먼츠 연동 쇼핑몰 퍼블리싱

무신사 스타일의 패션 쇼핑몰 퍼블리싱(HTML/CSS/JS)과 토스페이먼츠 주문서형 결제(결제위젯 v2) 연동 예제예요.

## 페이지

| 파일 | 내용 |
| --- | --- |
| `top.html` | 상의 목록 |
| `shoes.html` | 신발 목록 |
| `pants.html` | 바지 목록 |
| `checkout.html` | 주문서 + 토스페이먼츠 결제위젯 |
| `success.html` | 결제 성공(successUrl), 서버 승인 결과·주문 상세 |
| `fail.html` | 결제 실패(failUrl) |
| `order.html` | 비회원 주문 조회·취소(주문번호 + 휴대폰 번호) |
| `login.html` | 이메일 로그인·회원가입 |

공통 기능: 세부 카테고리 탭, 무료배송 필터, 정렬, 좋아요(로그인 회원 전용, 계정에 저장), 상품 상세 모달(사이즈/수량, 실시간 재고), 장바구니 드로어(localStorage), 바로 구매.

## 데이터(Supabase)

상품·가격·사이즈별 재고와 주문은 Supabase DB에 있어요. 가격이나 재고를 바꾸려면 Supabase 대시보드의 Table Editor에서 `products`(가격 `price`, 할인율 `sale_rate`)나 `product_sizes`(재고 `stock`)를 고치면 사이트에 바로 반영돼요. 판매가는 DB가 자동으로 계산해요.

- 결제 금액은 서버가 DB 가격으로 계산해요. 화면 금액과 다르면 결제를 막아요.
- 재고는 결제 승인 직전에 줄고, 결제 실패·취소 때 되돌아와요.
- DB 구조: `supabase/migrations/`, 서버 함수: `supabase/functions/`

## 실행

결제위젯은 `file://`에서 동작하지 않아요. 로컬 서버로 여세요.

```bash
# Node.js가 있다면
npx serve -l 5500 .

# Windows PowerShell만 있다면
powershell -ExecutionPolicy Bypass -File serve.ps1
```

http://localhost:5500 접속

## 토스페이먼츠 연동

- SDK: `https://js.tosspayments.com/v2/standard`
- `js/checkout.js`의 `TOSS_CLIENT_KEY`는 **문서용 테스트 키**예요. 실제 금액이 빠져나가지 않아요.
- 흐름: `widgets()` → `setAmount()` → `renderPaymentMethods()` / `renderAgreement()` → `requestPayment()` → `successUrl`

### 운영 전 할 일

1. `TOSS_CLIENT_KEY`를 내 상점 클라이언트 키로 교체
2. Supabase 대시보드(Edge Functions → Secrets)에 `TOSS_SECRET_KEY`를 내 상점 시크릿 키로 설정 (결제 승인·취소는 서버 함수가 이 키로 호출해요)

> 시크릿 키는 절대 프론트엔드 코드나 저장소에 올리지 마세요.

참고: https://docs.tosspayments.com/guides/v2/payment-widget/integration

## 이미지 출처

상품 사진은 [Unsplash](https://unsplash.com)에서 가져왔어요. [Unsplash License](https://unsplash.com/license)에 따라 상업적으로도 쓸 수 있고 출처 표기는 필수가 아니지만, 촬영자를 밝혀 둬요. 상품과 사진의 대응은 DB `products` 표의 `photo_id`·`photo_by`에 있고, 사진이 불러와지지 않으면 SVG 일러스트가 대신 보여요.

Geoffroy Danest, Haryo Setyadi, Ryan Hoffman, Nimble Made, Jannes Jacobs, Kateryna Hliznitsova, Ali Saadat, Jonathan Adams, Mediamodifier, Aymen Chabani, Irene Kredenets, taha siddiqui, Maxim Hopman, Axel Bimashanda, Elie Dagher, Nelibar Shoes, mostafa mahmoudi, SJ, Matthew Moloney, TuanAnh Blue, sammy swae, engin akyurt, Kyle Loftus, Zoe

사진 속 인물은 모델 릴리스가 확인되지 않았어요. 실제 서비스로 운영한다면 인물 사진은 직접 촬영하거나 계약한 사진으로 바꾸는 걸 권해요.
