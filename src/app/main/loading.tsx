import {
  Bone,
  CardBone,
  TabShellSkeleton,
} from "@/components/layout/tab-shell-skeleton";

/** 홈 (S01) 이 도착하기 전 */
export default function Loading() {
  return (
    <TabShellSkeleton>
      <section className="flex flex-col gap-2 px-gutter pb-7 pt-4">
        <Bone className="h-9 w-3/4" />
        <Bone className="h-6 w-1/2" />
      </section>

      {/* 마감 임박 — 가로 스크롤 */}
      <section className="flex flex-col gap-3 pb-7">
        <div className="flex items-center justify-between px-gutter">
          <Bone className="h-7 w-24" />
          <Bone className="h-5 w-12" />
        </div>
        <div className="flex gap-3 overflow-hidden px-gutter">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex w-[158px] shrink-0 flex-col gap-2">
              <Bone className="h-[118px]" />
              <Bone className="h-[18px] w-4/5" />
              <Bone className="h-4 w-3/5" />
            </div>
          ))}
        </div>
      </section>

      {/* 최근 올라온 경매 */}
      <section className="flex flex-col gap-3 px-gutter">
        <div className="flex items-center justify-between">
          <Bone className="h-7 w-32" />
          <Bone className="h-5 w-12" />
        </div>
        {[0, 1, 2].map((i) => (
          <CardBone key={i} />
        ))}
      </section>
    </TabShellSkeleton>
  );
}
