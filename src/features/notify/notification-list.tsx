"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import type { Notification } from "@/lib/supabase/database.types";
import { markNotificationsRead } from "./actions";
import {
  TONE_CLASS,
  notificationHref,
  notificationVisual,
} from "./notification-meta";

/**
 * 알림 목록 (F9 3.2 · .pen S08).
 *
 * **목록을 열면 읽음으로 처리한다.** 다만 "읽지 않은 알림을 구분해 표시한다"도
 * 동시에 지켜야 하므로, **열었을 때의 미읽음 집합을 state 로 붙잡아 둔다.**
 * 읽음 처리 뒤 `refresh()` 로 서버가 다시 그려 `read_at` 이 채워져도, 이번 방문
 * 동안에는 점이 그대로 남는다. 다음에 들어오면 사라진다.
 */
export function NotificationList({ items }: { items: Notification[] }) {
  const [unreadAtOpen] = useState(
    () => new Set(items.filter((n) => !n.read_at).map((n) => n.id)),
  );
  const [missingId, setMissingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || unreadAtOpen.size === 0) return;
    marked.current = true;

    // 실패해도 목록은 그대로 동작한다 — 액션이 false 를 돌려줄 뿐 던지지 않는다 (F9 4)
    startTransition(async () => {
      await markNotificationsRead();
    });
  }, [unreadAtOpen]);

  return (
    <ul className="px-gutter pt-2">
      {items.map((n) => (
        <NotificationRow
          key={n.id}
          notification={n}
          unread={unreadAtOpen.has(n.id)}
          missing={missingId === n.id}
          onMissing={() => setMissingId(n.id)}
        />
      ))}
    </ul>
  );
}

function NotificationRow({
  notification: n,
  unread,
  missing,
  onMissing,
}: {
  notification: Notification;
  unread: boolean;
  missing: boolean;
  onMissing: () => void;
}) {
  const { icon: Icon, tone } = notificationVisual(n.type);
  const href = notificationHref(n);

  const body = (
    <>
      <span
        className={cn(
          "flex size-[38px] shrink-0 items-center justify-center rounded-full",
          TONE_CLASS[tone].wrap,
        )}
      >
        <Icon size={18} className={TONE_CLASS[tone].icon} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 text-caption font-semibold text-text-primary">
            {n.title}
          </span>
          {unread && (
            <span
              aria-label="읽지 않음"
              className="size-1.5 shrink-0 rounded-full bg-accent"
            />
          )}
        </span>

        <span className="text-label leading-normal text-text-secondary">
          {n.body}
        </span>

        <span className="text-micro text-text-tertiary">
          {formatRelativeTime(n.created_at)}
        </span>
      </span>
    </>
  );

  const rowClass =
    "flex w-full items-start gap-3 py-4 text-left hover:bg-surface";

  return (
    <li className="border-b border-border">
      {href ? (
        <Link href={href} className={rowClass}>
          {body}
        </Link>
      ) : (
        // 대상이 지워진 알림. 이동하지 않고 안내만 하고 목록에 머무른다 (F9 4)
        <button type="button" onClick={onMissing} className={rowClass}>
          {body}
        </button>
      )}

      {missing && (
        <p
          role="status"
          className="mb-4 rounded-sm bg-warning-subtle px-3 py-2 text-label text-warning-text"
        >
          삭제되었거나 찾을 수 없어요
        </p>
      )}
    </li>
  );
}
