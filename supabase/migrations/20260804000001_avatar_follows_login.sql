-- ============================================================================
-- Vidding 2026-08-04 — 프로필이 마지막 로그인 제공자를 따라간다
--
-- handle_new_user() 는 가입(INSERT) 때 한 번만 프로필을 채운다. 같은
-- 이메일이면 카카오·구글이 한 auth 계정으로 묶이는데 public.users 는
-- 그대로라, 구글로 로그인해도 처음 가입한 카카오 사진·이름이 계속 남았다.
--
-- raw_user_meta_data 는 제공자들의 키가 **병합**돼 남는다 (구글로 로그인해도
-- 카카오의 preferred_username 이 남아 있다). 어느 제공자로 로그인했는지
-- 구분할 수 없으므로, 병합본 대신 auth.identities 의 **그 제공자 순수
-- 데이터**(identity_data)를 쓴다 — last_sign_in_at 이 갱신되는 행이
-- 방금 로그인에 쓰인 제공자다.
-- ============================================================================

create or replace function public.sync_profile_on_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avatar text;
  v_nick   text;
begin
  v_avatar := coalesce(
    nullif(btrim(new.identity_data ->> 'avatar_url'), ''),
    nullif(btrim(new.identity_data ->> 'picture'),    '')
  );
  v_nick := coalesce(
    nullif(btrim(new.identity_data ->> 'nick_name'),          ''),
    nullif(btrim(new.identity_data ->> 'full_name'),          ''),
    nullif(btrim(new.identity_data ->> 'name'),               ''),
    nullif(btrim(new.identity_data ->> 'preferred_username'), ''),
    nullif(btrim(new.identity_data ->> 'user_name'),          '')
  );

  -- 제공자가 안 주는 값(NULL)은 있던 값을 지우지 않고 그대로 둔다
  update public.users
  set avatar_url = coalesce(v_avatar, avatar_url),
      nick_name  = coalesce(v_nick,   nick_name)
  where id = new.user_id
    and (avatar_url is distinct from coalesce(v_avatar, avatar_url)
      or nick_name  is distinct from coalesce(v_nick,   nick_name));

  return new;
end;
$$;

-- 첫 로그인(제공자 연결)은 INSERT, 재로그인은 last_sign_in_at UPDATE 로 온다
drop trigger if exists on_auth_identity_linked on auth.identities;
create trigger on_auth_identity_linked
  after insert on auth.identities
  for each row execute function public.sync_profile_on_login();

drop trigger if exists on_auth_identity_signin on auth.identities;
create trigger on_auth_identity_signin
  after update of last_sign_in_at on auth.identities
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function public.sync_profile_on_login();

-- 이미 다른 제공자로 로그인한 계정은 마지막 로그인 제공자 기준으로 한 번 맞춘다
update public.users u
set avatar_url = coalesce(v.avatar, u.avatar_url),
    nick_name  = coalesce(v.nick,   u.nick_name)
from (
  select distinct on (i.user_id)
    i.user_id,
    coalesce(
      nullif(btrim(i.identity_data ->> 'avatar_url'), ''),
      nullif(btrim(i.identity_data ->> 'picture'),    '')
    ) as avatar,
    coalesce(
      nullif(btrim(i.identity_data ->> 'nick_name'),          ''),
      nullif(btrim(i.identity_data ->> 'full_name'),          ''),
      nullif(btrim(i.identity_data ->> 'name'),               ''),
      nullif(btrim(i.identity_data ->> 'preferred_username'), ''),
      nullif(btrim(i.identity_data ->> 'user_name'),          '')
    ) as nick
  from auth.identities i
  order by i.user_id, i.last_sign_in_at desc nulls last
) v
where v.user_id = u.id
  and (u.avatar_url is distinct from coalesce(v.avatar, u.avatar_url)
    or u.nick_name  is distinct from coalesce(v.nick,   u.nick_name));
