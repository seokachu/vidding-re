"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  EPISODE_CONTENT_MAX,
  EPISODE_CONTENT_MIN,
  EPISODE_TITLE_MAX,
  EPISODE_TITLE_MIN,
  isBidStep,
} from "@/lib/constants";
import { getAuctionContext } from "@/lib/relationship.server";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

import { loadEpisodes } from "./data";
import type { EpisodeList } from "./types";

/**
 * 경매 상세·사연 작성의 쓰기 경로.
 *
 * **포인트·공감·삭제는 RPC 로만 바꾼다** (docs/구조.md · supabase/README 3).
 * 잔액과 원장이 한 트랜잭션에서 함께 움직여야 하기 때문이다.
 *
 * 서버 함수는 UI 를 거치지 않고 POST 로 직접 호출될 수 있다. 그래서
 * **버튼을 감춘 것과 무관하게 이 안에서 관계를 다시 판정한다** (00-관계-판정 4).
 * 최종 방어선은 RLS 와 RPC 다 (P6).
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string };

/** RPC 가 던지는 예외를 사람이 읽을 문구로 옮긴다 (supabase/migrations/…_functions.sql) */
const RPC_MESSAGE: Record<string, string> = {
  AUTH_REQUIRED: "로그인이 필요합니다",
  EPISODE_NOT_FOUND: "사연을 찾을 수 없습니다",
  NOT_EPISODE_AUTHOR: "본인 사연에만 입찰할 수 있습니다",
  AUCTION_CLOSED: "경매가 마감되었습니다",
  INVALID_BID_STEP: "허용되지 않는 입찰 단계입니다",
  BID_MUST_INCREASE: "이미 같거나 더 높은 단계로 입찰했습니다",
  INSUFFICIENT_POINTS: "보유 포인트가 부족합니다",
  SELF_LIKE: "자기 사연에는 공감할 수 없습니다",
  WINNING_EPISODE: "낙찰된 사연은 지울 수 없어요",
};

const FALLBACK = "잠시 후 다시 시도해주세요";

function messageOf(error: { message?: string; details?: string | null }): string {
  const key = error.message?.trim() ?? "";
  return RPC_MESSAGE[key] ?? error.details ?? FALLBACK;
}

/* --- 공감 (F4) ------------------------------------------------------------ */

/**
 * 공감 토글. **가중치는 서버가 정한다** — 화면에서 50/10 을 계산하지 않는다 (F4 3.1).
 * 반환값은 '지금 공감한 상태인가'다.
 */
export async function toggleLikeAction(
  episodeId: string,
): Promise<ActionResult<{ liked: boolean }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("toggle_episode_like", {
    p_episode_id: episodeId,
  });

  if (error) return { ok: false, message: messageOf(error) };

  // 점수는 뷰가 집계한다. 화면을 다시 그려 최신 순위를 받는다 (F4 3.5)
  refresh();
  return { ok: true, data: { liked: data } };
}

/* --- 입찰 (F3 3.3) -------------------------------------------------------- */

/** 포인트 입찰. 올리기만 가능하고 차액만 차감한다. 검증의 최종 판정은 RPC 가 한다 */
export async function placeBidAction(
  episodeId: string,
  amount: number,
): Promise<ActionResult> {
  if (!isBidStep(amount)) {
    return { ok: false, message: RPC_MESSAGE.INVALID_BID_STEP };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("place_bid", {
    p_episode_id: episodeId,
    p_new_amount: amount,
  });

  if (error) return { ok: false, message: messageOf(error) };

  refresh();
  return { ok: true };
}

/* --- 사연 삭제 (F3 3.4) --------------------------------------------------- */

/** 삭제는 RPC 하나로만 가능하다. 직접 DELETE 는 정책 자체가 없다 (supabase/README 3) */
export async function deleteEpisodeAction(
  episodeId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_episode", {
    p_episode_id: episodeId,
  });

  if (error) return { ok: false, message: messageOf(error) };

  // 참여자 → 방문자 전이가 화면에 반영되어야 한다 (00-관계-판정 3.4)
  refresh();
  return { ok: true };
}

/* --- 사연 목록 더보기 (F3 3.6) -------------------------------------------- */

/**
 * 다음 10건을 이어 붙인다. 자동 무한 스크롤을 쓰지 않는다 —
 * 하단 고정 참여 버튼에 도달하지 못하게 되기 때문이다 (F3 3.6).
 */
export async function loadMoreEpisodesAction(
  auctionId: string,
  limit: number,
): Promise<ActionResult<EpisodeList>> {
  const result = await getAuctionContext(auctionId);
  if (!result.ok) return { ok: false, message: FALLBACK };

  const { userId, winningEpisodeId } = result.context;
  const list = await loadEpisodes({
    auctionId,
    viewerId: userId,
    winningEpisodeId,
    limit,
  });

  if (!list) return { ok: false, message: FALLBACK };
  return { ok: true, data: list };
}

/* --- 사연 작성 · 수정 (F3 3.2) -------------------------------------------- */

export type EpisodeFormState = {
  message?: string;
  fieldErrors?: { title?: string; content?: string };
  /** 사연은 저장됐는데 입찰만 실패했다. 사연을 되돌리지 않는다 (F3 4.4) */
  bidFailed?: boolean;
  values?: { title: string; content: string };
};

function validate(title: string, content: string) {
  const fieldErrors: { title?: string; content?: string } = {};

  if (title.length < EPISODE_TITLE_MIN) {
    fieldErrors.title = `제목은 ${EPISODE_TITLE_MIN}자 이상 입력해주세요`;
  } else if (title.length > EPISODE_TITLE_MAX) {
    fieldErrors.title = `제목은 ${EPISODE_TITLE_MAX}자까지 쓸 수 있어요`;
  }

  if (content.length < EPISODE_CONTENT_MIN) {
    fieldErrors.content = `내용은 ${EPISODE_CONTENT_MIN}자 이상 입력해주세요`;
  } else if (content.length > EPISODE_CONTENT_MAX) {
    fieldErrors.content = `내용은 ${EPISODE_CONTENT_MAX}자까지 쓸 수 있어요`;
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * 사연 작성 + 첫 입찰. 두 단계지만 화면에서는 한 번에 낸다 (F3 3.1).
 *
 * **사연이 저장된 뒤 입찰이 실패해도 사연을 되돌리지 않는다** (F3 4.4).
 * 그때는 상세로 보내 입찰만 다시 시도하게 한다.
 */
export async function createEpisodeAction(
  _prev: EpisodeFormState,
  formData: FormData,
): Promise<EpisodeFormState> {
  const auctionId = String(formData.get("auctionId") ?? "");
  // 공백만 입력한 것은 미입력으로 처리한다 (F3 4.2)
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const bid = Number(formData.get("bid") ?? 0);
  const values = { title, content };

  const fieldErrors = validate(title, content);
  if (fieldErrors) return { fieldErrors, values };

  // 화면을 우회한 요청도 여기서 걸러낸다. 방문자만 쓸 수 있다 (00-관계-판정 3.5)
  const result = await getAuctionContext(auctionId);
  if (!result.ok) return { message: "경매를 찾을 수 없습니다", values };
  if (!result.context.can.writeEpisode) {
    return {
      message: result.context.isClosed
        ? "경매가 마감되었습니다"
        : "이 경매에는 사연을 쓸 수 없어요",
      values,
    };
  }

  const supabase = await createClient();
  const { data: episode, error } = await supabase
    .from("episodes")
    .insert({
      auction_id: auctionId,
      user_id: result.context.userId!,
      title,
      content,
    })
    .select("id")
    .single();

  // 실패하면 입력한 내용을 유지한 채 화면에 머무른다 (F3 4.4)
  if (error || !episode) {
    return { message: messageOf(error ?? {}), values };
  }

  if (isBidStep(bid)) {
    const { error: bidError } = await supabase.rpc("place_bid", {
      p_episode_id: episode.id,
      p_new_amount: bid,
    });

    if (bidError) {
      revalidatePath(ROUTES.auction(auctionId));
      return {
        bidFailed: true,
        message: `사연은 등록되었습니다. 포인트 입찰을 다시 시도해주세요 (${messageOf(bidError)})`,
      };
    }
  }

  revalidatePath(ROUTES.auction(auctionId));
  redirect(ROUTES.auction(auctionId));
}

/** 사연 수정. 작성자만, 진행중인 경매에서만 (F3 3.4 · RLS episodes_update_author) */
export async function updateEpisodeAction(
  _prev: EpisodeFormState,
  formData: FormData,
): Promise<EpisodeFormState> {
  const auctionId = String(formData.get("auctionId") ?? "");
  const episodeId = String(formData.get("episodeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const values = { title, content };

  const fieldErrors = validate(title, content);
  if (fieldErrors) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase
    .from("episodes")
    .update({ title, content })
    .eq("id", episodeId);

  if (error) return { message: messageOf(error), values };

  revalidatePath(ROUTES.auction(auctionId));
  redirect(ROUTES.auction(auctionId));
}

/* --- 경매 수정 · 삭제 (F1 3.5 · 3.6) -------------------------------------- */

export type AuctionFormState = {
  message?: string;
  fieldErrors?: { title?: string; description?: string };
  values?: { title: string; description: string };
};

export async function updateAuctionAction(
  _prev: AuctionFormState,
  formData: FormData,
): Promise<AuctionFormState> {
  const auctionId = String(formData.get("auctionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { title, description };

  const fieldErrors: { title?: string; description?: string } = {};
  if (!title) fieldErrors.title = "필수 입력 항목입니다";
  if (!description) fieldErrors.description = "필수 입력 항목입니다";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // 소유 여부만으로 판단한다. 다른 조건을 추가하지 않는다 (F1 3.5)
  const result = await getAuctionContext(auctionId);
  if (!result.ok) return { message: "경매를 찾을 수 없습니다", values };
  if (!result.context.can.editAuction) {
    return { message: "이 경매를 수정할 수 없어요", values };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("auctions")
    .update({ title, description })
    .eq("id", auctionId);

  // 실패해도 입력값을 유지한 채 화면에 머무른다. 절대 초기화하지 않는다 (F1 4.3)
  if (error) return { message: messageOf(error), values };

  revalidatePath(ROUTES.auction(auctionId));
  redirect(ROUTES.auction(auctionId));
}

/**
 * 경매 삭제. **사연이 1건이라도 있으면 지울 수 없다** (F1 3.6).
 * 주최자 한 사람의 조작으로 제3자의 기록이 사라지면 안 된다.
 * 버튼을 감춰도 요청은 도달할 수 있으므로 여기서도, RLS 에서도 막는다.
 */
export async function deleteAuctionAction(
  auctionId: string,
): Promise<ActionResult> {
  const result = await getAuctionContext(auctionId);
  if (!result.ok) return { ok: false, message: "경매를 찾을 수 없습니다" };

  const { relationship, can, episodeCount } = result.context;

  if (!can.deleteAuction) {
    // 거절 사유를 뭉뚱그리지 않는다. 주최자가 아닌 것과 참여자가 생긴 것은 다른 일이다
    return {
      ok: false,
      message:
        relationship === "HOST" && episodeCount > 0
          ? "참여자가 있어 삭제할 수 없어요. 문의가 필요하면 채팅으로 안내해주세요."
          : "이 경매를 지울 수 없어요",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("auctions").delete().eq("id", auctionId);

  if (error) return { ok: false, message: messageOf(error) };

  revalidatePath(ROUTES.auctions);
  redirect(ROUTES.home);
}
