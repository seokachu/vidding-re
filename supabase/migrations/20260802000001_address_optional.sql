-- ---------------------------------------------------------------------------
-- 배송지를 경매 등록의 선행 조건에서 뺀다 (F1 3.2 개정)
--
-- 왜 바꾸나:
--   1. `auctions.address_id` 는 **한 번도 읽히지 않는다.** 경매를 만들 때 쓰고
--      끝이며, 어떤 화면도 이 값을 보여주지 않는다. 유일하게 읽던 곳이
--      "이 배송지는 지울 수 없다"고 막는 FK 였다 — 데이터의 유일한 소비자가
--      그 데이터를 지키는 규칙이었다.
--   2. **주최자 본인의 주소다.** 택배로 보낸다면 정작 필요한 것은 낙찰자의
--      주소인데, 그건 어디에서도 받지 않는다. 발송을 가능하게 해주지 못한다.
--   3. 전달 방법은 **채팅이 정한다** (F6 2). 직거래면 주소 자체가 필요 없다.
--
-- 컬럼을 지우지 않고 nullable 로 두는 이유는, 택배로 보내려는 주최자에게는
-- 발송지 스냅샷으로서 여전히 뜻이 있기 때문이다. 없으면 없는 대로 연다.
-- ---------------------------------------------------------------------------

alter table public.auctions
  alter column address_id drop not null;

-- 배송지 삭제를 막던 근거가 사라졌다. 참조를 끊고 경매는 그대로 둔다.
-- (기존 FK 는 기본 NO ACTION 이라 삭제를 차단했다)
alter table public.auctions
  drop constraint auctions_address_id_fkey;

alter table public.auctions
  add constraint auctions_address_id_fkey
  foreign key (address_id) references public.addresses (id)
  on delete set null;

-- 생성 정책에서 '배송지 보유' 조건을 뺀다. 값이 있을 때 남의 것을 붙이는 것은
-- 여전히 막는다 — 조건이 느슨해진 것이지 사라진 것이 아니다.
drop policy auctions_insert_owner on public.auctions;

create policy auctions_insert_owner on public.auctions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'OPEN'
    and winning_episode_id is null
    and closed_at is null
    and (
      address_id is null
      or exists (
        select 1 from public.addresses
        where id = address_id and user_id = (select auth.uid())
      )
    )
  );

comment on column public.auctions.address_id is
  '발송지 스냅샷(선택). 택배로 보낼 주최자만 채운다 — 등록 요건이 아니다 (F1 3.2)';
