"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/cn";
import { hasHistory } from "@/lib/history";
import { tabRootOf } from "@/lib/routes";

/**
 * 상세·작성 화면의 상단 바. 뒤로가기 + 제목 + 우측 액션.
 *
 * 탭 4개(홈·탐색·알림·마이)는 이 바 대신 `AppHeader` 를 쓴다.
 *
 * **뒤로가기는 히스토리 back 이다** (X8). 이 바가 붙는 화면은 전부 2층이라
 * 한 번 물러나면 1층(탭)이거나 그 위의 2층이다. 돌아갈 히스토리가 없으면
 * — 공유 링크 · 푸시 알림으로 바로 들어온 경우 — 이 화면이 속한 탭으로
 * `replace` 한다. 버튼이 죽은 것처럼 보이면 안 된다.
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
  const pathname = usePathname();

  function back() {
    if (hasHistory()) router.back();
    else router.replace(tabRootOf(pathname));
  }

  return (
    <header
      className={cn(
        // 헤더와 같은 규칙이다 (`AppHeader` 참고). 크롬 위아래를 같은 선으로 맞춘다
        "sticky top-0 z-20 flex h-14 items-center gap-0.5 border-b border-border bg-bg px-2",
        className,
      )}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={onBack ?? back}
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
