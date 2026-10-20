-- 좋아요(찜): 로그인한 회원만, 본인 것만 읽고 추가·삭제할 수 있어요.
create table public.wishlists (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlists_product_id_idx on public.wishlists (product_id);

alter table public.wishlists enable row level security;
revoke all on public.wishlists from anon;
grant select, insert, delete on public.wishlists to authenticated;

create policy "wishlists_select_own" on public.wishlists for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "wishlists_insert_own" on public.wishlists for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "wishlists_delete_own" on public.wishlists for delete to authenticated
  using ((select auth.uid()) = user_id);
