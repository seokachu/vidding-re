import { TopAppBar } from "@/components/ui";
import { AuctionForm } from "@/features/explore/auction-form";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "경매 등록 — Vidding" };

/**
 * 경매 등록 (S06 · F1).
 *
 * **수정은 여기가 아니라 `/auctions/[id]/edit` 이다.** 폼은 같은 것을 쓰지만
 * 화면은 나눴다. 수정은 상세에서 이어지는 흐름이고, 진입 판정도 관계 판정
 * (`getAuctionContext` → `can.editAuction`)을 그대로 타야 하기 때문이다.
 *
 * **배송지를 묻지 않는다** (F1 3.2 개정). 전달 방법은 낙찰 뒤 채팅에서 정하고
 * (F6 2), 직거래면 주소 자체가 필요 없다. 여기서 막으면 아직 정해지지도 않은
 * 전달 방법 때문에 등록이 끊긴다.
 */
export default async function AuctionWritePage() {
  // 프록시가 이미 걸러내지만 서버 판정이 최종이다
  const user = await requireAuthUser(ROUTES.auctionWrite);

  return (
    <>
      <TopAppBar title="경매 등록" />
      <AuctionForm userId={user.id} />
    </>
  );
}
