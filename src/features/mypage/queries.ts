import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/lib/supabase/database.types";
import {
  FAILED,
  ok,
  type AuctionCardData,
  type MyEpisodeItem,
  type MyProfile,
  type PointItem,
  type Result,
} from "./types";

/**
 * 마이페이지가 쓰는 조회 다섯 개.
 *
 * **하나도 예외를 던지지 않는다.** 서버 컴포넌트에서 던지면 화면 전체가 죽고,
 * 그러면 "한 영역의 조회 실패가 다른 영역을 막지 않는다"(F8 5-9)를 못 지킨다.
 * 실패는 `{ ok: false }` 로 돌려 호출한 쪽이 그 자리에만 에러를 그리게 한다.
 *
 * `users.role` 을 조회하는 곳은 한 군데도 없다. 그런 컬럼이 스키마에 없다 (F8 5-3).
 */

const CARD_COLUMNS =
  "auction_id, title, thumbnail, end_at, status, winning_episode_id, episode_count";

/** 닉네임 · 아바타 · 보유 포인트. 셋은 `users` 한 행에서 온다 (§3.1) */
export async function getMyProfile(userId: string): Promise<Result<MyProfile>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("nick_name, avatar_url, point_balance")
    .eq("id", userId)
    .maybeSingle();

  // 인증은 됐는데 행이 아직 없을 수 있다 (가입 트리거가 도는 사이). 그것도 실패로 본다 —
  // 0 P 로 표시하지 않는 것이 요건이다 (F8 4)
  if (error || !data) return FAILED;

  return ok({
    nickName: data.nick_name,
    avatarUrl: data.avatar_url,
    pointBalance: data.point_balance,
  });
}

/**
 * 배송지. **사용자당 1개다** (F12 3.3).
 *
 * 없으면 `null` 이고 이것은 실패가 아니다. 미등록은 오류가 아니라 상태다 (F8 4).
 */
export async function getMyAddress(): Promise<Result<Address | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .maybeSingle();

  if (error) return FAILED;
  return ok(data);
}

/** 내가 연 경매. 최신순 (F8 3.3) */
export async function getMyAuctions(
  userId: string,
): Promise<Result<AuctionCardData[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_auction_summary")
    .select(CARD_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return FAILED;
  return ok(data);
}

/**
 * 내가 사연을 쓴 경매 (F8 3.4).
 *
 * 사연과 경매를 **두 번 나눠 조회한다.** 임베드 한 방이면 짧지만, 경매가 지워진
 * 사연이 섞였을 때 목록이 통째로 흔들린다. 나눠 두면 짝이 없는 항목만 빠진다
 * ("목록의 경매가 삭제됨 → 해당 항목을 제외해 표시한다", F8 4).
 */
export async function getMyEpisodes(
  userId: string,
): Promise<Result<MyEpisodeItem[]>> {
  const supabase = await createClient();

  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("id, auction_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !episodes) return FAILED;
  if (episodes.length === 0) return ok([]);

  const { data: auctions, error: auctionError } = await supabase
    .from("v_auction_summary")
    .select("auction_id, title, thumbnail, end_at, status, winning_episode_id")
    .in(
      "auction_id",
      episodes.map((e) => e.auction_id),
    );

  if (auctionError || !auctions) return FAILED;

  const byId = new Map(auctions.map((a) => [a.auction_id, a]));

  const items = episodes.flatMap<MyEpisodeItem>((episode) => {
    const auction = byId.get(episode.auction_id);
    if (!auction) return [];

    return [
      {
        episodeId: episode.id,
        auctionId: auction.auction_id,
        title: auction.title,
        thumbnail: auction.thumbnail,
        endAt: auction.end_at,
        outcome:
          auction.status === "OPEN"
            ? "JOINED"
            : auction.winning_episode_id === episode.id
              ? "WON"
              : "LOST",
      },
    ];
  });

  return ok(items);
}

/**
 * 찜한 경매 (F8 3.5).
 *
 * `auction_favorites` 는 본인 행만 보인다 (§6). 최근에 찜한 순으로 보여준다.
 */
export async function getMyFavorites(): Promise<Result<AuctionCardData[]>> {
  const supabase = await createClient();

  const { data: favorites, error } = await supabase
    .from("auction_favorites")
    .select("auction_id, created_at")
    .order("created_at", { ascending: false });

  if (error || !favorites) return FAILED;
  if (favorites.length === 0) return ok([]);

  const { data: auctions, error: auctionError } = await supabase
    .from("v_auction_summary")
    .select(CARD_COLUMNS)
    .in(
      "auction_id",
      favorites.map((f) => f.auction_id),
    );

  if (auctionError || !auctions) return FAILED;

  const byId = new Map(auctions.map((a) => [a.auction_id, a]));

  // 찜한 순서를 유지하고, 지워진 경매는 조용히 빠진다 (F8 4)
  const items = favorites.flatMap<AuctionCardData>((favorite) => {
    const auction = byId.get(favorite.auction_id);
    return auction ? [auction] : [];
  });

  return ok(items);
}

/** 포인트 원장. 시간순 목록 하나뿐이다 — 필터·검색·기간 선택이 없다 (F8 3.6) */
export async function getMyPoints(): Promise<Result<PointItem[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("points")
    .select("id, type, amount, description, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return FAILED;

  return ok(
    data.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      description: row.description,
      createdAt: row.created_at,
    })),
  );
}
