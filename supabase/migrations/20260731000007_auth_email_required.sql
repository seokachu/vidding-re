-- ============================================================================
-- Vidding 07 — 이메일 없는 계정은 가입을 중단한다
-- 기준: F10 4 "이메일 정보 없음 → 가입을 중단하고, 이메일 제공에 동의가 필요함을 안내한다"
--
-- Kakao 는 이메일이 **선택 동의 항목**이라 동의하지 않으면 email 이 null 로 들어온다.
-- 이전 구현은 '<uuid>@no-email.local' 로 채워 계정을 만들고 가입 보너스까지 지급했다.
-- 연락 불가능한 계정이 원장에 남으므로, 가입 자체를 실패시킨다.
-- ============================================================================

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
  -- F10 4 — 이메일이 없으면 사용자 정보를 만들 수 없다. 가입을 중단한다
  if nullif(btrim(coalesce(new.email, '')), '') is null then
    raise exception 'EMAIL_REQUIRED'
      using errcode = 'P0001',
            detail  = '이메일 제공에 동의해야 가입할 수 있어요',
            hint    = 'Kakao 는 이메일이 선택 동의 항목이다. 로그인 요청에 account_email 스코프를 포함하고 사용자가 동의해야 한다';
  end if;

  v_nick_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nick_name'),          ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'),          ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'),               ''),
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'user_name'),          ''),
    nullif(split_part(new.email, '@', 1),                          ''),
    '이름없음'
  );

  insert into public.users (id, email, nick_name, avatar_url, point_balance)
  values (
    new.id,
    new.email,
    v_nick_name,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'picture'),    '')
    ),
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

revoke all on function public.handle_new_user() from public, anon, authenticated;
