import { cn } from "@/lib/cn";
import { formatRelativeTime, formatSignedPoint } from "@/lib/format";
import { pointLabel } from "./labels";
import type { PointItem } from "./types";

/**
 * 포인트 내역 (F8 3.6) — **시간순 목록 하나뿐이다.**
 *
 * 필터·검색·기간 선택을 두지 않는다. 한 줄에 사유 · 금액 · 시각만 담는다.
 * 차감은 경고색으로 `−`, 적립은 기본색으로 `+` (부호는 `formatSignedPoint`).
 *
 * 여기 레드는 "잘못됐다"가 아니라 **줄었다**는 뜻이다. 금액이 오간 방향을
 * 숫자를 읽기 전에 알아채게 하는 자리라서 색을 쓴다.
 */
export function PointList({ items }: { items: PointItem[] }) {
  return (
    <ul>
      {items.map((item) => {
        const spent = item.amount < 0;

        return (
          <li
            key={item.id}
            className="flex items-start gap-3 border-b border-border py-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-body font-semibold text-text-primary">
                {pointLabel(item.type)}
              </p>
              <p className="truncate text-caption text-text-secondary">
                {item.description}
              </p>
              <p className="text-label text-text-tertiary">
                {formatRelativeTime(item.createdAt)}
              </p>
            </div>

            <span
              className={cn(
                "tabular shrink-0 pt-[2px] text-body font-semibold",
                spent ? "text-warning-text" : "text-text-primary",
              )}
            >
              {formatSignedPoint(item.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
