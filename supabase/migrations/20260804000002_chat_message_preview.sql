-- ---------------------------------------------------------------------------
-- 새 메시지 알림에 내용 미리보기를 담는다 (F6 3.4 · F9 개선)
--
-- "…대화에 새 메시지가 있어요"만으로는 열어보기 전까지 아무것도 알 수 없다.
-- body 에 메시지 앞부분을 실어 알림 목록(S08)과 푸시 양쪽에 내용이 보이게
-- 한다 — notify_push 가 body 를 그대로 웹훅에 넘기므로 여기 한 곳만 고치면
-- 둘 다 바뀐다.
--
-- **배송 정보(kind = 'ADDRESS')는 미리보기하지 않는다.** content 에 이름·
-- 연락처·주소가 통째로 들어 있어, 잠금 화면 푸시와 알림 목록에 그대로
-- 노출되기 때문이다. 종류만 알린다.
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
