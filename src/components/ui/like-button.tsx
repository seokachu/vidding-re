"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * 공감 버튼.
 *
 * 가중치(주최자 50 / 그 외 10)는 **화면에서 계산하지 않는다.**
 * `toggle_episode_like()` 가 부여 시점 값을 정해 저장하고, 점수는 뷰가 집계한다
 * (§4.4 · §5.1). 그래서 연타해도 값이 어긋나지 않는다 (F4 완료 조건 6).
 *
 * 여기 있는 `count` 는 표시용이다. 서버 응답이 오면 화면을 갱신한다.
 */
export function LikeButton({
  count,
  liked,
  disabled,
  onToggle,
  className,
}: {
  count: number;
  liked: boolean;
  /** 마감된 경매·자기 사연·비회원이면 누를 수 없다 (00-관계-판정 3.5) */
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? "공감 취소" : "공감"}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex shrink-0 items-center gap-[6px] rounded-full px-[13px] py-2 text-label font-semibold transition-colors",
        liked
          ? "bg-accent text-text-on-accent hover:bg-accent-pressed"
          : "bg-surface-sunken text-text-secondary hover:bg-border",
        disabled && "cursor-not-allowed opacity-60 hover:bg-inherit",
        className,
      )}
    >
      <Heart size={15} fill={liked ? "currentColor" : "none"} />
      <span className="tabular">공감 {count}</span>
    </button>
  );
}
