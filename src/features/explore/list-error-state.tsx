"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ErrorState } from "@/components/ui";

/**
 * 서버 컴포넌트에서 쓰는 `ErrorState`.
 *
 * `ErrorState` 의 `onRetry` 는 함수라 서버 컴포넌트에서 넘길 수 없다. 다시 시도는
 * 결국 "이 화면을 다시 그려라"이므로 라우터 새로고침으로 옮겼다.
 *
 * **`src/components/ui/` 로 올라가야 할 것이다** — 재조회가 필요한 화면은 넷 다 있다.
 */
export function ListErrorState({
  title,
  description = "목록을 불러오지 못했어요",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ErrorState
      title={title}
      description={pending ? "다시 불러오는 중이에요" : description}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
}
