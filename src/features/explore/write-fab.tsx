import { Fab } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 경매 등록 진입점 (F1 3.1 · F2 3.5).
 *
 * `.pen` 은 화면 안에 스크롤이 없어 이 버튼을 목록 뒤에 흐름대로 그렸다.
 * 그대로 두면 목록 끝까지 내려야 보이는 버튼이 되고, 반대로 고정시키면
 * 짧은 목록에서 마지막 카드를 덮는다.
 *
 * **`sticky` 가 둘 다 만족한다.** 스크롤 중에는 하단 탭 위에 떠 있고,
 * 목록 끝에 닿으면 `.pen` 이 그린 자리로 내려앉는다.
 */
export function WriteFab() {
  return (
    <div className="sticky bottom-[84px] z-30 flex justify-end px-gutter pt-5">
      <Fab href={ROUTES.auctionWrite} />
    </div>
  );
}
