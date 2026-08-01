import { SignOutButton } from "@/components/auth/signout-button";
import {
  Bone,
  CardBone,
  TabShellSkeleton,
} from "@/components/layout/skeleton";

/** 마이페이지 (S07) 가 도착하기 전 */
export default function Loading() {
  return (
    // 로그아웃은 서버에서 읽어올 것이 없다. 회색 칸을 세웠다가 아이콘으로
    // 바꾸면 헤더가 한 번 튄다 — 처음부터 진짜를 그린다
    <TabShellSkeleton title="마이페이지" headerTrailing={<SignOutButton />}>
      {/* 프로필 */}
      <div className="flex items-center gap-[14px] px-gutter pb-5 pt-[14px]">
        <Bone className="size-14 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Bone className="h-6 w-24" />
          <Bone className="h-4 w-32" />
        </div>
      </div>

      {/* 포인트 · 배송지 */}
      <div className="px-gutter">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-border py-4"
          >
            <Bone className="h-[22px] w-20" />
            <Bone className="h-[22px] w-16" />
          </div>
        ))}
      </div>

      {/* 탭 + 목록 */}
      <div className="flex flex-col gap-4 px-gutter pt-[22px]">
        <Bone className="h-[43px] rounded-md" />
        {[0, 1].map((i) => (
          <CardBone key={i} />
        ))}
      </div>
    </TabShellSkeleton>
  );
}
