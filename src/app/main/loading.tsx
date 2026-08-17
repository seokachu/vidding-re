import { Bone, TabShellSkeleton } from "@/components/layout/skeleton";

import { HomeSectionsSkeleton } from "./sections-skeleton";

/** 홈 (S01) 이 도착하기 전 */
export default function Loading() {
  return (
    <TabShellSkeleton>
      <section className="flex flex-col gap-2 px-gutter pb-7 pt-4">
        <Bone className="h-9 w-3/4" />
        <Bone className="h-6 w-1/2" />
      </section>

      <HomeSectionsSkeleton />
    </TabShellSkeleton>
  );
}
