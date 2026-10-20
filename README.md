# FITLOG — 토스페이먼츠 연동 쇼핑몰 퍼블리싱

무신사 스타일의 패션 쇼핑몰 퍼블리싱(HTML/CSS/JS)과 토스페이먼츠 주문서형 결제(결제위젯 v2) 연동 예제예요.

## 페이지

| 파일 | 내용 |
| --- | --- |
| `top.html` | 상의 목록 |
| `shoes.html` | 신발 목록 |
| `pants.html` | 바지 목록 |
| `checkout.html` | 주문서 + 토스페이먼츠 결제위젯 |
| `success.html` | 결제 성공(successUrl), 금액 검증 |
| `fail.html` | 결제 실패(failUrl) |

공통 기능: 세부 카테고리 탭, 무료배송 필터, 정렬, 좋아요, 상품 상세 모달(사이즈/수량), 장바구니 드로어(localStorage), 바로 구매.

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
2. 서버에서 시크릿 키로 결제 승인 API(`POST https://api.tosspayments.com/v1/payments/confirm`) 호출 후 `success.html`의 `CONFIRM_ENDPOINT`에 주소 입력
3. `orderId`·`amount`를 결제 요청 전에 서버에 저장하고 승인 시 검증

> 시크릿 키는 절대 프론트엔드 코드나 저장소에 올리지 마세요.

참고: https://docs.tosspayments.com/guides/v2/payment-widget/integration
