-- ============================================================================
-- Vidding 10 — 단계를 지난 뒤 참여한 사람에게는 그 단계를 보내지 않는다
-- 기준: docs/데이터-모델-명세.md §11.3 (개정), F9 3.1
--
-- 09 는 "가장 급한 단계 하나만" 보내도록 했지만, 마감 30분 전에 사연을 쓴
-- 참여자에게 여전히 '1시간 전' 알림이 갔다. 두 가지가 잘못됐다.
--
--   1. 방금 참여한 사람은 마감이 임박한 것을 이미 안다. 알림이 아니라 소음이다
--   2. 실제로는 30분 남았는데 "1시간 전"이라고 알린다. 문구가 사실과 다르다
--
-- 마감 임박 알림은 **잊고 있을 수 있는 사람을 깨우는 것**이다 (F9 2).
-- 그 단계를 지난 뒤에 들어온 사람은 깨울 대상이 아니다.
--
--   episodes.created_at < auctions.end_at - 단계
--   (해당 단계 시점보다 먼저 참여했는가)
--
-- episodes.created_at 은 수정해도 갱신하지 않으므로(F5 3.2.1) 기준으로 안전하다.
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
  with candidate as (
    select
      e.user_id,
      a.id         as auction_id,
      a.title      as auction_title,
      a.end_at,
      a.created_at as auction_created_at,
      e.created_at as joined_at
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
         and c.end_at - c.auction_created_at > interval '1 hour'
         and c.joined_at < c.end_at - interval '1 hour'  then 'AUCTION_ENDING_SOON_1H'
        when c.end_at <= now() + interval '1 day'
         and c.end_at - c.auction_created_at > interval '1 day'
         and c.joined_at < c.end_at - interval '1 day'   then 'AUCTION_ENDING_SOON_1D'
        when c.end_at <= now() + interval '3 days'
         and c.end_at - c.auction_created_at > interval '3 days'
         and c.joined_at < c.end_at - interval '3 days'  then 'AUCTION_ENDING_SOON_3D'
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
-- '가장 급한 단계 하나만' 규칙(09)은 그대로 둔다.
-- 정상 운영에서는 단계마다 크론이 먼저 처리하므로 겹칠 일이 없지만,
-- 크론이 며칠 멈췄다 재개하면 한 사람이 세 단계를 동시에 만족한다.
-- 그때 "3일 전이에요"를 30분 전에 보내지 않으려면 이 규칙이 필요하다.
-- ---------------------------------------------------------------------------
