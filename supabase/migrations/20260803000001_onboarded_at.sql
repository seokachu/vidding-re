-- ---------------------------------------------------------------------------
-- 온보딩을 첫 로그인에 한 번 보여준다 (F11 3.3 개정)
--
-- 지금까지 `/onboarding` 은 **어디에서도 링크되지 않았다.** 주소를 직접 쳐야만
-- 열렸으니 사실상 도달할 수 없는 화면이었다. F11 이 "누가 볼 수 있는지"만 정하고
-- "언제 보여줄지"를 정하지 않은 탓이다.
--
-- 기기가 아니라 **계정 단위로** 한 번이어야 한다. localStorage 나 쿠키에 적으면
-- 폰에서 보고 노트북에서 또 보게 되고, 시크릿 모드에서는 매번 뜬다.
-- `users` 행은 이미 있으므로 컬럼 하나면 충분하다.
-- ---------------------------------------------------------------------------

alter table public.users
  add column onboarded_at timestamptz;

comment on column public.users.onboarded_at is
  '온보딩을 보거나 건너뛴 시각. NULL 이면 아직 보지 않았다 — 첫 로그인에 한 번 보여준다 (F11 3.3)';

-- **이미 가입한 사람은 본 것으로 친다.** 그러지 않으면 다음 로그인에 갑자기
-- 온보딩이 뜬다. 새로 가입하는 사람만 NULL 로 시작한다 (handle_new_user 기본값).
update public.users
   set onboarded_at = now()
 where onboarded_at is null;

-- 본인 행만 고칠 수 있다는 정책(users_update_own)은 그대로다. 컬럼만 연다.
grant update (onboarded_at) on public.users to authenticated;
