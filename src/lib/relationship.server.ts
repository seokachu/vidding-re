import "server-only";

import {
  abilities,
  isAuctionClosed,
  resolveRelationship,
  type Abilities,
  type Relationship,
} from "./relationship";
import { createClient } from "./supabase/server";

/**
 * 경매 상세 진입 시 **서버에서 1회** 판정한다 (00-관계-판정 3.3).
 * 관계는 경매 1건에 대해서만 유효하고, 저장하지 않는다.
 */

export type AuctionContext = {
  auctionId: string;
  /** 주최자 */
  hostId: string;
  status: "OPEN" | "CLOSED";
  endAt: string;
  episodeCount: number;
  winningEpisodeId: string | null;
  winnerUserId: string | null;
  /** 로그인 사용자. 없으면 비회원 */
  userId: string | null;
  /** 내 사연. 참여자 관계의 근거다 */
  myEpisodeId: string | null;
  /** `end_at` 이 지났으면 처리 완료 전이라도 마감으로 본다 */
  isClosed: boolean;
  /** 판정 불가면 `null`. 방문자로 확정하지 않는다 */
  relationship: Relationship | null;
  can: Abilities;
};

export type AuctionContextResult =
  | { ok: true; context: AuctionContext }
  /** 경매가 없다 — 404 로 보낸다 */
  | { ok: false; reason: "NOT_FOUND" }
  /** 조회에 실패했다 — 에러 화면과 재시도를 준다. 액션 버튼은 하나도 노출하지 않는다 */
  | { ok: false; reason: "ERROR" };

/**
 * 경매 1건에 대한 나의 관계와 허용 액션을 판정한다.
 *
 * 조회 두 번이면 끝난다.
 *   1. 경매 요약 (`v_auction_summary`) — 주최자·상태·마감·사연 수를 한 번에
 *   2. 내 사연 존재 여부 — `UNIQUE (auction_id, user_id)` 인덱스를 그대로 탄다
 */
export async function getAuctionContext(
  auctionId: string,
): Promise<AuctionContextResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const { data: summary, error: summaryError } = await supabase
    .from("v_auction_summary")
    .select(
      "auction_id, user_id, status, end_at, episode_count, winning_episode_id",
    )
    .eq("auction_id", auctionId)
    .maybeSingle();

  if (summaryError) return { ok: false, reason: "ERROR" };
  if (!summary) return { ok: false, reason: "NOT_FOUND" };

  // 낙찰자는 저장하지 않고 경매에서 도출한다 (P2)
  let winnerUserId: string | null = null;
  if (summary.winning_episode_id) {
    const { data: winner } = await supabase
      .from("episodes")
      .select("user_id")
      .eq("id", summary.winning_episode_id)
      .maybeSingle();
    winnerUserId = winner?.user_id ?? null;
  }

  /**
   * `null` 은 "모른다"다. 비회원이면 조회할 것도 없으므로 `false` 로 확정한다.
   * 로그인 사용자인데 조회가 실패하면 `null` 로 남겨 판정을 보류한다 (4).
   */
  let hasMyEpisode: boolean | null = false;
  let myEpisodeId: string | null = null;

  if (userId && userId !== summary.user_id) {
    const { data: mine, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("auction_id", auctionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (episodeError) {
      hasMyEpisode = null;
    } else {
      myEpisodeId = mine?.id ?? null;
      hasMyEpisode = mine !== null;
    }
  }

  const relationship = resolveRelationship({
    userId,
    auctionUserId: summary.user_id,
    hasMyEpisode,
  });

  const state = {
    status: summary.status,
    endAt: summary.end_at,
    episodeCount: summary.episode_count,
    winnerUserId,
  };

  return {
    ok: true,
    context: {
      auctionId,
      hostId: summary.user_id,
      status: summary.status,
      endAt: summary.end_at,
      episodeCount: summary.episode_count,
      winningEpisodeId: summary.winning_episode_id,
      winnerUserId,
      userId,
      myEpisodeId,
      isClosed: isAuctionClosed(state),
      relationship,
      can: abilities(relationship, state, userId),
    },
  };
}
