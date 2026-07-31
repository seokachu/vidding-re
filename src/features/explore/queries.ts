import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuctionSummary } from "@/lib/supabase/database.types";
import type { AuctionSort } from "./sort";

/**
 * 탐색 화면의 조회 (F2).
 *
 * 전부 `v_auction_summary` 하나를 읽는다. 정렬 기준이 이 뷰에 모여 있고
 * (데이터 모델 §5.2), 뷰는 `anon` 에도 SELECT 가 열려 있어 **비회원도 열람한다**
 * (F2 3.5 · 완료 조건 1).
 *
 * **조회 실패를 빈 목록으로 위장하지 않는다.** 결과를 `ok` 로 감싸 돌려주고,
 * 화면이 `EmptyState` 와 `ErrorState` 를 서로 다르게 그린다 (F2 4 · 완료 조건 5).
 */

/** 카드 두 종류가 쓰는 컬럼의 합집합 */
const LIST_COLUMNS =
  "auction_id, title, thumbnail, end_at, status, winning_episode_id, episode_count, created_at";

export type AuctionListItem = Pick<
  AuctionSummary,
  | "auction_id"
  | "title"
  | "thumbnail"
  | "end_at"
  | "status"
  | "winning_episode_id"
  | "episode_count"
  | "created_at"
>;

export type AuctionListResult =
  | { ok: true; items: AuctionListItem[]; hasMore: boolean }
  | { ok: false };

/** 목록 한 쪽(page)의 크기. 더 보기로 이어 붙인다 */
export const AUCTION_PAGE_SIZE = 10;

/** 홈의 마감 임박 가로 스크롤 (F2 3.1) */
export const HOME_ENDING_SOON_LIMIT = 10;
/** 홈의 전체 목록. 나머지는 `더 보기`로 목록 화면에서 본다 (F2 3.1) */
export const HOME_LATEST_LIMIT = 5;

/**
 * 마감이 가까운 순으로 진행 중인 경매를 모은다 (홈 · F2 3.1).
 *
 * 24시간 창(`ENDING_SOON_MS`)으로 자르지 않는다. 그 창은 **배지를 빨갛게 칠할 기준**이고,
 * 이 영역은 "마감이 가까운 것부터 보여주는 자리"다. 창으로 자르면 마감이 하루 이상 남은
 * 시기에 영역이 통째로 사라져 홈이 목록 하나만 남는다.
 *
 * 이미 마감된 것은 담지 않는다 — 놓치지 말라고 띄우는 자리이기 때문이다.
 */
export async function getEndingSoonAuctions(
  limit = HOME_ENDING_SOON_LIMIT,
): Promise<AuctionListResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_auction_summary")
    .select(LIST_COLUMNS)
    .eq("status", "OPEN")
    .gt("end_at", new Date().toISOString())
    .order("end_at", { ascending: true })
    .limit(limit);

  if (error) return { ok: false };
  return { ok: true, items: data ?? [], hasMore: false };
}

/**
 * 정렬·검색·페이지를 하나로 받는 목록 조회 (F2 3.2 · 3.3).
 *
 * 검색 대상은 **제목만**이다. 대소문자를 가리지 않게 `ilike` 를 쓴다.
 * `%` 와 `_` 는 패턴 문자이므로 이스케이프한다 — 사용자가 친 글자는 글자여야 한다.
 */
export async function getAuctions({
  sort,
  query,
  offset = 0,
  limit = AUCTION_PAGE_SIZE,
}: {
  sort: AuctionSort;
  query?: string;
  offset?: number;
  limit?: number;
}): Promise<AuctionListResult> {
  const supabase = await createClient();

  let request = supabase.from("v_auction_summary").select(LIST_COLUMNS);

  const term = query?.trim();
  if (term) {
    request = request.ilike("title", `%${escapeLikePattern(term)}%`);
  }

  switch (sort) {
    case "ending":
      /**
       * 마감이 지난 경매를 맨 앞에 세우지 않는다. `end_at ASC` 만 쓰면
       * **이미 끝난 경매가 '마감 임박순'의 1위**가 된다.
       * `status DESC` 는 'OPEN' → 'CLOSED' 순이라 마감된 것을 뒤로 민다.
       */
      request = request
        .order("status", { ascending: false })
        .order("end_at", { ascending: true });
      break;
    case "popular":
      request = request
        .order("episode_count", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "latest":
      request = request.order("created_at", { ascending: false });
      break;
  }

  // 한 건 더 받아 다음 쪽이 있는지 확인한다. 개수를 따로 세지 않는다
  const { data, error } = await request.range(offset, offset + limit);

  if (error) return { ok: false };

  const rows = data ?? [];
  return {
    ok: true,
    items: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}

/** 홈의 전체 목록 — 최신순 (F2 3.1) */
export async function getLatestAuctions(
  limit = HOME_LATEST_LIMIT,
): Promise<AuctionListResult> {
  return getAuctions({ sort: "latest", limit });
}

/**
 * 내가 찜한 경매의 ID 집합. 목록 카드의 찜 버튼 초기 상태에 쓴다 (F7 3.5).
 *
 * 조회에 실패하면 빈 집합이 아니라 `null` 을 돌려준다. **모르는 것과 없는 것을 구분한다** —
 * 실패를 '찜 안 함'으로 확정하면 눌렀을 때 이미 있는 행을 또 넣으려 한다.
 */
export async function getMyFavoriteIds(
  auctionIds: string[],
): Promise<Set<string> | null> {
  if (auctionIds.length === 0) return new Set();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("auction_favorites")
    .select("auction_id")
    .in("auction_id", auctionIds);

  if (error) return null;
  return new Set((data ?? []).map((row) => row.auction_id));
}

/** `%` `_` `\` 는 `ilike` 의 패턴 문자다. 사용자가 친 글자는 글자로 다룬다 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
