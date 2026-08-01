import { BottomBar, TopAppBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

/**
 * 화면이 도착하기 전에 세워두는 껍데기 — `loading.tsx` 전용이다.
 *
 * **없으면 눌러도 아무 일이 안 일어난다.** Next 는 동적 라우트로 갈 때 서버 응답이
 * 올 때까지 이전 화면을 그대로 두는데, `loading.tsx` 가 있어야 그 자리에 바로
 * 스켈레톤을 세우고 프리페치도 켠다.
 *
 * 크롬(상단 바·하단 네비)을 스켈레톤에서도 그리는 이유는 **화면 껍데기가
 * 라우트 레이아웃이 아니라 컴포넌트이기 때문이다.** `loading.tsx` 가 페이지를
 * 통째로 대신하므로, 여기서 다시 그리지 않으면 이동할 때마다 상·하단이
 * 사라졌다 돌아와 화면이 튄다.
 */

/** 탭 4개(홈·탐색·알림·마이) 용 */
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
      <Body className="pb-[88px]">{children}</Body>
      {/* 읽지 않은 알림 점은 찍지 않는다. 그 수를 알려면 서버를 기다려야 하는데
          기다리지 않는 것이 이 화면의 존재 이유다 */}
      <BottomNav />
    </>
  );
}

/** 상세·작성 화면 용. 뒤로가기는 스켈레톤 상태에서도 눌린다 */
export function TopBarSkeleton({
  title = "",
  children,
  cta,
}: {
  title?: string;
  children: React.ReactNode;
  /** 하단 고정 버튼이 있는 화면이면 자리를 잡아둔다 */
  cta?: boolean;
}) {
  return (
    <>
      <TopAppBar title={title} />
      <Body>{children}</Body>
      {cta && (
        <BottomBar>
          <Bone className="h-[52px]" />
        </BottomBar>
      )}
    </>
  );
}

function Body({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      aria-busy="true"
      aria-label="불러오는 중"
      className={cn("flex-1", className)}
    >
      {children}
    </main>
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

/** 사연 카드 한 장 (`StoryCard` 의 자리) */
export function StoryBone() {
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-border p-[14px]">
      <div className="flex items-center justify-between">
        <Bone className="h-[22px] w-32" />
        <Bone className="h-7 w-16 rounded-full" />
      </div>
      <Bone className="h-[22px] w-3/5" />
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-4/5" />
    </div>
  );
}

/** 라벨 + 입력칸 한 벌 (`TextField` 의 자리) */
export function FieldBone({ tall }: { tall?: boolean }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <Bone className="h-[18px] w-20" />
      <Bone className={tall ? "h-[130px]" : "h-[50px]"} />
      <Bone className="h-4 w-40" />
    </div>
  );
}
