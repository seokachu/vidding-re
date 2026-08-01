import { Bone, FieldBone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 사연 작성 · 입찰 (S05) 이 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton title="사연 쓰기" cta>
      <div className="flex flex-col gap-[22px] px-gutter pt-4">
        {/* 이렇게 써보세요 */}
        <Bone className="h-[140px]" />

        <FieldBone />
        <FieldBone tall />

        {/* 얼마를 걸까요 */}
        <div className="flex flex-col gap-2.5">
          <Bone className="h-7 w-32" />
          <Bone className="h-5 w-3/4" />
          <Bone className="h-[58px]" />
        </div>
      </div>
    </TopBarSkeleton>
  );
}
