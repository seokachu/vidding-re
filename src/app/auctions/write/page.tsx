import { redirect } from "next/navigation";

import { TopAppBar } from "@/components/ui";
import { AuctionForm } from "@/features/explore/auction-form";
import { ListErrorState } from "@/features/explore/list-error-state";
import { requireAuthUser } from "@/lib/auth";
import { isAuctionClosed } from "@/lib/relationship";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "경매 등록 — Vidding" };

/**
 * 경매 등록·수정 (S06 · F1).
 *
 * 수정은 `?auction_id={id}` 로 들어온다 (F1 3.5). 판정은 **소유 여부만**이다 —
 * 다른 조건을 더하지 않는다. 남의 경매나 없는 경매로 들어오면 주소창 직접 입력이라도
 * 홈으로 보내고, 마감된 경매는 상세로 되돌린다 (F1 4.1 · 완료 조건 4).
 *
 * Next 16 에서 `searchParams` 는 Promise 다.
 */
export default async function AuctionWritePage({
  searchParams,
}: {
  searchParams: Promise<{ auction_id?: string | string[] }>;
}) {
  const { auction_id: rawId } = await searchParams;
  const auctionId = typeof rawId === "string" ? rawId : undefined;

  // 프록시가 이미 걸러내지만 서버 판정이 최종이다
  const user = await requireAuthUser(ROUTES.auctionWrite);
  const supabase = await createClient();

  if (auctionId) {
    const { data: auction, error } = await supabase
      .from("auctions")
      .select("id, user_id, title, description, image_urls, status, end_at")
      .eq("id", auctionId)
      .maybeSingle();

    if (error) {
      return (
        <>
          <TopAppBar title="경매 수정" />
          <ListErrorState description="경매를 불러오지 못했어요" />
        </>
      );
    }

    if (!auction || auction.user_id !== user.id) redirect(ROUTES.home);

    // 마감 시각이 지났으면 크론 처리 전이라도 마감으로 본다 (데이터 모델 §9)
    if (isAuctionClosed({ status: auction.status, endAt: auction.end_at })) {
      redirect(ROUTES.auction(auction.id));
    }

    return (
      <>
        <TopAppBar title="경매 수정" />
        <AuctionForm
          userId={user.id}
          auction={{
            id: auction.id,
            title: auction.title,
            description: auction.description,
            imageUrls: auction.image_urls,
          }}
        />
      </>
    );
  }

  /**
   * 배송지는 신분이 아니라 **행위의 요건**이다 (F1 3.2).
   * 없으면 등록 화면으로 보내고, 마치면 여기로 돌아온다.
   */
  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (addressError) {
    return (
      <>
        <TopAppBar title="경매 등록" />
        <ListErrorState description="배송지를 확인하지 못했어요" />
      </>
    );
  }

  if (!address) {
    redirect(`${ROUTES.address}?next=${encodeURIComponent(ROUTES.auctionWrite)}`);
  }

  return (
    <>
      <TopAppBar title="경매 등록" />
      <AuctionForm userId={user.id} />
    </>
  );
}
