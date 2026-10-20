-- 단계 1. 결제 안전: 상품·사이즈별 재고·주문 상세 표, 재고 차감/복구 함수

-- ---------- 상품 ----------
create table public.products (
  id text primary key check (id ~ '^[A-Z0-9]{2,20}$'),
  category text not null check (category in ('top', 'shoes', 'pants')),
  sub_category text not null,
  brand text not null,
  name text not null,
  price integer not null check (price > 0),
  sale_rate integer not null default 0 check (sale_rate between 0 and 90),
  -- 판매가 = 정가 × (1 - 할인율), 100원 단위 반올림
  final_price integer generated always as ((round(price::numeric * (100 - sale_rate) / 10000) * 100)::integer) stored,
  badges text[] not null default '{}',
  photo_id text,
  photo_by text,
  art text not null default 'tee',
  bg_color text not null default '#eeeeee',
  main_color text not null default '#333333',
  accent_color text not null default '#111111',
  stripe boolean not null default false,
  likes integer not null default 0,
  reviews integer not null default 0,
  rating numeric(2, 1) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_sizes (
  product_id text not null references public.products (id) on delete cascade,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, size)
);

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_sizes_set_updated_at before update on public.product_sizes
  for each row execute function public.set_updated_at();

-- 상품·재고는 누구나 읽고, 수정은 서버(service role)만 해요.
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
create policy "products_public_read" on public.products for select to anon, authenticated using (is_active);
create policy "product_sizes_public_read" on public.product_sizes for select to anon, authenticated using (true);

-- ---------- 주문 ----------
-- 상품 목록은 order_items로 옮기고, 금액 내역과 재고/취소 정보를 추가해요. (기존 주문 0건)
alter table public.orders drop column items;
alter table public.orders
  add column origin_amount integer not null default 0,
  add column subtotal integer not null default 0,
  add column shipping_fee integer not null default 0,
  add column use_coupon boolean not null default false,
  add column stock_reserved boolean not null default false,
  add column canceled_at timestamptz,
  add column cancel_reason text;
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'failed', 'canceled'));
alter table public.orders add constraint orders_amount_max check (amount <= 10000000);

-- 주문 당시의 상품명·가격을 그대로 남겨요(나중에 가격이 바뀌어도 보존).
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id),
  product_name text not null,
  brand text not null,
  size text not null,
  qty integer not null check (qty between 1 and 10),
  unit_price integer not null check (unit_price >= 0),
  unit_origin_price integer not null check (unit_origin_price >= 0),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
alter table public.order_items enable row level security;

-- ---------- 재고 차감 / 복구 ----------
-- 결제 승인 직전에 호출해요. 하나라도 재고가 모자라면 전부 되돌리고 'SOLD_OUT:상품명:사이즈' 오류를 내요.
-- 같은 행을 동시에 고치면 Postgres가 줄 단위로 기다렸다가 stock >= qty 조건을 다시 확인하므로 마지막 1개는 한 명만 가져가요.
create or replace function public.reserve_order_stock(p_order_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  r record;
begin
  update public.orders set stock_reserved = true
   where order_id = p_order_id and status = 'pending' and not stock_reserved
   returning id into v_id;

  if v_id is null then
    -- 이미 차감한 주문이면 그대로 통과(중복 요청 대비)
    if exists (select 1 from public.orders where order_id = p_order_id and stock_reserved) then
      return;
    end if;
    raise exception 'ORDER_NOT_PENDING';
  end if;

  for r in
    select product_id, size, min(product_name) as product_name, sum(qty)::integer as qty
      from public.order_items where order_id = v_id
     group by product_id, size
     order by product_id, size
  loop
    update public.product_sizes set stock = stock - r.qty
     where product_id = r.product_id and size = r.size and stock >= r.qty;
    if not found then
      raise exception 'SOLD_OUT:%:%', r.product_name, r.size;
    end if;
  end loop;
end;
$$;

-- 결제 실패·취소 때 호출해요. 차감한 적이 있을 때만 한 번 되돌려요.
create or replace function public.release_order_stock(p_order_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  r record;
begin
  update public.orders set stock_reserved = false
   where order_id = p_order_id and stock_reserved
   returning id into v_id;
  if v_id is null then
    return;
  end if;

  for r in
    select product_id, size, sum(qty)::integer as qty
      from public.order_items where order_id = v_id
     group by product_id, size
     order by product_id, size
  loop
    update public.product_sizes set stock = stock + r.qty
     where product_id = r.product_id and size = r.size;
  end loop;
end;
$$;

revoke execute on function public.reserve_order_stock(text) from public, anon, authenticated;
revoke execute on function public.release_order_stock(text) from public, anon, authenticated;
grant execute on function public.reserve_order_stock(text) to service_role;
grant execute on function public.release_order_stock(text) to service_role;
