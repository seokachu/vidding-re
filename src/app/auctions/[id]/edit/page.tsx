import { notFound, redirect } from "next/navigation";

import { TopAppBar } from "@/components/ui";
import { getAuctionContext } from "@/lib/relationship.server";
import { ROUTES } from "@/lib/routes";
import { AuctionEditForm } from "@/features/auction-detail/auction-edit-form";
import { loadAuctionDetail } from "@/features/auction-detail/data";
import { ErrorScreen } from "@/features/auction-detail/error-screen";

export const metadata = { title: "경매 수정 — Vidding" };

/**
 * 경매 수정 (F1 3.5).
 *
 * **타인 경매의 수정 진입은 주소창 직접 입력을 포함해 차단한다** (F1 4.1 · 완료 조건 4).
 * 마감된 경매도 되돌린다 — RLS `auctions_update_owner` 도 `status = 'OPEN'` 을 건다.
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

  // 관계를 판정하지 못했으면 수정 화면을 열지 않는다 (00-관계-판정 4)
  if (result.context.relationship === null) {
    return <ErrorScreen title="경매 수정" />;
  }

  // 주최자 + 진행중일 때만 열린다
  if (!result.context.can.editAuction) redirect(ROUTES.auction(id));

  const auction = await loadAuctionDetail(id);
  if (!auction) return <ErrorScreen title="경매 수정" />;

  return (
    <>
      <TopAppBar title="경매 수정" />
      <AuctionEditForm auction={auction} />
    </>
  );
}
