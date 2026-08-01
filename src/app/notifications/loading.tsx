import { Bone, TabShellSkeleton } from "@/components/layout/skeleton";

/** 알림 (S08) 이 도착하기 전 */
export default function Loading() {
  return (
    <TabShellSkeleton title="알림">
      <ul className="px-gutter">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="flex items-start gap-3 border-b border-border py-4"
          >
            <Bone className="size-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-[18px] w-1/2" />
              <Bone className="h-4 w-full" />
              <Bone className="h-3.5 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </TabShellSkeleton>
  );
}
