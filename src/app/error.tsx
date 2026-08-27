"use client";

import { useEffect } from "react";

import { ErrorScreen } from "@/features/errors/error-screen";

/**
 * 화면을 그리다 실패했을 때 (`.pen` S19).
 *
 * 404 는 "없는 주소", 이건 **있는 화면인데 못 그린 경우**다. 조회가 예외를
 * 던지거나 렌더 중 에러가 나면 Next 가 이 자리를 대신 띄운다. 없으면 Next
 * 기본 오류 화면이 그대로 나온다 — 서비스 밖으로 튕겨 나가는 자리였다.
 *
 * 화면 *일부*의 조회 실패는 여기까지 오지 않는다. 그건 그 자리에서
 * `ErrorState` · `InlineRetry` 가 받는다 (F8 4 · F9 4).
 *
 * **`reset` 이 아니라 `unstable_retry` 다.** `reset` 은 오류 상태만 지우고
 * 같은 데이터로 다시 그려서, 서버 조회가 원인이면 대개 그대로 또 터진다.
 * `unstable_retry` 는 다시 받아서 다시 그린다 — 사용자가 기대하는 "다시 시도"다.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 서버에서 난 오류는 digest 만 넘어온다. 원문은 서버 로그에 있다
    console.error("화면 렌더 실패", error);
  }, [error]);

  return <ErrorScreen digest={error.digest} onRetry={unstable_retry} />;
}
