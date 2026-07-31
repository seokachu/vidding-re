"use client";

import { Bell, House, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";

const TABS = [
  { href: ROUTES.home, label: "홈", icon: House, exact: true },
  { href: ROUTES.auctions, label: "탐색", icon: Search, exact: false },
  { href: ROUTES.notifications, label: "알림", icon: Bell, exact: false },
  { href: ROUTES.mypage, label: "마이", icon: User, exact: false },
] as const;

/**
 * 하단 탭 4개. `.pen` 의 `Tab Bar` 를 옮긴 것이다.
 *
 * 읽지 않은 알림이 있으면 **알림 탭에 점**을 찍는다 (F9 3.2).
 * 개수를 숫자로 쓰지 않는다 — 디자인은 점 하나다. 비회원에게는 노출하지 않는다 (F9 4).
 */
export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[var(--shell-width)] px-4 pb-3 pt-2">
      <ul
        className={cn(
          "pointer-events-auto flex h-14 items-center gap-0.5 rounded-[28px] p-1.5",
          "border border-border bg-bg/72 backdrop-blur-md",
          "shadow-[0_6px_20px_-4px_#0C1C4026]",
        )}
      >
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          const showDot = href === ROUTES.notifications && unreadCount > 0;

          return (
            <li key={href} className="h-full flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-[22px]",
                  active ? "bg-accent-subtle text-accent" : "text-text-tertiary",
                )}
              >
                <Icon size={21} />
                <span className="text-[10px] font-medium">{label}</span>

                {showDot && (
                  <span
                    aria-label={`읽지 않은 알림 ${unreadCount}건`}
                    className="absolute right-[22px] top-[3px] size-2 rounded-full bg-accent ring-[1.5px] ring-bg"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
