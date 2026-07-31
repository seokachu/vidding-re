-- ============================================================================
-- Vidding 08 — 마감 임박 기준을 24시간에서 3시간으로 좁힌다
-- 기준: docs/데이터-모델-명세.md §11.3 (개정)
--
-- 경매 기간 선택지가 3·7·14일에서 **1·3·7일**로 바뀌었다.
-- 임박 기준이 24시간이면 **1일 경매는 등록되는 순간 임박 상태**가 되고
-- 알림도 즉시 나간다. 임박이라는 말이 의미를 잃는다.
--
-- 크론은 10분 주기이므로 3시간 창을 놓치지 않는다.
-- 중복은 notifications 의 부분 유니크 인덱스가 막는다 (§3.10).
-- ============================================================================

create or replace function public.notify_ending_soon()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
begin
  with target as (
    select distinct e.user_id, a.id as auction_id, a.title, a.end_at
    from public.auctions a
    join public.episodes e on e.auction_id = a.id
    where a.status = 'OPEN'
      and a.end_at > now()
      and a.end_at <= now() + interval '3 hours'
  )
  insert into public.notifications (user_id, type, title, body, auction_id)
  select
    t.user_id,
    'AUCTION_ENDING_SOON',
    '마감이 다가와요',
    format('"%s" 경매가 곧 마감돼요.', t.title),
    t.auction_id
  from target t
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.notify_ending_soon() from public, anon, authenticated;
grant execute on function public.notify_ending_soon() to service_role;
