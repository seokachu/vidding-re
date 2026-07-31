-- ============================================================================
-- Vidding 06 — 스케줄러
-- 기준: docs/데이터-모델-명세.md §9, §11.3, §11.6
--
-- pg_cron 확장이 켜져 있어야 한다.
-- (Dashboard → Database → Extensions → pg_cron, 또는 아래 create extension)
-- ============================================================================

create extension if not exists pg_cron;

-- 마감 처리 — 1분 주기 (§11.6)
select cron.unschedule('vidding-close-due-auctions')
where exists (select 1 from cron.job where jobname = 'vidding-close-due-auctions');

select cron.schedule(
  'vidding-close-due-auctions',
  '* * * * *',
  $CRON$select public.close_due_auctions();$CRON$
);

-- 마감 임박 알림 — 10분 주기 (§11.3)
select cron.unschedule('vidding-notify-ending-soon')
where exists (select 1 from cron.job where jobname = 'vidding-notify-ending-soon');

select cron.schedule(
  'vidding-notify-ending-soon',
  '*/10 * * * *',
  $CRON$select public.notify_ending_soon();$CRON$
);
