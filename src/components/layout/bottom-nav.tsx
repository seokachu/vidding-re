"use client";

import { Bell, House, Search, User, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
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

          return (
            <li key={href} className="h-full flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="block h-full"
              >
                <Tab
                  Icon={Icon}
                  label={label}
                  active={active}
                  unreadCount={href === ROUTES.notifications ? unreadCount : 0}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * 탭 한 칸. **`Link` 안에 따로 뺀 이유는 `useLinkStatus` 때문이다** — 이 훅은
 * `Link` 의 자손에서만 동작한다.
 *
 * `usePathname()` 은 이동이 **끝난 뒤에야** 바뀐다. 그것만 쓰면 누르고 나서
 * 화면이 올 때까지 눌린 티가 전혀 나지 않는다. 목적지가 프리페치돼 있으면
 * `pending` 은 뜨지 않고 곧장 넘어가고, 늦어질 때만 미리 불이 들어온다.
 *
 * 색만 바꾼다. 크기를 건드리면 누를 때마다 레이아웃이 흔들린다.
 */
function Tab({
  Icon,
  label,
  active,
  unreadCount,
}: {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  unreadCount: number;
}) {
  const { pending } = useLinkStatus();
  const lit = active || pending;

  return (
    <span
      className={cn(
        "relative flex h-full flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors",
        lit ? "bg-accent-subtle text-accent" : "text-text-tertiary",
      )}
    >
      <Icon size={21} />
      <span className="text-[10px] font-medium">{label}</span>

      {unreadCount > 0 && (
        <span
          aria-label={`읽지 않은 알림 ${unreadCount}건`}
          className="absolute right-[22px] top-[3px] size-2 rounded-full bg-accent ring-[1.5px] ring-bg"
        />
      )}
    </span>
  );
}
