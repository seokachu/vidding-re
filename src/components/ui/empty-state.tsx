import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * 빈 상태. **서비스가 데이터 0건에서 시작하므로 이게 첫 화면이다** (F10 3.3.1).
 *
 * 조회 실패를 이 컴포넌트로 그리지 않는다. 둘은 서로 다른 화면이어야 한다
 * (F8 4 · F9 4). 실패에는 `ErrorState` 를 쓴다.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 다음 행동 경로. 빈 목록에는 갈 곳을 함께 준다 (F8 3.7) */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-[14px] px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken">
        <Icon size={26} className="text-text-tertiary" />
      </span>

      <p className="text-body font-semibold text-text-primary">{title}</p>

      {description && (
        <p className="whitespace-pre-line text-caption leading-relaxed text-text-secondary">
          {description}
        </p>
      )}

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
