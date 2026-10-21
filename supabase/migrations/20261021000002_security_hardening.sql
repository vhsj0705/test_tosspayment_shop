-- 보안 보강 (2026-10-21)
-- 1) 비회원 주문조회·취소 실패 기록: 주문번호별로 30분 안에 5번 틀리면 잠가요(guest-order가 사용).
create table if not exists public.guest_order_attempts (
  id bigint generated always as identity primary key,
  order_id text not null,
  failed_at timestamptz not null default now()
);
create index if not exists guest_order_attempts_order_id_failed_at_idx on public.guest_order_attempts (order_id, failed_at desc);
alter table public.guest_order_attempts enable row level security;
revoke all on public.guest_order_attempts from anon, authenticated;

-- 2) 첫 구매 쿠폰은 회원당 한 번: 재고를 잡은(결제 중·결제 완료) 쿠폰 주문은 회원당 하나만 있을 수 있어요.
--    동시에 두 창에서 결제해도 reserve_order_stock()에서 둘째 주문이 막혀요. 취소·실패로 재고가 풀리면 다시 쓸 수 있어요.
create unique index if not exists orders_coupon_once_per_user
  on public.orders (user_id)
  where use_coupon and stock_reserved and user_id is not null;

-- 3) 브라우저(anon/authenticated)에 필요 없는 쓰기 권한 회수. 읽기는 RLS 정책대로 그대로예요.
revoke insert, update, delete, truncate, references, trigger on public.products, public.product_sizes from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke update, truncate, references, trigger on public.wishlists from authenticated;

-- 4) 토스 응답은 필요한 항목만 남겨요(휴대폰 번호·secret 등 제거).
update public.orders
set toss_response = jsonb_strip_nulls(jsonb_build_object(
  'paymentKey', toss_response->'paymentKey',
  'orderId', toss_response->'orderId',
  'orderName', toss_response->'orderName',
  'status', toss_response->'status',
  'method', toss_response->'method',
  'totalAmount', toss_response->'totalAmount',
  'balanceAmount', toss_response->'balanceAmount',
  'requestedAt', toss_response->'requestedAt',
  'approvedAt', toss_response->'approvedAt',
  'receiptUrl', toss_response->'receipt'->'url',
  'card', case when jsonb_typeof(toss_response->'card') = 'object' then (toss_response->'card') - 'number'::text end,
  'easyPay', toss_response->'easyPay',
  'cancels', toss_response->'cancels'
))
where toss_response is not null;

-- 5) 보유기간이 지난 개인정보 자동 파기(개인정보처리방침과 같은 기준).
--    결제하지 않은 주문(pending·failed)은 30일 뒤 삭제해요(주문 상품은 ON DELETE CASCADE로 같이 지워져요).
--    결제 완료·취소된 주문은 전자상거래법 거래기록 보존(5년) 대상이라 여기서 지우지 않아요.
create extension if not exists pg_cron;
select cron.schedule('purge-unpaid-orders', '0 19 * * *',
  $$delete from public.orders where status in ('pending', 'failed') and not stock_reserved and created_at < now() - interval '30 days'$$);
select cron.schedule('purge-guest-order-attempts', '30 19 * * *',
  $$delete from public.guest_order_attempts where failed_at < now() - interval '1 day'$$);
