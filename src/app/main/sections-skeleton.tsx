import { Bone, CardBone } from "@/components/layout/skeleton";

/**
 * 홈의 두 목록이 도착하기 전 (S01).
 *
 * `loading.tsx` 와 페이지 안의 스트리밍 폴백이 **같은 것을 쓴다.** 따로 두면
 * 서버 응답이 오는 순간 뼈대가 한 번 바뀌어 화면이 두 번 흔들린다.
 *
 * 제목 영역은 여기 없다 — 그건 조회를 기다리지 않으므로 페이지가 곧장 그린다.
 */
export function HomeSectionsSkeleton() {
  return (
    <>
      {/* 마감 임박 — 가로 스크롤 */}
      <section className="flex flex-col gap-3.5">
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
      <section className="flex flex-col gap-3 px-gutter pt-8">
        <div className="flex items-center justify-between">
          <Bone className="h-7 w-32" />
          <Bone className="h-5 w-12" />
        </div>
        {[0, 1, 2].map((i) => (
          <CardBone key={i} />
        ))}
      </section>
    </>
  );
}
