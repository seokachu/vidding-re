import { Bone, FieldBone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 경매 등록 (S06) 이 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton title="경매 등록" cta>
      <div className="flex flex-col gap-[22px] px-gutter pt-4">
        {/* 사진 3칸 */}
        <div className="flex flex-col gap-[7px]">
          <div className="flex items-center justify-between">
            <Bone className="h-[18px] w-12" />
            <Bone className="h-[18px] w-10" />
          </div>
          <div className="flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-[106px] flex-1" />
            ))}
          </div>
        </div>

        <FieldBone />
        <FieldBone tall />

        {/* 기간 3칸 */}
        <div className="flex flex-col gap-[7px]">
          <Bone className="h-[18px] w-12" />
          <div className="flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-[50px] flex-1" />
            ))}
          </div>
          <Bone className="h-4 w-52" />
        </div>
      </div>
    </TopBarSkeleton>
  );
}
