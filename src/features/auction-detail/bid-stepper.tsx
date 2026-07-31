"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { BID_STEPS, nextBidStep, prevBidStep } from "@/lib/constants";
import { formatPoint } from "@/lib/format";

/**
 * 입찰 스테퍼 — **`ui/PointStepper` 에 `min` 을 더한 것뿐이다.**
 *
 * 이미 2,000 P 를 건 사연의 입찰을 올릴 때, − 로 1,000 까지 내려갈 수 있으면
 * 안 된다. 확정된 입찰은 내릴 수 없기 때문이다 (F3 4.3). 그런데 `PointStepper`
 * 는 하한을 받지 않아 `prevBidStep()` 이 `null` 이 되는 1,000 에서만 멈춘다.
 *
 * 눌러도 아무 일이 없는 버튼을 남기지 않으려고 여기 하나 더 두었다.
 * `PointStepper` 가 `min` 을 받게 되면 이 파일은 지운다.
 *
 * 새 사연(확정액 0)은 하한이 1,000 이라 `PointStepper` 로 충분하다.
 */
export function BidStepper({
  value,
  onChange,
  /** 이 단계 아래로는 내리지 못한다. 확정된 입찰액이 들어온다 */
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
