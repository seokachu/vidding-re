"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { authorizeRealtime } from "@/lib/supabase/realtime";

/**
 * 알림 실시간 다리 (F9 3.2 확장). 루트 레이아웃에 한 번 마운트된다.
 *
 * `notifications` 에 내 행이 INSERT 되면 `router.refresh()` 를 부른다.
 * 클라이언트 상태로 배지를 따로 세지 않는 이유는 **미읽음 수의 진실이 이미
 * 서버에 있기 때문이다** — `TabShell` 이 다시 그려지며 하단 탭 점이 켜지고,
 * 알림 목록을 보고 있었다면 목록에도 새 행이 바로 나타난다. 따로 세면
 * 서버 재렌더와 합칠 때 이중 계산을 피하는 장부가 하나 더 필요해진다.
 *
 * `refresh()` 는 클라이언트 상태(`useState`)를 보존하므로 작성 중인 폼이나
 * 채팅 입력줄을 지우지 않는다.
 *
 * 필터 없이 테이블 전체를 구독하지만 RLS(`notifications_select_own`)가
 * 그대로 적용되므로 **내 알림의 이벤트만 온다** (마이그레이션 05).
 * 비회원은 `authorizeRealtime` 이 false 를 돌려줘 구독하지 않는다.
 */
export function NotificationRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let wasDown = false;

    async function listen() {
      // 구독 전에 소켓에 토큰부터 — 이유는 authorizeRealtime 의 주석에 있다
      const authorized = await authorizeRealtime(supabase);
      if (!authorized || cancelled) return;

      channel = supabase
        .channel("notification-badge")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => router.refresh(),
        )
        .subscribe((status) => {
          const ok = status === "SUBSCRIBED";

          // 끊긴 사이(노트북 절전 등)에 온 알림은 이벤트로 못 받았다.
          // 다시 붙으면 한 번 갱신해 배지를 맞춘다
          if (ok && wasDown) {
            wasDown = false;
            router.refresh();
          }
          if (!ok) wasDown = true;
        });
    }

    void listen();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
