# 간편 로그인(카카오·네이버·구글) 설정 방법

로그인 페이지(`login.html`)의 버튼은 이미 만들어 뒀어요. 아래 설정을 마치면 "(준비 중)" 표시가 사라지고 버튼이 동작해요. 코드는 고칠 필요가 없어요.

모든 서비스에 공통으로 넣는 **콜백 주소**:

```
https://etdvzqlvqfrnkxmzythf.supabase.co/auth/v1/callback
```

## 0. 먼저: 돌아올 주소 허용 (한 번만)

Supabase 대시보드 → Authentication → **URL Configuration**

- Site URL: `https://testtosspaymentshop-xv13.vercel.app`
- Redirect URLs에 추가:
  - `https://testtosspaymentshop-xv13.vercel.app/**`
  - `http://localhost:5500/**`

이게 없으면 로그인 뒤 엉뚱한 주소로 돌아가요.

## 1. 카카오

1. [Kakao Developers](https://developers.kakao.com)에 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
2. **앱 설정 → 앱 → 플랫폼 키**에서 **REST API 키**를 복사해 둬요(= Client ID).
3. 같은 REST API 키를 눌러 편집 화면에서:
   - **카카오 로그인 리다이렉트 URI**에 위 콜백 주소를 넣어요.
   - **카카오 로그인 Client Secret** 코드를 복사하고, 활성화 상태로 둬요(= Client Secret).
4. **제품 설정 → 카카오 로그인 → 일반**에서 사용 설정 **ON**
5. **제품 설정 → 카카오 로그인 → 동의항목**에서 `profile_nickname`, `profile_image`를 켜요.
   - 이메일(`account_email`)은 비즈 앱으로 전환해야 받을 수 있어요. 안 받을 거면 아래 6번에서 "이메일 없는 사용자 허용"을 켜요.
6. Supabase 대시보드 → Authentication → **Sign In / Providers → Kakao**
   - Kakao Enabled **ON**, Client ID·Client Secret 입력
   - 이메일을 안 받으면 **Allow users without an email** ON → Save

## 2. 구글

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 만들기
2. **API 및 서비스 → OAuth 동의 화면**을 설정해요(외부, 앱 이름·지원 이메일).
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: 위 콜백 주소
4. 나온 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사해요.
5. Supabase → Authentication → Sign In / Providers → **Google** → Enabled ON, 두 값 입력 → Save

## 3. 네이버 (주의: 실제 확인 필요)

네이버는 Supabase가 기본으로 지원하지 않아서 "사용자 지정 제공자"로 넣어요. **네이버는 회원 정보를 `response` 안에 감싸서 돌려주기 때문에 Supabase가 읽지 못할 수 있어요.** 설정 후 실제로 로그인이 되는지 꼭 확인해야 해요. 안 되면 알려 주세요. 서버 함수로 직접 연결하는 방법으로 바꿀게요.

1. [NAVER Developers](https://developers.naver.com) → **Application → 애플리케이션 등록**
   - 사용 API: **네이버 로그인**, 제공 정보: 이메일(필수), 별명
   - 서비스 환경: PC 웹 → 서비스 URL `https://testtosspaymentshop-xv13.vercel.app`
   - Callback URL: 위 콜백 주소
2. 등록 후 **Client ID**, **Client Secret**을 복사해요.
3. Supabase → Authentication → Sign In / Providers → **New Provider** → **Manual configuration**
   - Identifier: `custom:naver` (정확히 이대로. 화면 버튼이 이 이름을 써요)
   - Client ID / Client Secret: 위 값
   - Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
   - Token URL: `https://nid.naver.com/oauth2.0/token`
   - UserInfo URL: `https://openapi.naver.com/v1/nid/me`
   - 로그인이 실패하면 PKCE를 끄고(`pkce_enabled: false`) 다시 시도해 보세요.
4. **Create and enable provider**

## 확인

설정한 뒤 로그인 페이지를 새로고침하면 해당 버튼의 "(준비 중)"이 사라져요. 눌러서 로그인 → 원래 보던 페이지로 돌아오면 성공이에요.
