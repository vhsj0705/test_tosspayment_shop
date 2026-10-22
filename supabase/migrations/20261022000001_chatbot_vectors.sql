-- 챗봇: 상품·쇼핑 안내 문서를 Upstage 임베딩(4096차원)으로 저장하고 비슷한 문서를 찾아요.
-- 문서는 Edge Function `chat`이 대화 요청 때 내용이 바뀐 것만 다시 임베딩해서 채워요.

create extension if not exists vector with schema extensions;

create table public.chat_documents (
  id text primary key,                       -- 'product:T001', 'faq:shipping'
  kind text not null check (kind in ('product', 'faq')),
  product_id text references public.products(id) on delete cascade,
  content text not null,                     -- 임베딩한 원문(바뀌었는지 비교용)
  embedding extensions.vector(4096) not null,
  updated_at timestamptz not null default now()
);
alter table public.chat_documents enable row level security;
revoke all on public.chat_documents from anon, authenticated;

-- 코사인 거리로 가까운 문서부터. 문서가 수십 개라 인덱스 없이 전부 비교해요(4096차원은 HNSW 인덱스 한도 초과).
create or replace function public.match_chat_documents(query_embedding extensions.vector(4096), match_count int default 8)
returns table (id text, kind text, product_id text, content text, similarity float)
language sql stable
set search_path = ''
as $$
  select d.id, d.kind, d.product_id, d.content,
         1 - (d.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.chat_documents d
  order by d.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 20)
$$;
revoke execute on function public.match_chat_documents(extensions.vector, int) from public, anon, authenticated;
grant execute on function public.match_chat_documents(extensions.vector, int) to service_role;

-- 챗봇 요청 횟수 제한(IP별). 대화 내용은 저장하지 않아요.
create table public.chat_requests (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index chat_requests_ip_created_at on public.chat_requests (ip, created_at);
alter table public.chat_requests enable row level security;
revoke all on public.chat_requests from anon, authenticated;

select cron.schedule('purge-chat-requests', '45 19 * * *',
  $$delete from public.chat_requests where created_at < now() - interval '1 day'$$);
