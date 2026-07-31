import {
  Bell,
  ClockAlert,
  FilePen,
  MessageCircle,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/routes";
import type { Notification } from "@/lib/supabase/database.types";

/**
 * 알림 종류별 표시 규칙 (F9 3.1 · 3.4).
 *
 * **마감 임박은 단계가 곧 종류다** — `AUCTION_ENDING_SOON_3D` · `_1D` · `_1H`
 * 셋이 서로 다른 `type` 이다 (supabase/README.md 11). 그래서 값 하나를 비교하지 않고
 * **접두어로 판정한다.** 단계가 늘거나 줄어도 이 파일을 고칠 일이 없다.
 */
const ENDING_SOON_PREFIX = "AUCTION_ENDING_SOON";

/** 마감 임박 계열인가. 레드(경고색)를 쓸지 여부가 여기서 갈린다 */
export function isEndingSoon(type: string): boolean {
  return type.startsWith(ENDING_SOON_PREFIX);
}

/**
 * 아이콘 배경·전경 색.
 *
 * **레드는 마감 임박에만 쓴다** (F9 3.4). 낙찰 결과는 기본 강조색,
 * 새 사연·새 메시지는 중립색이다 (.pen S08).
 */
export type NotificationTone = "warning" | "accent" | "muted";

export const TONE_CLASS: Record<NotificationTone, { wrap: string; icon: string }> =
  {
    warning: { wrap: "bg-warning-subtle", icon: "text-warning" },
    accent: { wrap: "bg-accent-subtle", icon: "text-accent" },
    muted: { wrap: "bg-surface", icon: "text-text-secondary" },
  };

export function notificationVisual(type: string): {
  icon: LucideIcon;
  tone: NotificationTone;
} {
  if (isEndingSoon(type)) return { icon: ClockAlert, tone: "warning" };

  switch (type) {
    case "AUCTION_RESULT":
      return { icon: Trophy, tone: "accent" };
    case "EPISODE_CREATED":
      return { icon: FilePen, tone: "muted" };
    case "CHAT_MESSAGE":
      return { icon: MessageCircle, tone: "muted" };
    default:
      // 스키마에 없는 종류가 와도 목록이 깨지지 않아야 한다
      return { icon: Bell, tone: "muted" };
  }
}

/**
 * 알림을 눌렀을 때 갈 곳 (F9 3.2).
 *
 * 채팅방이 걸려 있으면 채팅이 우선이다 — 낙찰자의 `AUCTION_RESULT` 가 그렇다.
 * 둘 다 `null` 이면 **대상이 지워진 것**이다. `notifications` 의 대상 FK 는
 * `ON DELETE SET NULL` 이라 알림 자체는 남는다 (supabase/README.md 6).
 * 이때는 이동하지 않고 안내만 한다 (F9 4).
 */
export function notificationHref(n: Notification): string | null {
  if (n.chat_room_id) return ROUTES.chat(n.chat_room_id);
  if (n.auction_id) return ROUTES.auction(n.auction_id);
  return null;
}
