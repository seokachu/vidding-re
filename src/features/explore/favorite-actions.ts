"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * 찜하기 (F7).
 *
 * **내 행 하나만 추가하거나 삭제한다.** 다른 사용자의 값을 읽거나 쓰지 않으므로
 * 동시 조작 경합이 없다 (F7 3.3). 찜 수는 어디에도 세지 않는다 (완료 조건 6-1).
 *
 * 서버 액션은 프록시를 거치지 않고 POST 로 직접 호출될 수 있다. 그래서 로그인과
 * 주최자 여부를 **여기서 다시 확인한다.** 최종 판정은 RLS 가 한 번 더 한다 (P6).
 */

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  /** 비회원이다. 로그인으로 유도하고 로그인 후 원래 경매로 돌려보낸다 (F7 4) */
  | { ok: false; reason: "UNAUTHENTICATED" }
  /** 주최자는 자기 경매를 찜하지 않는다 (F7 3.1) */
  | { ok: false; reason: "FORBIDDEN" }
  | { ok: false; reason: "ERROR" };

export async function toggleFavorite(
  auctionId: string,
): Promise<ToggleFavoriteResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };

  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select("id, user_id")
    .eq("id", auctionId)
    .maybeSingle();

  // 경매를 못 읽었으면 판정할 수 없다. 열지 않는다 (00-관계-판정 4)
  if (auctionError || !auction) return { ok: false, reason: "ERROR" };
  if (auction.user_id === user.id) return { ok: false, reason: "FORBIDDEN" };

  const { data: existing, error: readError } = await supabase
    .from("auction_favorites")
    .select("id")
    .eq("auction_id", auctionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { ok: false, reason: "ERROR" };

  if (existing) {
    const { error } = await supabase
      .from("auction_favorites")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, reason: "ERROR" };
  } else {
    const { error } = await supabase
      .from("auction_favorites")
      .insert({ auction_id: auctionId, user_id: user.id });
    // 마감 여부를 보지 않는다 — 개인 북마크다 (F7 3.4 · 완료 조건 7)
    if (error) return { ok: false, reason: "ERROR" };
  }

  // 마이페이지 찜 목록이 다음 방문에 최신을 보게 한다 (F7 3.5 · F8)
  revalidatePath(ROUTES.mypage);

  return { ok: true, favorited: !existing };
}
