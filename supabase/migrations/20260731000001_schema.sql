-- ============================================================================
-- Vidding 01 — 테이블 · 인덱스
-- 기준: docs/데이터-모델-명세.md §3, §8
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 공통 트리거 함수 — updated_at 자동 갱신
-- created_at 은 절대 건드리지 않는다 (F5 3.2.1 동점 판정 기준)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3.1 users — 계정
-- role 컬럼이 없다. 권한은 관계로 판정한다 (P1, 00-관계-판정)
-- ---------------------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text        not null unique,
  nick_name     text        not null,
  avatar_url    text,
  point_balance integer     not null default 0 check (point_balance >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

comment on table  public.users is '계정. 사용자 유형(role) 개념이 존재하지 않는다 (P1)';
comment on column public.users.point_balance is '보유 포인트 잔액의 단일 출처. points 를 합산하지 않는다';

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3.2 addresses — 배송지 (사용자당 1개)
-- ---------------------------------------------------------------------------
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null unique references public.users (id) on delete cascade,
  recipient  text        not null check (char_length(btrim(recipient)) > 0),
  phone      text        not null check (char_length(btrim(phone)) > 0),
  zipcode    text        not null check (char_length(btrim(zipcode)) > 0),
  address1   text        not null check (char_length(btrim(address1)) > 0),
  address2   text,
  created_at timestamptz not null default now()
);

comment on table public.addresses is '배송지. UNIQUE(user_id) 로 사용자당 1개만 존재한다 (F12 3.3)';

-- ---------------------------------------------------------------------------
-- 3.3 auctions — 경매
-- 상태는 OPEN / CLOSED 둘뿐이다. 마감 임박은 end_at 으로 계산하는 파생 상태 (P5)
-- 입찰 포인트 컬럼이 없다. 입찰 단계는 전 서비스 공통 상수 (§11.1)
-- ---------------------------------------------------------------------------
create table public.auctions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid        not null references public.users (id),
  address_id         uuid        not null references public.addresses (id),
  title              text        not null check (char_length(btrim(title)) > 0),
  description        text        not null check (char_length(btrim(description)) > 0),
  image_urls         text[]      not null check (
                       array_length(image_urls, 1) between 1 and 3
                       and array_position(image_urls, null) is null
                     ),
  end_at             timestamptz not null,
  status             text        not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  winning_episode_id uuid,  -- FK 는 episodes 생성 후 아래에서 추가 (순환 참조)
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,

  constraint auctions_closed_consistency check (
    (status = 'OPEN'   and closed_at is null and winning_episode_id is null)
    or status = 'CLOSED'
  )
);

comment on column public.auctions.user_id is '주최자. 관계 판정의 기준 (00-관계-판정 3.2)';
comment on column public.auctions.image_urls is '순서가 의미를 갖고 동시 수정 주체가 주최자 한 명이라 배열을 유지한다 (P3 예외)';

create trigger auctions_set_updated_at
  before update on public.auctions
  for each row execute function public.set_updated_at();

create index auctions_status_end_at_idx on public.auctions (status, end_at);
create index auctions_user_id_idx       on public.auctions (user_id);
create index auctions_created_at_idx    on public.auctions (created_at desc);

-- ---------------------------------------------------------------------------
-- 3.4 episodes — 사연 (입찰)
-- ---------------------------------------------------------------------------
create table public.episodes (
  id         uuid primary key default gen_random_uuid(),
  auction_id uuid        not null references public.auctions (id) on delete cascade,
  user_id    uuid        not null references public.users (id),
  title      text        not null check (char_length(btrim(title))   between 2 and 50),
  content    text        not null check (char_length(btrim(content)) between 5 and 1000),
  bid_amount integer     not null default 0 check (bid_amount in (0, 1000, 1500, 2000, 2500, 3000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint episodes_one_per_auction unique (auction_id, user_id)
);

comment on constraint episodes_one_per_auction on public.episodes is '한 경매에 사연 1개 (F3 3.2) + 참여자 관계 판정용 인덱스 (00-관계-판정 3.2)';
comment on column public.episodes.bid_amount is '본인이 직접 건 포인트 누적액. 공감 가중치는 포함하지 않는다';
comment on column public.episodes.created_at is '낙찰 동점 판정 기준 (F5 3.2.1). 수정해도 갱신하지 않는다';

create trigger episodes_set_updated_at
  before update on public.episodes
  for each row execute function public.set_updated_at();

create index episodes_auction_created_idx on public.episodes (auction_id, created_at);
create index episodes_user_id_idx         on public.episodes (user_id);

-- 순환 FK — auctions.winning_episode_id → episodes.id
alter table public.auctions
  add constraint auctions_winning_episode_id_fkey
  foreign key (winning_episode_id) references public.episodes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3.5 episode_likes — 공감
-- 배열이 아니라 조인 테이블이다. 동시 조작으로 값이 어긋나지 않는다 (§7.1)
-- ---------------------------------------------------------------------------
create table public.episode_likes (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid        not null references public.episodes (id) on delete cascade,
  user_id    uuid        not null references public.users (id) on delete cascade,
  weight     integer     not null check (weight in (10, 50)),
  created_at timestamptz not null default now(),

  constraint episode_likes_once unique (episode_id, user_id)
);

comment on column public.episode_likes.weight is '부여 시점의 가중치. 주최자 50 / 그 외 10. 해제 시 같은 값이 차감되는 것을 구조적으로 보장한다 (F4)';

-- ---------------------------------------------------------------------------
-- 3.6 auction_favorites — 찜 (개인 북마크. 공개 지표가 아니다)
-- ---------------------------------------------------------------------------
create table public.auction_favorites (
  id         uuid primary key default gen_random_uuid(),
  auction_id uuid        not null references public.auctions (id) on delete cascade,
  user_id    uuid        not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint auction_favorites_once unique (auction_id, user_id)
);

create index auction_favorites_user_id_idx on public.auction_favorites (user_id);

-- ---------------------------------------------------------------------------
-- 3.7 points — 포인트 원장 (append-only, P4)
-- ---------------------------------------------------------------------------
create table public.points (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users (id) on delete cascade,
  amount        integer     not null check (amount <> 0),
  balance_after integer     not null check (balance_after >= 0),
  type          text        not null check (type in (
                  'SIGNUP_BONUS',
                  'BID',
                  'BID_REFUND_LOST',
                  'BID_REFUND_VOID',
                  'BID_REFUND_CANCEL',
                  'WIN_TRANSFER'
                )),
  auction_id    uuid        references public.auctions (id) on delete set null,
  episode_id    uuid        references public.episodes (id) on delete set null,
  description   text        not null,
  created_at    timestamptz not null default now(),

  -- 부호 규칙 (§3.7 type 표) — BID 만 차감이다
  constraint points_sign check (
    (type = 'BID' and amount < 0) or (type <> 'BID' and amount > 0)
  )
);

comment on table public.points is '포인트 원장. 한 번 쌓인 행은 수정·삭제하지 않는다 (P4)';

create index points_user_created_idx on public.points (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3.8 chat_rooms — 경매당 1개. 참여자 컬럼이 없다 (경매에서 도출, P2)
-- ---------------------------------------------------------------------------
create table public.chat_rooms (
  id         uuid primary key default gen_random_uuid(),
  auction_id uuid        not null unique references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.chat_rooms is '주최자 = auctions.user_id, 낙찰자 = winning_episode 의 작성자. 참여자를 저장하지 않는다 (F6 3.2)';

-- ---------------------------------------------------------------------------
-- 3.9 messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  chat_room_id uuid        not null references public.chat_rooms (id) on delete cascade,
  sender_id    uuid        not null references public.users (id),
  content      text        not null check (char_length(btrim(content)) >= 1),
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

comment on column public.messages.read_at is 'NULL 이면 읽지 않은 메시지다. 별도 플래그를 두지 않는다';

create index messages_room_created_idx on public.messages (chat_room_id, created_at);

-- ---------------------------------------------------------------------------
-- 3.10 notifications
-- 대상이 삭제돼도 알림은 남는다 (F9 4) → auction_id / chat_room_id 는 SET NULL
-- ---------------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  type         text        not null check (type in (
                 'AUCTION_ENDING_SOON',
                 'EPISODE_CREATED',
                 'AUCTION_RESULT',
                 'CHAT_MESSAGE'
               )),
  title        text        not null,
  body         text        not null,
  auction_id   uuid        references public.auctions (id) on delete set null,
  chat_room_id uuid        references public.chat_rooms (id) on delete set null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx  on public.notifications (user_id) where read_at is null;

-- 중복 발송 방지 (F9 3.3) — 반복 발생하는 CHAT_MESSAGE 는 제외한다
create unique index notifications_once_per_event_idx
  on public.notifications (user_id, type, auction_id)
  where type in ('AUCTION_ENDING_SOON', 'AUCTION_RESULT');
