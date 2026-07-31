import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * 조회 실패. **빈 상태로 위장하지 않는다** (F8 4 · F9 4 · 00-관계-판정 4).
 *
 * .pen 03 에 없는 컴포넌트지만, 여러 스펙의 완료 조건이
 * "내역 없음과 조회 실패가 서로 다른 화면으로 구분된다"를 요구한다.
 * 같은 시각 언어를 쓰되 아이콘과 문구로 구분한다.
 */
export function ErrorState({
  title = "잠시 후 다시 시도해주세요",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
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
          {description}
        </p>
      )}

      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          다시 시도
        </Button>
      )}
    </div>
  );
}
