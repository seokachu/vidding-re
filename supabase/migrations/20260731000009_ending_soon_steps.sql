-- ============================================================================
-- Vidding 09 — 마감 임박 알림을 기간에 비례한 3단계로 바꾼다
-- 기준: docs/데이터-모델-명세.md §3.10 · §11.3 (개정), F9 3.1
--
--   7일 등록  →  3일 전 · 1일 전 · 1시간 전   (3회)
--   3일 등록  →           1일 전 · 1시간 전   (2회)
--   1일 등록  →                    1시간 전   (1회)
--
-- 경매마다 분기하지 않는다. 단계는 3일·1일·1시간 셋으로 고정이고,
-- **경매 전체 기간보다 짧은 단계만 보낸다**는 조건 하나로 위 표가 나온다.
-- (3일 경매에 '3일 전' 단계를 허용하면 등록되는 순간 발송된다 — 08 에서 겪은 문제다)
--
-- 08 은 단일 3시간 창이었다. 이 파일이 그것을 대체한다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 단계별로 한 번씩 보내야 하므로 type 을 나눈다.
-- 단일 'AUCTION_ENDING_SOON' 은 (user, type, auction) 유니크 때문에 1회만 가능했다.
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    'AUCTION_ENDING_SOON_3D',
    'AUCTION_ENDING_SOON_1D',
    'AUCTION_ENDING_SOON_1H',
    'EPISODE_CREATED',
    'AUCTION_RESULT',
    'CHAT_MESSAGE'
  ));

comment on column public.notifications.type is
  '마감 임박은 AUCTION_ENDING_SOON_% 로 시작한다. F9 3.4 의 경고색은 이 접두어로 판정한다';

-- 단계마다 1건씩 — 3단계면 최대 3건이 쌓인다
drop index public.notifications_once_per_event_idx;

create unique index notifications_once_per_event_idx
  on public.notifications (user_id, type, auction_id)
  where type in (
    'AUCTION_ENDING_SOON_3D',
    'AUCTION_ENDING_SOON_1D',
    'AUCTION_ENDING_SOON_1H',
    'AUCTION_RESULT'
  );

-- ---------------------------------------------------------------------------
-- 한 번에 하나의 단계만 보낸다.
--
-- 마감 30분 전에 사연을 쓴 참여자는 3일·1일·1시간 창을 동시에 만족한다.
-- 세 건을 한꺼번에 보내면 "3일 전이에요"가 30분 전에 도착한다.
-- 그래서 **현재 해당하는 가장 급한 단계 하나만** 고른다.
-- ---------------------------------------------------------------------------
create or replace function public.notify_ending_soon()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
begin
  with candidate as (
    select distinct
      e.user_id,
      a.id    as auction_id,
      a.title as auction_title,
      a.end_at,
      a.created_at
    from public.auctions a
    join public.episodes e on e.auction_id = a.id
    where a.status = 'OPEN'
      and a.end_at > now()
  ),
  picked as (
    select
      c.user_id,
      c.auction_id,
      c.auction_title,
      case
        when c.end_at <= now() + interval '1 hour'
         and c.end_at - c.created_at > interval '1 hour'  then 'AUCTION_ENDING_SOON_1H'
        when c.end_at <= now() + interval '1 day'
         and c.end_at - c.created_at > interval '1 day'   then 'AUCTION_ENDING_SOON_1D'
        when c.end_at <= now() + interval '3 days'
         and c.end_at - c.created_at > interval '3 days'  then 'AUCTION_ENDING_SOON_3D'
      end as step_type
    from candidate c
  )
  insert into public.notifications (user_id, type, title, body, auction_id)
  select
    p.user_id,
    p.step_type,
    l.step_title,
    format('"%s" 경매 마감까지 %s 남았어요.', p.auction_title, l.step_label),
    p.auction_id
  from picked p
  join (values
    ('AUCTION_ENDING_SOON_3D', '마감 3일 전이에요',  '3일'),
    ('AUCTION_ENDING_SOON_1D', '마감 하루 전이에요', '하루'),
    ('AUCTION_ENDING_SOON_1H', '마감 1시간 전이에요', '1시간')
  ) as l(step_type, step_title, step_label) on l.step_type = p.step_type
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.notify_ending_soon() from public, anon, authenticated;
grant execute on function public.notify_ending_soon() to service_role;

-- ---------------------------------------------------------------------------
-- 가장 급한 단계가 1시간이므로 주기를 10분에서 5분으로 줄인다.
-- 1일 등록 경매는 이 단계 하나만 받으므로 도착 시각이 중요하다.
-- ---------------------------------------------------------------------------
select cron.unschedule('vidding-notify-ending-soon')
where exists (select 1 from cron.job where jobname = 'vidding-notify-ending-soon');

select cron.schedule(
  'vidding-notify-ending-soon',
  '*/5 * * * *',
  $CRON$select public.notify_ending_soon();$CRON$
);
