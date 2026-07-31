-- ============================================================================
-- Vidding 04 — 트랜잭션 처리 (RPC) · 트리거
-- 기준: docs/데이터-모델-명세.md §4, §10
--
-- 여러 테이블을 원자적으로 바꾸는 처리는 전부 여기 있다.
-- 클라이언트는 이 함수들을 통해서만 포인트와 낙찰 상태를 바꿀 수 있다.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- §10 가입 보너스 — 가입 시점 트리거로 지급한다 (크론이 아니다)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nick_name text;
  v_user_id   uuid;
begin
  v_nick_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nick_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'),      ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1),   ''),
    '이름없음'
  );

  insert into public.users (id, email, nick_name, avatar_url, point_balance)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@no-email.local'),
    v_nick_name,
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    5000
  )
  on conflict (id) do nothing
  returning id into v_user_id;

  -- 이미 계정 행이 있으면 보너스를 다시 주지 않는다
  if v_user_id is not null then
    insert into public.points (user_id, amount, balance_after, type, description)
    values (new.id, 5000, 5000, 'SIGNUP_BONUS', '가입 축하 포인트');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- §4.1 place_bid — 포인트 입찰
-- 올리기만 가능하다. 차액만 차감한다 (F3 3.3)
-- ---------------------------------------------------------------------------
create or replace function public.place_bid(p_episode_id uuid, p_new_amount integer)
returns public.episodes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_episode  public.episodes;
  v_auction  public.auctions;
  v_diff     integer;
  v_balance  integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501', detail = '로그인이 필요합니다';
  end if;

  -- 1) 사연 잠금 + 2) 작성자 확인
  select * into v_episode from public.episodes where id = p_episode_id for update;
  if not found then
    raise exception 'EPISODE_NOT_FOUND' using errcode = 'P0002', detail = '사연을 찾을 수 없습니다';
  end if;
  if v_episode.user_id <> v_uid then
    raise exception 'NOT_EPISODE_AUTHOR' using errcode = '42501', detail = '본인 사연에만 입찰할 수 있습니다';
  end if;

  -- 1) 경매가 OPEN 이고 마감 이전인지 — 서버 판정이 최종이다 (F5 4)
  select * into v_auction from public.auctions where id = v_episode.auction_id for share;
  if v_auction.status <> 'OPEN' or v_auction.end_at <= now() then
    raise exception 'AUCTION_CLOSED' using errcode = 'P0001', detail = '경매가 마감되었습니다';
  end if;

  -- 3) 고정 입찰 단계 (§11.1)
  if p_new_amount not in (1000, 1500, 2000, 2500, 3000) then
    raise exception 'INVALID_BID_STEP' using errcode = 'P0001', detail = '허용되지 않는 입찰 단계입니다';
  end if;

  -- 4) 올리기만 가능
  if p_new_amount <= v_episode.bid_amount then
    raise exception 'BID_MUST_INCREASE' using errcode = 'P0001', detail = '이미 같거나 더 높은 단계로 입찰했습니다';
  end if;

  v_diff := p_new_amount - v_episode.bid_amount;

  -- 5) 잔액 확인
  select point_balance into v_balance from public.users where id = v_uid for update;
  if v_balance < v_diff then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001', detail = '보유 포인트가 부족합니다';
  end if;

  -- 6) 사연 입찰액 갱신
  update public.episodes
     set bid_amount = p_new_amount
   where id = p_episode_id
  returning * into v_episode;

  -- 7) 잔액 차감
  update public.users
     set point_balance = point_balance - v_diff
   where id = v_uid
  returning point_balance into v_balance;

  -- 8) 원장 기록
  insert into public.points (user_id, amount, balance_after, type, auction_id, episode_id, description)
  values (v_uid, -v_diff, v_balance, 'BID', v_auction.id, p_episode_id, '사연 입찰');

  return v_episode;
end;
$$;

-- ---------------------------------------------------------------------------
-- §4.3 delete_episode — 사연 삭제
--   OPEN            → 전액 반환 후 삭제 (BID_REFUND_CANCEL)
--   CLOSED + 미낙찰  → 반환 없이 삭제 (마감 시 이미 반환됨)
--   CLOSED + 낙찰    → 거부 (F3 3.4)
-- ---------------------------------------------------------------------------
create or replace function public.delete_episode(p_episode_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_episode public.episodes;
  v_auction public.auctions;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501', detail = '로그인이 필요합니다';
  end if;

  select * into v_episode from public.episodes where id = p_episode_id for update;
  if not found then
    raise exception 'EPISODE_NOT_FOUND' using errcode = 'P0002', detail = '사연을 찾을 수 없습니다';
  end if;
  if v_episode.user_id <> v_uid then
    raise exception 'NOT_EPISODE_AUTHOR' using errcode = '42501', detail = '본인 사연만 삭제할 수 있습니다';
  end if;

  select * into v_auction from public.auctions where id = v_episode.auction_id for update;

  if v_auction.winning_episode_id = p_episode_id then
    raise exception 'WINNING_EPISODE' using errcode = 'P0001', detail = '낙찰된 사연은 지울 수 없어요';
  end if;

  -- 진행중인 경매에서만 반환한다. 마감된 경매는 이미 반환이 끝났다
  if v_auction.status = 'OPEN' and v_episode.bid_amount > 0 then
    update public.users
       set point_balance = point_balance + v_episode.bid_amount
     where id = v_uid
    returning point_balance into v_balance;

    insert into public.points (user_id, amount, balance_after, type, auction_id, episode_id, description)
    values (v_uid, v_episode.bid_amount, v_balance, 'BID_REFUND_CANCEL', v_auction.id, p_episode_id, '사연 삭제로 입찰 포인트 반환');
  end if;

  delete from public.episodes where id = p_episode_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- §4.4 toggle_episode_like — 공감
-- 점수를 직접 더하거나 빼지 않는다. 집계는 v_episode_scores 가 한다
-- ---------------------------------------------------------------------------
create or replace function public.toggle_episode_like(p_episode_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_episode public.episodes;
  v_auction public.auctions;
  v_weight  integer;
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501', detail = '로그인이 필요합니다';
  end if;

  select * into v_episode from public.episodes where id = p_episode_id;
  if not found then
    raise exception 'EPISODE_NOT_FOUND' using errcode = 'P0002', detail = '사연을 찾을 수 없습니다';
  end if;
  if v_episode.user_id = v_uid then
    raise exception 'SELF_LIKE' using errcode = 'P0001', detail = '자기 사연에는 공감할 수 없습니다';
  end if;

  select * into v_auction from public.auctions where id = v_episode.auction_id;
  if v_auction.status <> 'OPEN' or v_auction.end_at <= now() then
    raise exception 'AUCTION_CLOSED' using errcode = 'P0001', detail = '경매가 마감되었습니다';
  end if;

  -- 주최자의 공감은 50, 그 외는 10 (§11.2). 부여 시점 값을 함께 저장한다
  v_weight := case when v_auction.user_id = v_uid then 50 else 10 end;

  delete from public.episode_likes
   where episode_id = p_episode_id and user_id = v_uid;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    return false;
  end if;

  insert into public.episode_likes (episode_id, user_id, weight)
  values (p_episode_id, v_uid, v_weight)
  on conflict (episode_id, user_id) do nothing;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- §4.2 close_auction — 마감 처리
-- 1~6 이 한 트랜잭션이다. 7(알림)은 실패해도 롤백하지 않는다
-- ---------------------------------------------------------------------------
create or replace function public.close_auction(p_auction_id uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auction        public.auctions;
  v_win_episode_id uuid;
  v_win_user_id    uuid;
  v_win_bid        integer;
  v_row            record;
  v_balance        integer;
  v_deducted       integer := 0;
  v_refunded       integer := 0;
  v_transferred    integer := 0;
  v_refund_type    text;
  v_chat_room_id   uuid;
  v_title          text;
  v_body           text;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then
    raise exception 'AUCTION_NOT_FOUND' using errcode = 'P0002', detail = '경매를 찾을 수 없습니다';
  end if;

  -- 이미 처리된 경매는 조용히 무시한다 (§9 중복 방지)
  if v_auction.status <> 'OPEN' then
    return v_auction;
  end if;
  if v_auction.end_at > now() then
    raise exception 'AUCTION_NOT_DUE' using errcode = 'P0001', detail = '아직 마감 시각이 되지 않았습니다';
  end if;

  -- 2) 낙찰 사연 — 점수 > 작성 시각 > 식별자 (F5 3.2.1 · 4)
  select s.episode_id, s.user_id, s.bid_amount
    into v_win_episode_id, v_win_user_id, v_win_bid
  from public.v_episode_scores s
  where s.auction_id = p_auction_id
  order by s.total_score desc, s.created_at asc, s.episode_id asc
  limit 1;

  -- 5) 사연 0건이면 유찰
  v_refund_type := case when v_win_episode_id is null
                        then 'BID_REFUND_VOID'
                        else 'BID_REFUND_LOST'
                   end;

  select coalesce(sum(bid_amount), 0) into v_deducted
  from public.episodes where auction_id = p_auction_id;

  -- 3) 미낙찰 참여자 반환 (유찰이면 참여자 전원)
  for v_row in
    select e.id, e.user_id, e.bid_amount
    from public.episodes e
    where e.auction_id = p_auction_id
      and e.bid_amount > 0
      and (v_win_episode_id is null or e.id <> v_win_episode_id)
    order by e.created_at
  loop
    update public.users
       set point_balance = point_balance + v_row.bid_amount
     where id = v_row.user_id
    returning point_balance into v_balance;

    insert into public.points (user_id, amount, balance_after, type, auction_id, episode_id, description)
    values (
      v_row.user_id, v_row.bid_amount, v_balance, v_refund_type, p_auction_id, v_row.id,
      case when v_refund_type = 'BID_REFUND_VOID'
           then '유찰로 입찰 포인트 반환'
           else '미낙찰로 입찰 포인트 반환'
      end
    );

    v_refunded := v_refunded + v_row.bid_amount;
  end loop;

  -- 4) 주최자가 낙찰자의 입찰 포인트를 수취한다 (F5 3.5)
  if v_win_episode_id is not null and v_win_bid > 0 then
    update public.users
       set point_balance = point_balance + v_win_bid
     where id = v_auction.user_id
    returning point_balance into v_balance;

    insert into public.points (user_id, amount, balance_after, type, auction_id, episode_id, description)
    values (v_auction.user_id, v_win_bid, v_balance, 'WIN_TRANSFER', p_auction_id, v_win_episode_id, '낙찰 사연의 입찰 포인트 수취');

    v_transferred := v_win_bid;
  end if;

  -- 포인트 총량 검증 (F5 5-2) — 반환 + 이전 = 차감 총액
  if v_refunded + v_transferred <> v_deducted then
    raise exception 'POINT_CONSERVATION_VIOLATED'
      using errcode = 'P0001',
            detail = format('deducted=%s refunded=%s transferred=%s', v_deducted, v_refunded, v_transferred);
  end if;

  -- 1) 마감 확정
  update public.auctions
     set status             = 'CLOSED',
         closed_at          = now(),
         winning_episode_id = v_win_episode_id
   where id = p_auction_id
  returning * into v_auction;

  -- 6) 낙찰이 있을 때만 채팅방을 만든다 (F6 3.2)
  if v_win_episode_id is not null then
    insert into public.chat_rooms (auction_id)
    values (p_auction_id)
    on conflict (auction_id) do nothing
    returning id into v_chat_room_id;

    if v_chat_room_id is null then
      select id into v_chat_room_id from public.chat_rooms where auction_id = p_auction_id;
    end if;
  end if;

  -- 7) 알림 — 실패해도 낙찰 확정을 되돌리지 않는다 (F5 4 · F9 4)
  begin
    -- 주최자
    if v_win_episode_id is null then
      v_title := '유찰되었습니다';
      v_body  := format('"%s" 경매가 참여자가 없어 유찰되었어요.', v_auction.title);
    else
      v_title := '낙찰자가 정해졌어요';
      v_body  := format('"%s" 경매의 사연이 선정되었어요. 채팅으로 전달 방법을 논의해보세요.', v_auction.title);
    end if;

    insert into public.notifications (user_id, type, title, body, auction_id, chat_room_id)
    values (v_auction.user_id, 'AUCTION_RESULT', v_title, v_body, p_auction_id, v_chat_room_id)
    on conflict do nothing;

    -- 참여자 전원
    for v_row in
      select e.user_id, e.id from public.episodes e where e.auction_id = p_auction_id
    loop
      if v_row.id = v_win_episode_id then
        v_title := '사연이 낙찰되었어요';
        v_body  := format('"%s" 경매에서 회원님의 사연이 선정되었어요. 채팅으로 전달 방법을 논의해보세요.', v_auction.title);
      elsif v_win_episode_id is null then
        v_title := '경매가 유찰되었어요';
        v_body  := format('"%s" 경매가 유찰되어 입찰 포인트를 돌려드렸어요.', v_auction.title);
      else
        v_title := '경매가 마감되었어요';
        v_body  := format('"%s" 경매의 결과가 나왔어요. 입찰 포인트는 돌려드렸어요.', v_auction.title);
      end if;

      insert into public.notifications (user_id, type, title, body, auction_id, chat_room_id)
      values (
        v_row.user_id, 'AUCTION_RESULT', v_title, v_body, p_auction_id,
        case when v_row.id = v_win_episode_id then v_chat_room_id else null end
      )
      on conflict do nothing;
    end loop;
  exception
    when others then
      raise warning 'close_auction: 알림 생성 실패 (auction_id=%): %', p_auction_id, sqlerrm;
  end;

  return v_auction;
end;
$$;

-- ---------------------------------------------------------------------------
-- §9 마감 대상 일괄 처리 — pg_cron 이 1분마다 호출한다
-- 한 건이 실패해도 나머지는 계속 처리한다
-- ---------------------------------------------------------------------------
create or replace function public.close_due_auctions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   record;
  v_count integer := 0;
begin
  for v_row in
    select id from public.auctions
    where status = 'OPEN' and end_at <= now()
    order by end_at
    limit 500
  loop
    begin
      perform public.close_auction(v_row.id);
      v_count := v_count + 1;
    exception
      when others then
        raise warning 'close_due_auctions: 마감 실패 (auction_id=%): %', v_row.id, sqlerrm;
    end;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- §11.3 마감 임박 알림 — 참여자 대상, 경매당 1회
--
-- 10분마다 돌지만 notifications 의 부분 유니크 인덱스가 (user_id, type, auction_id)
-- 조합당 1건으로 제한하므로, 한 사람에게 한 경매의 마감 임박 알림은 한 번만 간다.
-- 반복 실행이 곧 재시도이고, 중복은 인덱스가 막는다 (§3.10 · F9 3.3)
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
  with target as (
    select distinct e.user_id, a.id as auction_id, a.title, a.end_at
    from public.auctions a
    join public.episodes e on e.auction_id = a.id
    where a.status = 'OPEN'
      and a.end_at > now()
      and a.end_at <= now() + interval '24 hours'
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

-- ---------------------------------------------------------------------------
-- 새 사연 알림 — 주최자에게 (F9 3.1)
-- ---------------------------------------------------------------------------
create or replace function public.notify_episode_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auction public.auctions;
begin
  select * into v_auction from public.auctions where id = new.auction_id;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_auction.user_id,
    'EPISODE_CREATED',
    '새 사연이 도착했어요',
    format('"%s" 경매에 새로운 사연이 등록되었어요.', v_auction.title),
    new.auction_id
  );

  return new;
exception
  when others then
    raise warning 'notify_episode_created 실패 (episode_id=%): %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger episodes_notify_created
  after insert on public.episodes
  for each row execute function public.notify_episode_created();

-- ---------------------------------------------------------------------------
-- 새 메시지 알림 — 대화 상대에게 (F6 3.4)
-- ---------------------------------------------------------------------------
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auction_id uuid;
  v_title      text;
  v_owner      uuid;
  v_winner     uuid;
  v_target     uuid;
begin
  select a.id, a.title, a.user_id, e.user_id
    into v_auction_id, v_title, v_owner, v_winner
  from public.chat_rooms r
  join public.auctions a   on a.id = r.auction_id
  left join public.episodes e on e.id = a.winning_episode_id
  where r.id = new.chat_room_id;

  v_target := case when new.sender_id = v_owner then v_winner else v_owner end;

  if v_target is not null and v_target <> new.sender_id then
    insert into public.notifications (user_id, type, title, body, auction_id, chat_room_id)
    values (
      v_target,
      'CHAT_MESSAGE',
      '새 메시지가 도착했어요',
      format('"%s" 대화에 새 메시지가 있어요.', v_title),
      v_auction_id,
      new.chat_room_id
    );
  end if;

  return new;
exception
  when others then
    raise warning 'notify_chat_message 실패 (message_id=%): %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger messages_notify_created
  after insert on public.messages
  for each row execute function public.notify_chat_message();

-- ---------------------------------------------------------------------------
-- 읽음 처리 — 상대가 방을 열면 상대가 받은 메시지를 읽음으로 바꾼다 (F6 3.4)
-- messages 의 UPDATE 정책은 발신자 전용이라, 수신자는 이 함수로만 갱신한다
-- ---------------------------------------------------------------------------
create or replace function public.mark_messages_read(p_chat_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_updated integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501', detail = '로그인이 필요합니다';
  end if;
  if not public.is_chat_participant(p_chat_room_id) then
    raise exception 'NOT_CHAT_PARTICIPANT' using errcode = '42501', detail = '참여 중인 대화가 아닙니다';
  end if;

  update public.messages
     set read_at = now()
   where chat_room_id = p_chat_room_id
     and sender_id <> v_uid
     and read_at is null;

  get diagnostics v_updated = row_count;

  update public.notifications
     set read_at = now()
   where user_id = v_uid
     and chat_room_id = p_chat_room_id
     and read_at is null;

  return v_updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- 실행 권한 — 클라이언트가 부를 수 있는 것만 authenticated 에 연다
-- ---------------------------------------------------------------------------
revoke all on function public.place_bid(uuid, integer)        from public, anon;
revoke all on function public.delete_episode(uuid)            from public, anon;
revoke all on function public.toggle_episode_like(uuid)       from public, anon;
revoke all on function public.mark_messages_read(uuid)        from public, anon;
revoke all on function public.close_auction(uuid)             from public, anon, authenticated;
revoke all on function public.close_due_auctions()            from public, anon, authenticated;
revoke all on function public.notify_ending_soon()            from public, anon, authenticated;
revoke all on function public.handle_new_user()               from public, anon, authenticated;
revoke all on function public.notify_episode_created()        from public, anon, authenticated;
revoke all on function public.notify_chat_message()           from public, anon, authenticated;

grant execute on function public.place_bid(uuid, integer)  to authenticated;
grant execute on function public.delete_episode(uuid)      to authenticated;
grant execute on function public.toggle_episode_like(uuid) to authenticated;
grant execute on function public.mark_messages_read(uuid)  to authenticated;

grant execute on function public.close_auction(uuid)      to service_role;
grant execute on function public.close_due_auctions()     to service_role;
grant execute on function public.notify_ending_soon()     to service_role;
