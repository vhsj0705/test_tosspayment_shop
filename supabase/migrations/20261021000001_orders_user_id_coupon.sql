-- 신규 회원 첫 구매 쿠폰 자격 확인용: 로그인한 회원이 주문하면 회원 ID를 남겨요(비회원 주문은 null).
-- 쿠폰은 회원이고, 그 회원의 결제 완료(paid) 주문이 아직 없을 때만 서버(create-order, confirm-payment)가 적용해요.
alter table public.orders
  add column user_id uuid references auth.users (id) on delete set null;

create index orders_user_id_status_idx on public.orders (user_id, status) where user_id is not null;
