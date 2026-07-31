import { notFound, redirect } from "next/navigation";

import { TopAppBar } from "@/components/ui";
import { getAuctionContext } from "@/lib/relationship.server";
import { ROUTES } from "@/lib/routes";
import { AuctionForm } from "@/features/explore";
import { loadAuctionDetail } from "@/features/auction-detail/data";
import { ErrorScreen } from "@/features/auction-detail/error-screen";

export const metadata = { title: "경매 수정 — Vidding" };

/**
 * 경매 수정 (F1 3.5).
 *
 * **타인 경매의 수정 진입은 주소창 직접 입력을 포함해 차단한다** (F1 4.1 · 완료 조건 4).
 * 마감된 경매도 되돌린다 — RLS `auctions_update_owner` 도 `status = 'OPEN'` 을 건다.
 *
 * 폼은 등록 화면과 **같은 것**을 쓴다 (`features/explore/AuctionForm`).
 * 이미지 업로드가 붙은 폼이 하나뿐이라, 둘로 나누면 수정에서만 사진을 못 바꾸는
 * 상태가 된다. **기간은 수정 대상이 아니다** — 마감 시각을 뒤늦게 옮기면 그 시각을
 * 보고 사연을 쓴 사람의 남은 시간이 말없이 바뀐다 (F5 3.2.1).
 *
 * > 주소는 `/auctions/[id]/edit` 다. F1 3.5 는 `/auctions/write?auction_id=` 로
 * > 적었지만 상세에서 이어지는 흐름이라 상세 아래에 두었다. 스펙 쪽을 고쳐야 한다.
 */
export default async function AuctionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getAuctionContext(id);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return <ErrorScreen title="경매 수정" />;
  }

  const { relationship, can, userId } = result.context;

  // 관계를 판정하지 못했으면 수정 화면을 열지 않는다 (00-관계-판정 4)
  if (relationship === null || !userId) {
    return <ErrorScreen title="경매 수정" />;
  }

  // 주최자 + 진행중일 때만 열린다
  if (!can.editAuction) redirect(ROUTES.auction(id));

  const auction = await loadAuctionDetail(id);
  if (!auction) return <ErrorScreen title="경매 수정" />;

  return (
    <>
      <TopAppBar title="경매 수정" />
      <AuctionForm
        userId={userId}
        auction={{
          id: auction.id,
          title: auction.title,
          description: auction.description,
          imageUrls: auction.imageUrls,
        }}
      />
    </>
  );
}
