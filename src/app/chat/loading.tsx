import { Bone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 채팅 목록 (S16) 이 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton title="채팅">
      <div className="flex flex-col px-gutter">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <Bone className="size-12 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-[18px] w-40" />
              <Bone className="h-4 w-56" />
            </div>
          </div>
        ))}
      </div>
    </TopBarSkeleton>
  );
}
