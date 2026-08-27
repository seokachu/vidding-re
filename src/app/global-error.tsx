"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/features/errors/error-screen";

import "./globals.css";

/**
 * 루트 레이아웃까지 깨졌을 때 (`.pen` S19).
 *
 * `error.tsx` 는 레이아웃 *안쪽*만 감싼다 — 레이아웃 자체가 터지면 잡을 것이
 * 없다. 그 마지막 자리가 여기고, **레이아웃을 대신하므로 `html` · `body` 를
 * 직접 그려야 한다.** 전역 스타일도 따라오지 않아 여기서 다시 들여온다.
 *
 * 폰트는 `layout.tsx` 가 `html` 에 걸던 것이라 여기까지 오지 않는다. 오류
 * 화면 한 장을 위해 폰트 로딩을 다시 세우지 않고 시스템 서체로 떨어뜨린다.
 *
 * 셸(390px)도 여기서 다시 만든다. 레이아웃이 없으니 화면이 넓으면 내용이
 * 가로로 퍼지고, 그러면 오류 화면만 다른 앱처럼 보인다.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("루트 레이아웃 렌더 실패", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="bg-surface">
        <title>오류 · Vidding</title>
        <div className="mx-auto flex min-h-dvh w-full max-w-[var(--shell-width)] flex-col bg-bg">
          <ErrorScreen
            digest={error.digest}
            onRetry={unstable_retry}
            reloadOnHome
          />
        </div>
      </body>
    </html>
  );
}
