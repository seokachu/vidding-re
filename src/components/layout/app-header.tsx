import { Bell } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { Logo } from "@/components/ui/logo";

/**
 * 탭 화면(홈·탐색·알림·마이)의 상단 헤더.
 *
 * 홈은 로고만, 나머지는 제목을 쓴다 (.pen S01 · S02 · S07 · S08).
 * 상세·작성 화면은 이 대신 `TopAppBar` 를 쓴다.
 *
 * `trailing` 은 우측 액션 자리다. **알림 배지를 헤더에 두고 싶으면 여기에
 * `<NotificationBell />` 을 넘긴다.** 기본값은 비워 둔다 — 디자인은 읽지 않은
 * 알림을 하단 탭의 점으로 표시한다.
 */
export function AppHeader({
  title,
  trailing,
  className,
}: {
  /** 없으면 로고를 그린다 (홈) */
  title?: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-13 items-center justify-between gap-3 bg-bg px-gutter",
        className,
      )}
    >
      {title ? (
        <h1 className="min-w-0 truncate text-title font-bold text-text-primary">
          {title}
        </h1>
      ) : (
        <Link href={ROUTES.home} aria-label="Vidding 홈">
          <Logo width={45} />
        </Link>
      )}

      {trailing}
    </header>
  );
}

/** 헤더 우측에 둘 수 있는 알림 배지. 비회원에게는 노출하지 않는다 (F9 4) */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href={ROUTES.notifications}
      aria-label={
        unreadCount > 0 ? `알림 ${unreadCount}건 읽지 않음` : "알림"
      }
      className="relative flex size-10 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
    >
      <Bell size={22} />
      {unreadCount > 0 && (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-[1.5px] ring-bg" />
      )}
    </Link>
  );
}
