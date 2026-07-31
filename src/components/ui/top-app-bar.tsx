"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * 상세·작성 화면의 상단 바. 뒤로가기 + 제목 + 우측 액션.
 *
 * 탭 4개(홈·탐색·알림·마이)는 이 바 대신 `AppHeader` 를 쓴다.
 */
export function TopAppBar({
  title,
  action,
  onBack,
  className,
}: {
  title: string;
  /** 우측 40×40 자리. 없으면 제목이 가운데로 밀리지 않게 빈 칸을 남긴다 */
  action?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-0.5 bg-bg px-2",
        className,
      )}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={onBack ?? (() => router.back())}
        className="flex size-10 shrink-0 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
      >
        <ChevronLeft size={24} />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-subtitle font-semibold text-text-primary">
        {title}
      </h1>

      <div className="flex size-10 shrink-0 items-center justify-center">
        {action}
      </div>
    </header>
  );
}
