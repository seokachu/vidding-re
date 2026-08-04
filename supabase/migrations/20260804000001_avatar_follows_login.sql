-- ============================================================================
-- Vidding 2026-08-04 — 아바타가 마지막 로그인 제공자를 따라간다
--
-- handle_new_user() 는 가입(INSERT) 때 한 번만 아바타를 채운다. 같은
-- 이메일이면 카카오·구글이 한 auth 계정으로 묶이고, GoTrue 는 로그인마다
-- raw_user_meta_data 를 그 제공자의 값으로 갱신하는데 public.users 는
-- 그대로라 처음 가입한 제공자의 사진이 계속 남았다.
--
-- 닉네임은 따라가지 않는다 — 제공자마다 표기가 달라 오히려 나빠진다
-- (구글 full_name 은 "seokachu (서카츄)" 처럼 이메일 표기가 섞여 온다).
-- ============================================================================

create or replace function public.sync_avatar_on_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_avatar text;
begin
  v_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'),    '')
  );

  -- 새 제공자가 사진을 안 주면(NULL) 있던 사진을 지우지 않고 그대로 둔다
  if v_avatar is not null then
    update public.users
    set avatar_url = v_avatar
    where id = new.id
      and avatar_url is distinct from v_avatar;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_meta_updated on auth.users;
create trigger on_auth_user_meta_updated
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sync_avatar_on_login();

-- 이미 다른 제공자로 로그인해 메타데이터만 최신인 계정은 한 번 맞춰 준다
update public.users u
set avatar_url = v.avatar
from (
  select
    a.id,
    coalesce(
      nullif(btrim(a.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(btrim(a.raw_user_meta_data ->> 'picture'),    '')
    ) as avatar
  from auth.users a
) v
where v.id = u.id
  and v.avatar is not null
  and u.avatar_url is distinct from v.avatar;
