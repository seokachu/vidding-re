"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * 조회 실패 + 재시도.
 *
 * `ErrorState` 의 `onRetry` 는 함수라 서버 컴포넌트에서 넘길 수 없다.
 * 재시도는 `router.refresh()` 다 — 서버에서 다시 조회해 실패한 자리만 채운다.
 * 클라이언트 상태(열린 탭 등)는 유지되므로 사용자가 보던 자리를 잃지 않는다.
 */
export function RetryErrorState({
  title,
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <ErrorState
      title={title}
      description={description}
      onRetry={() => router.refresh()}
      className={className}
    />
  );
}

/**
 * 한 줄짜리 실패 표시. 프로필처럼 **화면을 다 차지하면 안 되는 자리**에 쓴다.
 *
 * 큰 `ErrorState` 를 프로필에 넣으면 탭이 화면 밖으로 밀려난다. 탭은 실패와
 * 무관하게 정상 동작해야 하므로(F8 4) 실패 표시도 그 자리 크기에 맞춘다.
 */
export function InlineRetry({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <div
      role="alert"
      className={cn(
        "flex w-full items-center gap-2 rounded-md bg-warning-subtle px-3 py-[10px]",
        className,
      )}
    >
      <TriangleAlert size={16} className="shrink-0 text-warning-text" />

      <p className="min-w-0 flex-1 text-caption text-warning-text">{message}</p>

      <button
        type="button"
        onClick={() => router.refresh()}
        className="shrink-0 rounded-sm px-2 py-1 text-label font-semibold text-warning-text underline underline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}
