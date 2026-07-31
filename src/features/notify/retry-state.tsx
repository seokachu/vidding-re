"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ui";

/**
 * 조회 실패 화면. `ErrorState` 를 서버 컴포넌트에서 직접 쓰면 `onRetry` 를 넘길 수
 * 없어(이벤트 핸들러는 경계를 넘지 못한다) 이 얇은 클라이언트 껍데기를 둔다.
 *
 * 재시도는 `router.refresh()` 다 — 실패한 것은 서버 조회이므로 서버에서 다시 그린다.
 */
export function RetryState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  return (
    <ErrorState
      title={title}
      description={description}
      onRetry={() => router.refresh()}
    />
  );
}
