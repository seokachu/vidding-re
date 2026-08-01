import { Bone, TopBarSkeleton } from "@/components/layout/skeleton";

/** 포인트 내역 (S15) 이 도착하기 전 */
export default function Loading() {
  return (
    <TopBarSkeleton title="포인트 내역">
      <ul className="px-gutter">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="flex items-start gap-3 border-b border-border py-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Bone className="h-[22px] w-24" />
              <Bone className="h-5 w-2/3" />
              <Bone className="h-4 w-16" />
            </div>
            <Bone className="h-[22px] w-20 shrink-0" />
          </li>
        ))}
      </ul>
    </TopBarSkeleton>
  );
}
