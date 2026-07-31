-- ============================================================================
-- Vidding 02 — 뷰
-- 기준: docs/데이터-모델-명세.md §5
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 v_episode_scores — 사연 최종 점수
-- 점수를 저장하지 않고 집계한다. 연타·동시 조작으로 값이 어긋날 수 없다 (F4 6)
--
--   최종 정렬: ORDER BY total_score DESC, created_at ASC, episode_id ASC
--   (F5 3.2.1 동점 → 먼저 작성한 사연. 작성 시각까지 같으면 식별자로 결정론적 판정)
-- ---------------------------------------------------------------------------
create view public.v_episode_scores
with (security_invoker = on) as
select
  e.id                                as episode_id,
  e.auction_id,
  e.user_id,
  e.bid_amount,
  coalesce(l.weight_sum, 0)           as like_weight_sum,
  e.bid_amount + coalesce(l.weight_sum, 0) as total_score,
  coalesce(l.like_count, 0)           as like_count,
  e.created_at
from public.episodes e
left join (
  select
    episode_id,
    sum(weight)::integer as weight_sum,
    count(*)::integer    as like_count
  from public.episode_likes
  group by episode_id
) l on l.episode_id = e.id;

comment on view public.v_episode_scores is '낙찰자 선정과 랭킹 표시 모두 이 뷰를 쓴다 (§5.1)';

-- ---------------------------------------------------------------------------
-- 5.2 v_auction_summary — 목록·카드용
-- 찜 수는 포함하지 않는다. 공개 지표가 아니다 (F7)
-- 인기순 기준은 모인 사연 수다
-- ---------------------------------------------------------------------------
create view public.v_auction_summary
with (security_invoker = on) as
select
  a.id                            as auction_id,
  a.user_id,
  a.title,
  a.image_urls[1]                 as thumbnail,
  a.end_at,
  a.status,
  a.closed_at,
  a.winning_episode_id,
  a.created_at,
  coalesce(s.episode_count, 0)    as episode_count,
  coalesce(s.top_score, 0)        as top_score
from public.auctions a
left join (
  select
    auction_id,
    count(*)::integer      as episode_count,
    max(total_score)::integer as top_score
  from public.v_episode_scores
  group by auction_id
) s on s.auction_id = a.id;

comment on view public.v_auction_summary is '정렬 기준: 마감 임박순 end_at ASC (기본) / 인기순 episode_count DESC / 최신순 created_at DESC (F2)';

-- ---------------------------------------------------------------------------
-- v_user_profiles — 공개 프로필
--
-- users 는 email·point_balance 를 담고 있어 본인 행만 조회할 수 있다 (§6 확장).
-- 사연 목록 등에 노출되는 닉네임·아바타만 이 뷰로 분리해 공개한다.
-- security_invoker 를 끄고(소유자 권한) users 의 RLS 를 우회하되,
-- 노출 컬럼을 3개로 한정해 개인정보는 새어나가지 않는다 (F3 3.6).
-- ---------------------------------------------------------------------------
create view public.v_user_profiles
with (security_invoker = off) as
select
  u.id,
  u.nick_name,
  u.avatar_url
from public.users u;

comment on view public.v_user_profiles is '공개 프로필. 이메일·잔액은 노출하지 않는다';

grant select on public.v_episode_scores  to anon, authenticated;
grant select on public.v_auction_summary to anon, authenticated;
grant select on public.v_user_profiles   to anon, authenticated;
