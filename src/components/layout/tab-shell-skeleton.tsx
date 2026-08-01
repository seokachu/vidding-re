import { cn } from "@/lib/cn";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

/**
 * 탭 화면이 도착하기 전에 세워두는 껍데기 — `loading.tsx` 전용이다.
 *
 * **`TabShell` 이 라우트 레이아웃이 아니라 컴포넌트라서 필요하다.** 레이아웃이었다면
 * 헤더와 하단 네비가 이동 중에도 그대로 남았을 텐데, 지금은 페이지 안에 들어 있어
 * `loading.tsx` 가 그것까지 통째로 걷어낸다. 같은 크롬을 여기서 다시 그리지 않으면
 * 탭을 옮길 때마다 상·하단이 사라졌다 돌아와 화면이 튄다.
 *
 * 읽지 않은 알림 점은 찍지 않는다. 그 수를 알려면 서버를 기다려야 하는데
 * **기다리지 않는 것이 이 화면의 존재 이유다.** 내용이 도착하면 그때 켜진다.
 */
export function TabShellSkeleton({
  title,
  children,
}: {
  /** 없으면 헤더에 로고를 그린다 (홈) */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader title={title} />

      <main aria-busy="true" aria-label="불러오는 중" className="flex-1 pb-[88px]">
        {children}
      </main>

      <BottomNav />
    </>
  );
}

/** 내용이 앉을 자리를 잡아두는 블록. 크기는 쓰는 쪽에서 정한다 */
export function Bone({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface", className)} />
  );
}

/** 목록 카드 한 장 (`AuctionCard` 의 자리) */
export function CardBone() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Bone className="size-[74px] shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Bone className="h-5 w-16 rounded-full" />
        <Bone className="h-[18px] w-2/3" />
        <Bone className="h-4 w-1/2" />
      </div>
    </div>
  );
}
