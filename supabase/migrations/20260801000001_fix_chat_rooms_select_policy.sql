-- ============================================================================
-- Vidding 11 — chat_rooms SELECT 정책의 컬럼 참조를 바로잡는다
-- 기준: F6 3.1 (주최자·낙찰자만), docs/데이터-모델-명세.md §6
--
-- ## 증상
--
-- 채팅방이 **둘 이상 생긴 순간부터** 참여자조차 방을 열지 못한다.
--
--   ERROR 21000: more than one row returned by a subquery used as an expression
--
-- 채팅방이 하나뿐일 때는 멀쩡히 동작했다. 그래서 스모크 테스트와 화면 확인을
-- 모두 통과했고, 세 번째 방이 생기고 나서야 드러났다.
--
-- ## 원인 — 서브쿼리 안에서 이름이 다른 테이블에 붙었다
--
-- 03 의 정책은 낙찰자를 이렇게 찾았다.
--
--   (select e.user_id
--      from public.auctions a
--      join public.episodes e on e.id = a.winning_episode_id
--     where a.id = auction_id)          -- ← 여기
--
-- `auction_id` 를 한정하지 않았다. 바깥 `chat_rooms.auction_id` 를 가리키려던
-- 것이지만, 서브쿼리의 FROM 에 있는 **`episodes` 에도 `auction_id` 가 있다.**
-- PostgreSQL 은 가장 안쪽 범위를 먼저 찾으므로 `e.auction_id` 에 붙는다.
--
--   where a.id = e.auction_id
--
-- 조건이 "이 경매의 낙찰 사연"이 아니라 **"자기 경매에 속한 낙찰 사연 전부"** 가
-- 된다. 낙찰된 경매 수만큼 행이 나오고, 단일 값을 기대하는 자리라 터진다.
--
-- ## 고침 — 이미 있는 헬퍼를 쓴다
--
-- `is_chat_participant()` 가 같은 판정을 이미 올바르게 한다. 별칭을 모두
-- 한정했고 `exists` 라 행 수에도 영향을 받지 않는다. messages 정책은 처음부터
-- 이걸 쓰고 있었다 — chat_rooms 만 판정을 두 번 적은 것이 화근이었다.
--
-- **판정은 한 곳에만 둔다.**
-- ============================================================================

drop policy if exists chat_rooms_select_participant on public.chat_rooms;

create policy chat_rooms_select_participant on public.chat_rooms
  for select to authenticated
  using (public.is_chat_participant(id));

comment on policy chat_rooms_select_participant on public.chat_rooms is
  '주최자 또는 낙찰자만 (F6 3.1). 판정은 is_chat_participant() 하나로 모은다';
