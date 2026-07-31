"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { BID_STEPS, nextBidStep, prevBidStep } from "@/lib/constants";
import { formatPoint } from "@/lib/format";

/**
 * 입찰 스테퍼. **＋/− 버튼으로만 조작한다. 숫자를 직접 입력하지 않는다.**
 *
 * 단계는 전 서비스 공통 상수다 (1,000 → 1,500 → … → 3,000, 데이터 모델 §11.1).
 * 경매마다 다르지 않으므로 시작·상한을 props 로 받지 않는다.
 *
 * 값이 바뀌는 것과 서버에 거는 것은 별개다. 이 컴포넌트는 값만 고르고,
 * 실제 차감은 `place_bid()` 가 한다 (§4.1).
 */
export function PointStepper({
  value,
  onChange,
  /**
   * 이 단계 아래로는 내리지 못한다. **이미 확정된 입찰액을 넘긴다.**
   *
   * 2,000 P 를 이미 건 사연에서 − 로 1,000 까지 내려갈 수 있으면 안 된다.
   * 입찰은 올리기만 가능하기 때문이다 (F3 4.3 · §4.1 4단계).
   */
  min = BID_STEPS[0],
  /** 잔액이 모자라면 이 단계 위로는 올리지 못한다 */
  max = BID_STEPS[BID_STEPS.length - 1],
  disabled,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const up = nextBidStep(value);
  const down = prevBidStep(value);

  const canUp = !disabled && up !== null && up <= max;
  const canDown = !disabled && down !== null && down >= min;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-primary-300 p-2",
        disabled && "opacity-60",
        className,
      )}
    >
      <StepButton
        label="포인트 내리기"
        disabled={!canDown}
        onClick={() => down !== null && onChange(down)}
      >
        <Minus size={20} />
      </StepButton>

      <output className="tabular text-title font-semibold text-text-primary">
        {formatPoint(value)}
      </output>

      <StepButton
        label="포인트 올리기"
        disabled={!canUp}
        onClick={() => up !== null && onChange(up)}
      >
        <Plus size={20} />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-[42px] items-center justify-center rounded-sm bg-accent-subtle text-accent",
        "hover:bg-primary-200 disabled:bg-surface-sunken disabled:text-text-tertiary",
      )}
    >
      {children}
    </button>
  );
}
