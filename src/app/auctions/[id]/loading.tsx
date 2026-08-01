import { Bone, StoryBone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 경매 상세 (S03·S04·S09) 가 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton cta>
      {/* 대표 이미지 — 4:3 */}
      <Bone className="aspect-[4/3] w-full rounded-none" />

      <div className="flex flex-col gap-3 px-gutter pt-4">
        <div className="flex items-center gap-2">
          <Bone className="h-7 w-16 rounded-full" />
          <Bone className="h-5 w-24" />
        </div>

        <Bone className="h-9 w-3/4" />

        <div className="flex items-center gap-2">
          <Bone className="size-6 shrink-0 rounded-full" />
          <Bone className="h-5 w-28" />
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <Bone className="h-5 w-full" />
          <Bone className="h-5 w-4/5" />
        </div>

        <Bone className="mt-2 h-[52px]" />

        <Bone className="mt-4 h-7 w-28" />

        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <StoryBone key={i} />
          ))}
        </div>
      </div>
    </TopBarSkeleton>
  );
}
