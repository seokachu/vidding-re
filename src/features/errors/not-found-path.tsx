"use client";

import { Unlink } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

/**
 * 찾지 못한 주소를 그대로 보여주는 칩 (`.pen` S17).
 *
 * **오타를 눈으로 확인시켜 준다.** "없는 페이지"라는 말만으로는 내가 주소를
 * 잘못 친 것인지 서비스가 고장 난 것인지 구분되지 않는다.
 *
 * **주소는 `usePathname` 이 아니라 `location` 에서 읽는다.** 404 화면은
 * `/_not-found` 라는 내부 경로로 미리 렌더되고 라우터도 그 값을 그대로 주므로,
 * 훅을 쓰면 사용자가 친 주소 대신 `/_not-found` 가 찍힌다. 주소창에 남아 있는
 * 진짜 경로는 `location` 쪽에 있다.
 *
 * **하이드레이션 전에는 그리지 않는다.** 서버에는 읽을 `location` 이 없다.
 * `useSyncExternalStore` 의 서버 스냅샷이 `false`, 클라이언트 스냅샷이 `true` 라
 * 서버와 첫 렌더가 같은 결과(없음)를 내고, 그 다음 주소가 채워진다.
 */
export function NotFoundPath({ className }: { className?: string }) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) return null;

  return (
    <p
      className={cn(
        "inline-flex max-w-full items-center gap-[6px] rounded-full bg-surface-sunken px-[14px] py-2",
        className,
      )}
    >
      <Unlink size={14} className="shrink-0 text-text-tertiary" />
      <span className="min-w-0 truncate text-label text-text-tertiary">
        {window.location.pathname}
      </span>
    </p>
  );
}
