import { Bone, FieldBone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 경매 수정 (S06b) 이 도착하기 전. 등록과 같되 기간이 없다 */
export default function Loading() {
  return (
    <TopBarSkeleton title="경매 수정" cta>
      <div className="flex flex-col gap-[22px] px-gutter pt-4">
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
      </div>
    </TopBarSkeleton>
  );
}
