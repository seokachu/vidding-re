import Link from "next/link";

import { cn } from "@/lib/cn";

export type SegmentedTab<T extends string> = {
  value: T;
  label: string;
  /** 링크로 그릴 때. 없으면 버튼으로 그린다 */
  href?: string;
};

const ITEM =
  "flex-1 rounded-sm px-1 py-[9px] text-center text-label font-semibold transition-colors";
const ACTIVE = "bg-bg text-text-primary shadow-[0_1px_3px_#0C1C401F]";
const INACTIVE = "text-text-secondary hover:text-text-primary";

/**
 * 정렬 탭(마감 임박 · 사연 많은순 · 최신순)과 마이페이지 탭(내 경매 · 내 사연 · 찜)에 쓴다.
 *
 * `href` 를 주면 링크로 그린다. 정렬은 주소에 남아야 뒤로가기·공유가 동작한다.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange?: (next: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full items-center gap-0.5 rounded-md bg-surface-sunken p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        const classes = cn(ITEM, active ? ACTIVE : INACTIVE);

        return tab.href ? (
          <Link
            key={tab.value}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={classes}
          >
            {tab.label}
          </Link>
        ) : (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={classes}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
