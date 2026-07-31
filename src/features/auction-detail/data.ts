import "server-only";

import { LIKE_WEIGHT_HOST } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

import { EPISODE_PAGE_SIZE } from "./types";
import type {
  AuctionDetail,
  EpisodeItem,
  EpisodeList,
  ScoreBreakdown,
} from "./types";

/**
 * 경매 상세가 쓰는 조회. **관계 판정은 여기서 하지 않는다** —
 * `getAuctionContext()` 하나가 담당한다 (00-관계-판정 3.3).
 *
 * 조회 실패는 `null` 로 돌려준다. 빈 목록으로 위장하지 않는다 (docs/구조.md).
 */


export async function loadAuctionDetail(
  auctionId: string,
): Promise<AuctionDetail | null> {
  const supabase = await createClient();

  const { data: auction, error } = await supabase
    .from("auctions")
    .select(
      "id, user_id, title, description, image_urls, end_at, status, winning_episode_id",
    )
    .eq("id", auctionId)
    .maybeSingle();

  if (error || !auction) return null;

  // 닉네임은 공개 프로필 뷰에서만 온다. users 는 본인 행만 열려 있다 (supabase/README 1)
  const { data: host } = await supabase
    .from("v_user_profiles")
    .select("nick_name")
    .eq("id", auction.user_id)
    .maybeSingle();

  return {
    id: auction.id,
    hostId: auction.user_id,
    hostNickName: host?.nick_name ?? "이름없음",
    title: auction.title,
    description: auction.description,
    imageUrls: auction.image_urls,
    endAt: auction.end_at,
    status: auction.status,
    winningEpisodeId: auction.winning_episode_id,
  };
}

/* -------------------------------------------------------------------------- */


/**
 * 사연 목록. **목록이 곧 랭킹이다** (00-관계-판정 3.4.1).
 *
 * 순위는 잘라낸 페이지가 아니라 **전체 정렬**에서 매긴다. 그래야 100건 중
 * 47위인 내 사연을 맨 위에 고정해도 순위가 맞다 (F3 3.6).
 *
 * 정렬은 `v_episode_scores` 의 규칙을 그대로 쓴다 —
 * `total_score DESC, created_at ASC, episode_id ASC` (F5 3.2.1 · supabase/README 9).
 */
export async function loadEpisodes({
  auctionId,
  viewerId,
  winningEpisodeId,
  limit = EPISODE_PAGE_SIZE,
}: {
  auctionId: string;
  viewerId: string | null;
  winningEpisodeId: string | null;
  limit?: number;
}): Promise<EpisodeList | null> {
  const supabase = await createClient();

  // 1) 전체 순위. 점수 뷰만 읽으므로 100건이어도 가볍다
  const { data: ranked, error: rankError } = await supabase
    .from("v_episode_scores")
    .select("episode_id, user_id, bid_amount, total_score, like_count, created_at")
    .eq("auction_id", auctionId)
    .order("total_score", { ascending: false })
    .order("created_at", { ascending: true })
    .order("episode_id", { ascending: true });

  if (rankError || !ranked) return null;

  const withRank = ranked.map((row, index) => ({ ...row, rank: index + 1 }));

  const mineRow = viewerId
    ? (withRank.find((row) => row.user_id === viewerId) ?? null)
    : null;

  const rest = withRank.filter((row) => row.episode_id !== mineRow?.episode_id);
  const visible = rest.slice(0, limit);

  const needed = mineRow ? [mineRow, ...visible] : visible;
  if (needed.length === 0) {
    return { items: [], mine: null, total: 0, hasMore: false };
  }

  const ids = needed.map((row) => row.episode_id);
  const authorIds = [...new Set(needed.map((row) => row.user_id))];

  // 2) 본문 · 3) 닉네임
  const [bodies, profiles] = await Promise.all([
    supabase.from("episodes").select("id, title, content").in("id", ids),
    supabase.from("v_user_profiles").select("id, nick_name").in("id", authorIds),
  ]);

  if (bodies.error || profiles.error) return null;

  // 4) 내 공감 여부. 비회원은 조회할 것이 없다
  const likedIds = new Set<string>();
  if (viewerId) {
    const { data: likes, error: likeError } = await supabase
      .from("episode_likes")
      .select("episode_id")
      .eq("user_id", viewerId)
      .in("episode_id", ids);

    if (likeError) return null;
    for (const like of likes ?? []) likedIds.add(like.episode_id);
  }

  const bodyById = new Map(bodies.data?.map((row) => [row.id, row]) ?? []);
  const nickById = new Map(
    profiles.data?.map((row) => [row.id, row.nick_name]) ?? [],
  );

  const toItem = (row: (typeof needed)[number]): EpisodeItem => {
    const body = bodyById.get(row.episode_id);
    return {
      id: row.episode_id,
      rank: row.rank,
      authorId: row.user_id,
      nickName: nickById.get(row.user_id) ?? "이름없음",
      title: body?.title ?? "",
      content: body?.content ?? "",
      bidAmount: row.bid_amount,
      totalScore: row.total_score,
      likeCount: row.like_count,
      likedByMe: likedIds.has(row.episode_id),
      isWinner: row.episode_id === winningEpisodeId,
      isMine: row.user_id === viewerId,
    };
  };

  return {
    items: visible.map(toItem),
    mine: mineRow ? toItem(mineRow) : null,
    total: withRank.length,
    hasMore: rest.length > limit,
  };
}

/* -------------------------------------------------------------------------- */

/** 내 잔액. 입찰 단계 상한을 잡는 데 쓴다 (F3 4.3) */
export async function loadPointBalance(
  userId: string | null,
): Promise<number | null> {
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("point_balance")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.point_balance;
}

/**
 * 이 경매의 채팅방. 마감 + 낙찰 확정 이후에만 존재한다 (F5 3.4).
 * RLS 가 주최자·낙찰자에게만 열어 주므로, 조회되면 곧 참여 자격이 있다는 뜻이다.
 */
export async function loadChatRoomId(
  auctionId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("auction_id", auctionId)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * 낙찰 사연의 점수 내역 (F5 3.2 · S09).
 *
 * 가중치는 부여 시점 값이 `episode_likes.weight` 에 그대로 남아 있다.
 * 여기서 50/10 을 다시 계산하지 않고 **저장된 값을 센다** (§4.4).
 */
export async function loadScoreBreakdown(
  episodeId: string,
): Promise<ScoreBreakdown | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episode_likes")
    .select("weight")
    .eq("episode_id", episodeId);

  if (error || !data) return null;

  const host = data.filter((like) => like.weight === LIKE_WEIGHT_HOST);
  const other = data.filter((like) => like.weight !== LIKE_WEIGHT_HOST);

  return {
    hostLikeCount: host.length,
    hostWeightSum: host.reduce((sum, like) => sum + like.weight, 0),
    otherLikeCount: other.length,
    otherWeightSum: other.reduce((sum, like) => sum + like.weight, 0),
  };
}

/** 내 사연 1건. 작성·수정 화면이 쓴다 */
export async function loadMyEpisode(auctionId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .select("id, title, content, bid_amount")
    .eq("auction_id", auctionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}
