-- ---------------------------------------------------------------------------
-- 대화 알림은 방마다 한 줄, 방에 들어가면 사라진다 (F9 개선)
--
-- 메시지마다 알림 행을 쌓으면 같은 대화의 "새 메시지가 도착했어요"가 목록을
-- 도배한다. 두 가지를 바꾼다.
--
-- 1) **방마다 한 줄** — notify_chat_message 가 INSERT 전에 같은 방의 기존
--    CHAT_MESSAGE 알림을 지운다. 항상 최신 메시지 미리보기 한 줄만 남고,
--    매번 새로 INSERT 하므로 푸시 트리거(notify_push, AFTER INSERT)도
--    메시지마다 그대로 발송된다 — UPSERT 로 합치면 UPDATE 경로에서 푸시가
--    죽기 때문에 일부러 delete + insert 다.
--
-- 2) **방에 들어가면 삭제** — mark_messages_read 가 그 방의 CHAT_MESSAGE
--    알림을 읽음 처리 대신 삭제한다. 대화 알림은 "가서 읽어라"가 전부라
--    읽고 나면 남을 이유가 없다. chat_room_id 가 걸린 **다른 종류
--    (AUCTION_RESULT)는 기록이므로** 지우지 않고 지금처럼 읽음 처리만 한다.
--
-- 동시 INSERT 가 겹치면 잠깐 두 줄이 될 수 있다. 다음 메시지의 DELETE 가
-- 모두 지우므로 스스로 수습된다 — 유니크 제약으로 막을 만큼의 일이 아니다.
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
  v_preview    text;
  v_body       text;
begin
  select a.id, a.title, a.user_id, e.user_id
    into v_auction_id, v_title, v_owner, v_winner
  from public.chat_rooms r
  join public.auctions a   on a.id = r.auction_id
  left join public.episodes e on e.id = a.winning_episode_id
  where r.id = new.chat_room_id;

  v_target := case when new.sender_id = v_owner then v_winner else v_owner end;

  -- 배송 정보는 미리보기하지 않는다 — 이름·연락처·주소가 잠금 화면에 노출된다
  if new.kind = 'ADDRESS' then
    v_body := format('"%s" 대화에 배송 정보가 도착했어요.', v_title);
  else
    -- 줄바꿈·연속 공백을 접고 40자에서 자른다. 한 줄 목록·푸시 배너용 길이다
    v_preview := btrim(regexp_replace(new.content, '\s+', ' ', 'g'));
    if length(v_preview) > 40 then
      v_preview := left(v_preview, 40) || '…';
    end if;
    v_body := format('"%s" · %s', v_title, v_preview);
  end if;

  if v_target is not null and v_target <> new.sender_id then
    -- 같은 방의 이전 알림을 지워 항상 최신 한 줄만 남긴다
    delete from public.notifications
     where user_id = v_target
       and type = 'CHAT_MESSAGE'
       and chat_room_id = new.chat_room_id;

    insert into public.notifications (user_id, type, title, body, auction_id, chat_room_id)
    values (
      v_target,
      'CHAT_MESSAGE',
      '새 메시지가 도착했어요',
      v_body,
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

  -- 대화 알림은 방에 들어온 순간 역할이 끝난다. 읽음 처리 대신 삭제한다
  delete from public.notifications
   where user_id = v_uid
     and chat_room_id = p_chat_room_id
     and type = 'CHAT_MESSAGE';

  -- 이 방을 가리키는 다른 알림(낙찰 등)은 기록이다. 지우지 않고 읽음만 처리한다
  update public.notifications
     set read_at = now()
   where user_id = v_uid
     and chat_room_id = p_chat_room_id
     and read_at is null;

  return v_updated;
end;
$$;

-- 이미 쌓인 중복도 정리한다 — 방마다 최신 한 줄만 남긴다
delete from public.notifications n
 using public.notifications newer
 where n.type = 'CHAT_MESSAGE'
   and newer.type = 'CHAT_MESSAGE'
   and newer.user_id = n.user_id
   and newer.chat_room_id = n.chat_room_id
   and (newer.created_at, newer.id) > (n.created_at, n.id);
