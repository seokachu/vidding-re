import { Bone, TopBarSkeleton } from "@/components/layout/skeleton";

/**
 * 1:1 채팅 (S10) 이 도착하기 전.
 *
 * 상대 닉네임은 서버에서 와야 알 수 있으므로 제목은 비워 둔다.
 * 말풍선은 좌우를 번갈아 놓아 대화처럼 보이게 한다.
 */
export default function Loading() {
  return (
    <TopBarSkeleton>
      <div className="flex flex-col gap-4 px-gutter pt-3">
        {/* 안내 배너 */}
        <Bone className="h-[46px]" />

        <div className="flex flex-col gap-3">
          {[false, true, false, true].map((mine, i) => (
            <div key={i} className={mine ? "flex justify-end" : "flex"}>
              <Bone
                className={mine ? "h-[42px] w-3/5" : "h-[42px] w-2/3"}
              />
            </div>
          ))}
        </div>
      </div>
    </TopBarSkeleton>
  );
}
