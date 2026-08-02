"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AUCTION_IMAGE_BUCKET } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  auctionEndAt,
  hasFieldError,
  isAuctionDuration,
  validateAuctionInput,
  type AuctionFieldErrors,
  type AuctionInput,
} from "./auction-input";

/**
 * 경매 등록·수정·삭제 (F1).
 *
 * 서버 액션은 화면을 거치지 않고 POST 로 직접 호출될 수 있다. 그래서 로그인·소유
 * 여부·입력값을 **여기서 다시 판정한다.** 최종 판정은 RLS 가 한 번 더 한다 —
 * 수정은 `주최자 + OPEN`, 삭제는 `주최자 + 사연 0건` 이 DB 정책으로 걸려 있다.
 *
 * 실패하면 **입력값을 유지한 채** 화면에 머무를 수 있도록 결과만 돌려준다.
 * 절대 초기화하지 않는다 (F1 4.3 · 완료 조건 6).
 */

export type AuctionSubmitResult =
  | { ok: false; reason: "INVALID"; fieldErrors: AuctionFieldErrors }
  | { ok: false; reason: "UNAUTHENTICATED" }
  /** 내 경매가 아니거나 이미 마감됐다 (F1 4.1) */
  | { ok: false; reason: "FORBIDDEN" }
  | { ok: false; reason: "ERROR"; message: string };

export type DeleteAuctionResult =
  | { ok: false; reason: "UNAUTHENTICATED" }
  /** 사연이 1건이라도 있으면 지울 수 없다 (F1 3.6) */
  | { ok: false; reason: "HAS_EPISODES" }
  | { ok: false; reason: "FORBIDDEN" }
  | { ok: false; reason: "ERROR"; message: string };

const GENERIC_ERROR = "등록에 실패했어요. 잠시 후 다시 시도해주세요";

/** 성공하면 등록한 경매 상세로 이동한다 (F1 3.4). 그 시점부터 등록자가 주최자다 */
export async function createAuction(
  input: AuctionInput,
): Promise<AuctionSubmitResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };

  const fieldErrors = validateAuctionInput(input);
  if (hasFieldError(fieldErrors)) {
    return { ok: false, reason: "INVALID", fieldErrors };
  }
  if (!isAuctionDuration(input.days)) {
    return { ok: false, reason: "INVALID", fieldErrors: { days: "필수 입력 항목입니다" } };
  }

  /**
   * 배송지는 **요건이 아니라 선택이다** (F1 3.2 개정). 전달 방법은 낙찰 뒤
   * 채팅에서 정하고 (F6 2), 직거래면 주소 자체가 필요 없다.
   *
   * 그래도 이미 등록해 둔 사람은 발송지 스냅샷으로 붙여 둔다. 조회가 실패해도
   * 등록을 막지 않는다 — 없어도 되는 값 때문에 되는 일을 멈추지 않는다.
   */
  const { data: address } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("auctions")
    .insert({
      user_id: user.id,
      address_id: address?.id ?? null,
      title: input.title.trim(),
      description: input.description.trim(),
      image_urls: input.imageUrls,
      end_at: auctionEndAt(input.days),
      // 상태는 기본값 OPEN 이다. 상태·낙찰은 RPC 로만 바뀐다
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, reason: "ERROR", message: GENERIC_ERROR };
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.auctions);

  redirect(ROUTES.auction(data.id));
}

/**
 * 수정 — **소유 여부만으로 판단한다** (F1 3.5). 다른 조건을 추가하지 않는다.
 * 마감된 경매는 RLS 가 막는다 (`status = 'OPEN'`).
 *
 * 기간은 바꾸지 않는다. 마감 시각은 등록 시점에 정해지고, 뒤늦게 옮기면
 * 이미 사연을 쓴 사람의 남은 시간이 말없이 바뀐다.
 */
export async function updateAuction(
  auctionId: string,
  input: Omit<AuctionInput, "days">,
): Promise<AuctionSubmitResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };

  const fieldErrors = validateAuctionInput({ ...input, days: 1 });
  delete fieldErrors.days;
  if (hasFieldError(fieldErrors)) {
    return { ok: false, reason: "INVALID", fieldErrors };
  }

  const { data, error } = await supabase
    .from("auctions")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      image_urls: input.imageUrls,
    })
    .eq("id", auctionId)
    .select("id");

  if (error) return { ok: false, reason: "ERROR", message: GENERIC_ERROR };
  // 정책에 막히면 오류 없이 0건이 돌아온다. 내 경매가 아니거나 이미 마감됐다는 뜻이다
  if (!data || data.length === 0) return { ok: false, reason: "FORBIDDEN" };

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.auctions);

  redirect(ROUTES.auction(auctionId));
}

/**
 * 삭제 — 주최자 + 사연 0건 (F1 3.6).
 *
 * 확인 직전에 사연이 등록됐을 수 있으므로 **서버가 삭제 시점에 다시 판정한다.**
 * 판정은 RLS 가 하고(0건 반환), 여기서는 사용자에게 보여줄 사유만 가려낸다 (F1 4.3).
 */
export async function deleteAuction(
  auctionId: string,
): Promise<DeleteAuctionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };

  const { data: auction, error: readError } = await supabase
    .from("auctions")
    .select("id, user_id, image_urls")
    .eq("id", auctionId)
    .maybeSingle();

  if (readError || !auction) {
    return { ok: false, reason: "ERROR", message: "경매를 불러오지 못했어요" };
  }
  if (auction.user_id !== user.id) return { ok: false, reason: "FORBIDDEN" };

  const { data: deleted, error } = await supabase
    .from("auctions")
    .delete()
    .eq("id", auctionId)
    .select("id");

  if (error) {
    return { ok: false, reason: "ERROR", message: "삭제하지 못했어요" };
  }

  if (!deleted || deleted.length === 0) {
    // 정책이 막았다. 소유는 위에서 확인했으니 남은 사유는 사연이다
    return { ok: false, reason: "HAS_EPISODES" };
  }

  // 경매를 지우면 이미지도 함께 정리한다 (데이터 모델 §11.5).
  // 실패해도 삭제 자체는 되돌리지 않는다 — 남는 것은 파일 몇 개뿐이다
  const paths = auction.image_urls
    .map(storageObjectPath)
    .filter((path): path is string => path !== null);
  if (paths.length > 0) {
    await supabase.storage.from(AUCTION_IMAGE_BUCKET).remove(paths);
  }

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.auctions);

  redirect(ROUTES.home);
}

/** 공개 URL 에서 버킷 안 경로만 떼어낸다. 우리 버킷이 아니면 `null` */
function storageObjectPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${AUCTION_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
