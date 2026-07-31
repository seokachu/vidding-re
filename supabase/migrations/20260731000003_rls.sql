-- ============================================================================
-- Vidding 03 — RLS
-- 기준: docs/데이터-모델-명세.md §6, 00-관계-판정 3.5
--
-- 권한은 관계로 판정하고, 그 판정을 DB 가 최종으로 강제한다 (P6).
-- 컬럼 단위 GRANT 를 함께 쓴다 — 정책은 "어느 행"을, GRANT 는 "어느 컬럼"을 막는다.
-- (bid_amount·point_balance·status 를 클라이언트가 직접 쓰지 못하게 하는 장치)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 관계 판정 헬퍼
-- ---------------------------------------------------------------------------

-- 채팅 참여자 = 주최자 또는 낙찰자 (F6 3.1)
create or replace function public.is_chat_participant(p_chat_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_rooms r
    join public.auctions a  on a.id = r.auction_id
    left join public.episodes e on e.id = a.winning_episode_id
    where r.id = p_chat_room_id
      and (select auth.uid()) in (a.user_id, e.user_id)
  );
$$;

-- 공감 가중치 — 주최자 50, 그 외 10 (§11.2)
create or replace function public.like_weight_for(p_episode_id uuid, p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when a.user_id = p_user_id then 50
           else 10
         end
  from public.episodes e
  join public.auctions a on a.id = e.auction_id
  where e.id = p_episode_id;
$$;

-- 참여 가능한 경매인가 — 서버의 마감 시각 판정이 최종이다 (F5 4)
create or replace function public.auction_is_open(p_auction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.auctions
    where id = p_auction_id and status = 'OPEN' and end_at > now()
  );
$$;

alter table public.users             enable row level security;
alter table public.addresses         enable row level security;
alter table public.auctions          enable row level security;
alter table public.episodes          enable row level security;
alter table public.episode_likes     enable row level security;
alter table public.auction_favorites enable row level security;
alter table public.points            enable row level security;
alter table public.chat_rooms        enable row level security;
alter table public.messages          enable row level security;
alter table public.notifications     enable row level security;

-- ---------------------------------------------------------------------------
-- users — 본인 행만. 잔액은 RPC 로만 바뀐다
-- ---------------------------------------------------------------------------
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant update (nick_name, avatar_url) on public.users to authenticated;

create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- addresses — 전부 본인 것만
-- ---------------------------------------------------------------------------
create policy addresses_select_own on public.addresses
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy addresses_insert_own on public.addresses
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy addresses_update_own on public.addresses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy addresses_delete_own on public.addresses
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- auctions — 조회는 전체 공개
--   생성: 로그인 + 본인 배송지 보유 (F1 3.2)
--   수정: 주최자 + 진행중 (F1 3.5 / 4.1) — 소유 여부 외 조건을 더하지 않는다
--   삭제: 주최자 + 사연 0건 (F1 3.6) — 제3자의 기록을 보호한다
-- ---------------------------------------------------------------------------
revoke all on public.auctions from anon, authenticated;
grant select on public.auctions to anon, authenticated;
grant insert on public.auctions to authenticated;
grant delete on public.auctions to authenticated;
grant update (title, description, image_urls, end_at, address_id) on public.auctions to authenticated;

create policy auctions_select_all on public.auctions
  for select
  using (true);

create policy auctions_insert_owner on public.auctions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'OPEN'
    and winning_episode_id is null
    and closed_at is null
    and exists (
      select 1 from public.addresses
      where id = address_id and user_id = (select auth.uid())
    )
  );

create policy auctions_update_owner on public.auctions
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'OPEN')
  with check ((select auth.uid()) = user_id and status = 'OPEN');

create policy auctions_delete_owner_when_empty on public.auctions
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (select 1 from public.episodes where auction_id = auctions.id)
  );

-- ---------------------------------------------------------------------------
-- episodes — 조회는 전체 공개
--   생성: 로그인 + 주최자가 아님 + 경매 진행중 (F3 3.2)
--   수정: 작성자 본인 + 경매 진행중. bid_amount 는 place_bid() 로만 바뀐다
--   삭제: 정책 없음 — delete_episode() 로만 지운다 (반환 처리를 건너뛸 수 없게)
-- ---------------------------------------------------------------------------
revoke all on public.episodes from anon, authenticated;
grant select on public.episodes to anon, authenticated;
grant insert on public.episodes to authenticated;
grant update (title, content) on public.episodes to authenticated;

create policy episodes_select_all on public.episodes
  for select
  using (true);

create policy episodes_insert_participant on public.episodes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and bid_amount = 0                                   -- 입찰은 place_bid() 로만
    and public.auction_is_open(auction_id)
    and (select auth.uid()) <> (select user_id from public.auctions where id = auction_id)
  );

create policy episodes_update_author on public.episodes
  for update to authenticated
  using ((select auth.uid()) = user_id and public.auction_is_open(auction_id))
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- episode_likes — 조회는 전체 공개
--   생성: 로그인 + 자기 사연 아님 + 경매 진행중, weight 는 관계로 결정된다
--   삭제: 본인 행 + 경매 진행중 (마감 후에는 결과를 바꿀 수 없다, F5 3.4)
-- ---------------------------------------------------------------------------
create policy episode_likes_select_all on public.episode_likes
  for select
  using (true);

create policy episode_likes_insert_own on public.episode_likes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and weight = public.like_weight_for(episode_id, (select auth.uid()))
    and (select auth.uid()) <> (select user_id from public.episodes where id = episode_id)
    and public.auction_is_open((select auction_id from public.episodes where id = episode_id))
  );

create policy episode_likes_delete_own on public.episode_likes
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and public.auction_is_open((select auction_id from public.episodes where id = episode_id))
  );

-- ---------------------------------------------------------------------------
-- auction_favorites — 본인 것만 보인다. 찜 수는 공개 지표가 아니다 (F7)
--   생성: 로그인 + 주최자가 아님. 마감 여부와 무관하다 (개인 북마크)
-- ---------------------------------------------------------------------------
create policy auction_favorites_select_own on public.auction_favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy auction_favorites_insert_own on public.auction_favorites
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.uid()) <> (select user_id from public.auctions where id = auction_id)
  );

create policy auction_favorites_delete_own on public.auction_favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- points — 본인 것만 조회. 쓰기는 RPC 로만 (append-only, P4)
-- ---------------------------------------------------------------------------
revoke all on public.points from anon, authenticated;
grant select on public.points to authenticated;

create policy points_select_own on public.points
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- chat_rooms — 주최자 또는 낙찰자만. 생성은 close_auction() 으로만
-- ---------------------------------------------------------------------------
revoke all on public.chat_rooms from anon, authenticated;
grant select on public.chat_rooms to authenticated;

create policy chat_rooms_select_participant on public.chat_rooms
  for select to authenticated
  using (
    (select auth.uid()) in (
      (select user_id from public.auctions where id = auction_id),
      (select e.user_id
         from public.auctions a
         join public.episodes e on e.id = a.winning_episode_id
        where a.id = auction_id)
    )
  );

-- ---------------------------------------------------------------------------
-- messages — 해당 방 참여자만. read_at 은 mark_messages_read() 로 갱신한다
-- ---------------------------------------------------------------------------
revoke all on public.messages from anon, authenticated;
grant select, insert, delete on public.messages to authenticated;
grant update (content) on public.messages to authenticated;

create policy messages_select_participant on public.messages
  for select to authenticated
  using (public.is_chat_participant(chat_room_id));

create policy messages_insert_participant on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_chat_participant(chat_room_id)
  );

create policy messages_update_sender on public.messages
  for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

create policy messages_delete_sender on public.messages
  for delete to authenticated
  using ((select auth.uid()) = sender_id);

-- ---------------------------------------------------------------------------
-- notifications — 본인 것만 조회, 읽음 처리만 가능. 생성은 서버(트리거·RPC)만
-- ---------------------------------------------------------------------------
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy notifications_update_own on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
