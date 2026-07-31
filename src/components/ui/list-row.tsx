import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * 라벨 + 값 + 화살표 한 줄. 마이페이지 프로필 영역이 이걸로 이뤄진다 (F8 3.1).
 *
 * `href` 가 있으면 링크로 그리고 화살표를 붙인다. 없으면 그냥 정보 한 줄이다.
 */
export function ListRow({
  label,
  value,
  href,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  /** 값에 주의를 주고 싶을 때 (`미등록` 같은 것). 오류가 아니다 (F8 4) */
  tone?: "default" | "muted";
  className?: string;
}) {
  const body = (
    <>
      <span className="shrink-0 text-body text-text-secondary">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right text-body font-semibold",
          tone === "muted" ? "text-text-tertiary" : "text-text-primary",
        )}
      >
        {value}
      </span>
      {href && (
        <ChevronRight size={18} className="shrink-0 text-text-tertiary" />
      )}
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 border-b border-border py-4",
    href && "hover:bg-surface",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
