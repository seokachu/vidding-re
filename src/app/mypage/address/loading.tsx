import { Bone, FieldBone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 배송지 (S11) 가 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton title="배송지" cta>
      <div className="flex flex-col gap-5 px-gutter pt-5">
        <FieldBone />
        <FieldBone />

        {/* 주소 — 우편번호 + 검색 버튼, 기본 주소, 상세 주소 */}
        <div className="flex flex-col gap-[7px]">
          <Bone className="h-[18px] w-12" />
          <div className="flex gap-2">
            <Bone className="h-[50px] flex-1" />
            <Bone className="h-[50px] w-[88px]" />
          </div>
          <Bone className="h-[50px]" />
          <Bone className="h-[50px]" />
          <Bone className="h-4 w-full" />
        </div>
      </div>
    </TopBarSkeleton>
  );
}
