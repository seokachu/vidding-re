-- ============================================================================
-- Vidding 05 — Storage · Realtime
-- 기준: docs/데이터-모델-명세.md §11.5, F6 3.4
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 경매 이미지 버킷 — 공개, 장당 5 MB, jpg/png/webp (§11.5)
-- 경로 규칙: {user_id}/{auction_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auction-images',
  'auction-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists auction_images_read_all       on storage.objects;
drop policy if exists auction_images_insert_own     on storage.objects;
drop policy if exists auction_images_update_own     on storage.objects;
drop policy if exists auction_images_delete_own     on storage.objects;

create policy auction_images_read_all on storage.objects
  for select
  using (bucket_id = 'auction-images');

create policy auction_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'auction-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy auction_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'auction-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy auction_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'auction-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Realtime — 채팅 메시지와 알림
-- RLS 가 그대로 적용되므로 참여자만 이벤트를 받는다
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
