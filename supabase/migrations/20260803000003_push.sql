-- ============================================================================
-- Vidding — 웹 푸시 (F9 확장)
--
-- 브라우저 푸시 구독을 저장하고, notifications INSERT 마다 발송 웹훅을 부른다.
-- 발송 경로: INSERT 트리거 → pg_net HTTP POST → /api/push (Next 라우트)
--            → web-push 로 각 브라우저에 전달.
--
-- 발송 주소·시크릿은 **Vault 에 둔다** — 저장소가 공개라 여기 쓸 수 없다.
-- 대시보드 SQL Editor 에서 한 번 실행한다:
--
--   select vault.create_secret('https://vidding-re.vercel.app/api/push', 'push_webhook_url');
--   select vault.create_secret('<PUSH_WEBHOOK_SECRET 값>',               'push_webhook_secret');
--
-- 둘 중 하나라도 없으면 트리거는 조용히 지나간다 (푸시 미설정 상태).
-- ============================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- 구독 — 한 사용자가 브라우저·기기마다 하나씩 가진다
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  -- 푸시 서비스가 발급한 주소. 브라우저·기기마다 다르고 그 자체로 유일하다
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

grant select, insert, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 같은 브라우저에서 계정을 갈아타면 endpoint 의 주인이 바뀐다. 이전 계정의
-- 행이 남아 있으면 UNIQUE 에 걸려 새 구독을 넣을 수 없는데, RLS 는 남의 행을
-- 지우지 못하게 한다. endpoint 는 추측할 수 없는 값이라 **정확한 값을 아는
-- 쪽이 곧 그 브라우저의 주인이다** — definer 로 지워도 안전하다.
create or replace function public.claim_push_endpoint(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke execute on function public.claim_push_endpoint(text) from public, anon;
grant execute on function public.claim_push_endpoint(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 발송 트리거
-- ---------------------------------------------------------------------------

-- 알림 내용과 받는 사람의 구독 목록을 **통째로** 웹훅에 넘긴다.
-- 라우트가 DB 를 다시 읽지 않게 하기 위해서다 — service role 키를
-- Vercel 에 두지 않는다는 방침(.env.example)이 그대로 유지된다.
create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
  v_subs   jsonb;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_webhook_secret';

  if v_url is null or v_secret is null then
    return new;  -- 푸시 미설정. 알림 생성은 그대로 진행한다
  end if;

  select jsonb_agg(jsonb_build_object(
           'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
    into v_subs
    from public.push_subscriptions s
   where s.user_id = new.user_id;

  if v_subs is null then
    return new;  -- 구독한 브라우저가 없다
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body    := jsonb_build_object(
      'title',         new.title,
      'body',          new.body,
      'auction_id',    new.auction_id,
      'chat_room_id',  new.chat_room_id,
      'subscriptions', v_subs
    )
  );

  return new;
exception
  when others then
    -- 푸시는 부가 기능이다. 실패해도 알림 생성을 막지 않는다
    raise warning 'notify_push 실패 (notification_id=%): %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.notify_push();
