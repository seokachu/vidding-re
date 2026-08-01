import {
  Bone,
  CardBone,
  TabShellSkeleton,
} from "@/components/layout/skeleton";

/** 경매 목록 (S02) 이 도착하기 전 */
export default function Loading() {
  return (
    <TabShellSkeleton title="경매 현황">
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <Bone className="h-12" />
        <Bone className="h-[43px] rounded-md" />

        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <CardBone key={i} />
          ))}
        </div>
      </div>
    </TabShellSkeleton>
  );
}
