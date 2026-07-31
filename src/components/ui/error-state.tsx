"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * 조회 실패. **빈 상태로 위장하지 않는다** (F8 4 · F9 4 · 00-관계-판정 4).
 *
 * `.pen` 03 에 없는 컴포넌트지만, 여러 스펙의 완료 조건이
 * "내역 없음과 조회 실패가 서로 다른 화면으로 구분된다"를 요구한다.
 *
 * **클라이언트 컴포넌트다.** 실패한 것은 대부분 서버 조회이므로 재시도의 기본
 * 동작은 `router.refresh()` — 이 화면을 서버에서 다시 그리는 것이다. 그래서
 * 서버 컴포넌트가 `onRetry` 없이 그냥 쓸 수 있다.
 *
 * > 처음에는 `onRetry` 를 필수로 받는 서버 컴포넌트였다. 이벤트 핸들러는 서버에서
 * > 클라이언트로 넘어가지 못하므로, 화면 네 갈래가 각자 똑같은 래퍼를 만들었다.
 * > 기본 동작을 안으로 들여 그 중복을 없앴다.
 */
export function ErrorState({
  title = "잠시 후 다시 시도해주세요",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  /** 재조회 말고 다른 일을 해야 할 때만 넘긴다. 기본은 화면 새로고침이다 */
  onRetry?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const retry =
    onRetry ?? (() => startTransition(() => router.refresh()));

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-[14px] px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-warning-subtle">
        <TriangleAlert size={26} className="text-warning-text" />
      </span>

      <p className="text-body font-semibold text-text-primary">{title}</p>

      {description && (
        <p className="whitespace-pre-line text-caption leading-relaxed text-text-secondary">
          {pending ? "다시 불러오는 중이에요" : description}
        </p>
      )}

      <Button
        variant="secondary"
        onClick={retry}
        disabled={pending}
        className="mt-1"
      >
        다시 시도
      </Button>
    </div>
  );
}

/**
 * 한 줄짜리 실패 표시. **화면을 다 차지하면 안 되는 자리**에 쓴다.
 *
 * 프로필에 큰 `ErrorState` 를 넣으면 탭이 화면 밖으로 밀려난다. 한 영역의
 * 조회 실패가 다른 영역을 막으면 안 되므로(F8 4), 실패 표시도 그 자리 크기에 맞춘다.
 */
export function InlineRetry({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const retry = onRetry ?? (() => startTransition(() => router.refresh()));

  return (
    <div
      role="alert"
      className={cn(
        "flex w-full items-center gap-2 rounded-md bg-warning-subtle px-3 py-[10px]",
        className,
      )}
    >
      <TriangleAlert size={16} className="shrink-0 text-warning-text" />

      <p className="min-w-0 flex-1 text-caption text-warning-text">
        {pending ? "다시 불러오는 중이에요" : message}
      </p>

      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className="shrink-0 rounded-sm px-2 py-1 text-label font-semibold text-warning-text underline underline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}
