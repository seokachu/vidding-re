import { getUnreadNotificationCount } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

/**
 * 하단 탭이 붙는 네 화면의 껍데기 — 홈 · 탐색 · 알림 · 마이.
 *
 * 라우트 그룹 레이아웃이 아니라 **컴포넌트**다. 화면 작업이 네 갈래로 나뉘어
 * 진행되므로, 같은 레이아웃 파일을 넷이 동시에 건드리지 않게 했다.
 * 탭 화면은 이걸로 감싸고, 상세·작성 화면은 `TopAppBar` 를 직접 쓴다.
 *
 * **서버 컴포넌트 전용이다.** 알림 수를 서버에서 읽으므로 클라이언트 컴포넌트에서
 * import 하면 빌드가 깨진다. 헤더·하단 네비만 필요하면 각 파일에서 직접 가져온다.
 *
 * ```tsx
 * export default async function Page() {
 *   return <TabShell title="경매 현황">...</TabShell>
 * }
 * ```
 */
export async function TabShell({
  title,
  headerTrailing,
  children,
  className,
}: {
  /** 없으면 헤더에 로고를 그린다 (홈) */
  title?: string;
  headerTrailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // 배지 갱신이 실패해도 0 으로 떨어질 뿐, 화면은 정상 동작한다 (F9 4)
  const unreadCount = await getUnreadNotificationCount();

  return (
    <>
      <AppHeader title={title} trailing={headerTrailing} />

      {/* 하단 탭(56 + 여백)이 마지막 내용물을 가리지 않게 자리를 비운다 */}
      <main className={cn("flex-1 pb-[88px]", className)}>{children}</main>

      <BottomNav unreadCount={unreadCount} />
    </>
  );
}
