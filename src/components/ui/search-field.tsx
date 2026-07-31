import { Search } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * 목록 상단에 고정되는 검색 입력창. **제목만 검색한다** (F2 3.2).
 *
 * 바텀시트를 열지 않는다. 입력창 하나가 전부다.
 */
export function SearchField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-[9px] rounded-md bg-surface px-[15px] py-[13px]",
        "focus-within:ring-1 focus-within:ring-accent",
        className,
      )}
    >
      <Search size={18} className="shrink-0 text-text-tertiary" />
      <input
        type="search"
        placeholder="경매 제목 검색"
        className="min-w-0 flex-1 bg-transparent text-body text-text-primary placeholder:text-text-tertiary focus:outline-none"
        {...props}
      />
    </div>
  );
}
