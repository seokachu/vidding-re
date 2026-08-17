import { Suspense } from "react";

import {
  getAuthUser,
  getUnreadNotificationCount,
  hasUnreadChatMessages,
} from "@/lib/auth";
import { cn } from "@/lib/cn";
import { AppHeader, ChatButton } from "./app-header";
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
 * **배지 두 개를 기다리지 않는다.** 셸은 페이지 본문이 렌더된 뒤에 그려지므로,
 * 여기서 알림 수와 채팅 미읽음을 `await` 하면 그 두 왕복이 본문 조회 **뒤에**
 * 줄을 선다 — 화면에 점 하나 찍자고 첫 페인트가 그만큼 밀린다. 점은 `Suspense`
 * 로 떼어 도착하는 대로 찍고, 셸 자체는 곧장 나간다.
 *
 * 남은 `await` 는 `getAuthUser` 하나뿐이다. 채팅 버튼과 배지를 **아예 그릴지**가
 * 여기 달려 있고, 요청 안에서 캐시되므로 페이지가 이미 부른 뒤라면 왕복이 늘지 않는다.
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
  const user = await getAuthUser();

  // 채팅 아이콘은 탭 공통이고 항상 맨 오른쪽이다 — 페이지가 준 액션(로그아웃 등)이
  // 그 왼쪽에 붙는다 (.pen S07). 비회원에게는 그리지 않는다
  const trailing = user ? (
    <div className="flex items-center gap-1">
      {headerTrailing}
      <ChatSlot />
    </div>
  ) : (
    headerTrailing
  );

  return (
    <>
      <AppHeader title={title} trailing={trailing} />

      {/* 하단 탭(56 + 여백)이 마지막 내용물을 가리지 않게 자리를 비운다 */}
      <main className={cn("flex-1 pb-[88px]", className)}>{children}</main>

      {user ? (
        <Suspense fallback={<BottomNav />}>
          <NavSlot />
        </Suspense>
      ) : (
        <BottomNav />
      )}
    </>
  );
}

/**
 * 읽지 않은 알림 점 (F9 3.2).
 *
 * 폴백은 **점 없는 같은 네비**다. 회색 칸으로 대신하면 도착할 때 모양이 바뀌어
 * 하단이 흔들린다 — 점은 있거나 없거나 둘 중 하나여야 한다.
 * 배지 갱신이 실패해도 0 으로 떨어질 뿐, 화면은 정상 동작한다 (F9 4)
 */
async function NavSlot() {
  return <BottomNav unreadCount={await getUnreadNotificationCount()} />;
}

/** 채팅 새 메시지 점. 같은 이유로 폴백은 점 없는 같은 버튼이다 */
function ChatSlot() {
  return (
    <Suspense fallback={<ChatButton hasUnread={false} />}>
      <ChatSlotContent />
    </Suspense>
  );
}

async function ChatSlotContent() {
  return <ChatButton hasUnread={await hasUnreadChatMessages()} />;
}
