import { redirect } from "next/navigation";

import { ErrorState, TopAppBar } from "@/components/ui";
import { AuctionForm } from "@/features/explore/auction-form";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "경매 등록 — Vidding" };

/**
 * 경매 등록 (S06 · F1).
 *
 * **수정은 여기가 아니라 `/auctions/[id]/edit` 이다.** 폼은 같은 것을 쓰지만
 * 화면은 나눴다. 수정은 상세에서 이어지는 흐름이고, 진입 판정도 관계 판정
 * (`getAuctionContext` → `can.editAuction`)을 그대로 타야 하기 때문이다.
 */
export default async function AuctionWritePage() {
  // 프록시가 이미 걸러내지만 서버 판정이 최종이다
  const user = await requireAuthUser(ROUTES.auctionWrite);
  const supabase = await createClient();

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
        <ErrorState description="배송지를 확인하지 못했어요" />
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
