import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { getAuthUser } from "@/lib/auth";
import { createAnonClient, createClient } from "@/lib/supabase/server";
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

/** 카드 두 종류가 쓰는 컬럼의 합집합. `user_id` 는 주최자 판정에만 쓴다 */
const LIST_COLUMNS =
  "auction_id, user_id, title, thumbnail, end_at, status, winning_episode_id, episode_count, created_at";

/** 뷰에서 갓 꺼낸 한 줄. 찜 상태가 붙기 전이다 */
type AuctionRow = Pick<
  AuctionSummary,
  | "auction_id"
  | "user_id"
  | "title"
  | "thumbnail"
  | "end_at"
  | "status"
  | "winning_episode_id"
  | "episode_count"
  | "created_at"
>;

export type AuctionListItem = AuctionRow & {
  /**
   * 이 카드에 찜 버튼을 그릴지 (F7 3.1 · 3.5).
   *
   * **판정을 서버에서 끝낸다.** 목록은 클라이언트가 이어서 더 불러오므로,
   * 화면에서 다시 판정하면 같은 규칙이 두 곳에 생긴다 — 상세 화면이
   * `can.favorite` 하나로 정하는 것과 같은 이유다.
   */
  canFavorite: boolean;
  /** 찜 상태. `null` 이면 **조회 실패**다 — '찜 안 함'과 구분한다 (F7 4) */
  favorited: boolean | null;
};

export type AuctionListResult =
  | { ok: true; items: AuctionListItem[]; hasMore: boolean }
  | { ok: false };

/* --- 조회 한 번을 감싸는 껍데기 -------------------------------------------- */

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type ReadResponse<T> = {
  data: T[] | null;
  error: PostgrestError | null;
  status: number;
};

/** 시도마다 새로 만든다. PostgREST 빌더는 한 번 쓰면 끝이다 */
type BuildRead<T> = (supabase: ServerSupabase) => PromiseLike<ReadResponse<T>>;

const RETRY_DELAY_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 인증이 거절됐다. 같은 토큰으로 다시 걸어봐야 같은 답이 온다 */
function isAuthFailure(status: number, error: PostgrestError) {
  return status === 401 || status === 403 || error.code === "PGRST301";
}

/** 잠깐 뒤엔 될 수도 있는 실패인가. `status: 0` 은 fetch 자체가 못 나간 경우다 */
function isTransient(status: number) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * 실패를 삼키지 않고 남긴다. `hint` 에 실제 조치가 담기는 경우가 많아
 * `error.message` 만 찍으면 정작 필요한 줄이 사라진다 — 객체를 통째로 넘긴다.
 */
function logReadFailure(label: string, status: number, error: PostgrestError) {
  console.error(`[query:${label}] 조회 실패 status=${status}`, error);
}

/**
 * 목록 조회 한 번. 실패하면 **원인을 남기고 한 번 더** 시도한다.
 *
 * `fetch` 실패와 503·520 은 postgrest-js 가 이미 3회 되건다(1s·2s·4s). 그 그물에
 * 걸리지 않는 나머지가 여기 몫이다.
 *
 * ```
 * 401/403  인증 거절 → 세션 없이 다시 읽는다 (retryAsAnon 을 켠 조회만)
 * 5xx·429  일시적   → 잠깐 쉬고 한 번 더
 * 그 외     결정적   → 바로 포기한다. 다시 걸어도 같은 답이고 왕복만 는다
 * ```
 *
 * 홈의 목록이 **간혹** 에러 카드로 떨어지던 원인이 이 자리에 로그도 재시도도
 * 없었던 데 있다. 어느 실패였는지 남지 않으면 다음에도 추측만 하게 된다.
 */
async function readRows<T>(
  label: string,
  build: BuildRead<T>,
  /** 인증 거절일 때 `anon` 으로 한 번 더 읽을지. **공개 목록에만 켠다** */
  { retryAsAnon = false }: { retryAsAnon?: boolean } = {},
): Promise<T[] | null> {
  const first = await build(await createClient());
  if (!first.error) return first.data ?? [];

  logReadFailure(label, first.status, first.error);

  let second: ReadResponse<T>;
  if (retryAsAnon && isAuthFailure(first.status, first.error)) {
    /*
     * 목록은 뷰 grant 와 `auctions_select_all` 로 비회원에게도 열려 있다.
     * 세션이 문제라면 세션을 빼고 읽는 편이 낫다 — 찜 상태만 비어 올 뿐
     * (`favorited: null`), 화면은 산다. 목록이 통째로 안 보이는 것보다 낫다.
     */
    second = await build(createAnonClient());
  } else if (isTransient(first.status)) {
    await sleep(RETRY_DELAY_MS);
    second = await build(await createClient());
  } else {
    return null;
  }

  if (!second.error) return second.data ?? [];
  logReadFailure(`${label}:retry`, second.status, second.error);
  return null;
}

/* --- 찜 상태 입히기 -------------------------------------------------------- */

/**
 * 이미 손에 쥔 사용자·찜 집합을 카드에 얹는다. 왕복이 없는 순수 함수다.
 *
 * **주최자와 비회원에게는 그리지 않는다.** 자기 경매를 스스로 찜하는 것은 의미가
 * 없고(F7 3.1), 비회원은 상세 화면에서도 보이지 않는데 목록에서만 보이면 어긋난다.
 */
function attachFavorites<T extends AuctionRow>(
  rows: T[],
  userId: string | null,
  favorited: Set<string> | null,
): (T & { canFavorite: boolean; favorited: boolean | null })[] {
  return rows.map((row) => {
    const canFavorite = userId !== null && row.user_id !== userId;
    return {
      ...row,
      canFavorite,
      favorited: canFavorite ? (favorited?.has(row.auction_id) ?? null) : null,
    };
  });
}

/**
 * 목록 하나에 찜 상태를 입힌다 (F7 3.5).
 *
 * 찜 조회가 실패해도 목록은 그대로 내보낸다. 버튼만 비활성으로 떨어질 뿐,
 * **경매 목록이 찜 때문에 안 보이면 안 된다.**
 *
 * 홈처럼 목록을 둘 그리는 화면은 이걸 두 번 부르지 말고 `getHomeAuctions` 처럼
 * 찜을 한 번에 읽어 `attachFavorites` 로 나눠 얹는다 — 같은 사용자에게 같은
 * 질문을 두 번 하는 셈이라 왕복만 는다.
 */
async function withFavorites<T extends AuctionRow>(rows: T[]) {
  const user = await getAuthUser();
  if (!user) return attachFavorites(rows, null, null);

  const mine = rows
    .filter((row) => row.user_id !== user.id)
    .map((row) => row.auction_id);

  return attachFavorites(rows, user.id, await getMyFavoriteIds(mine));
}

/* --- 조회 ------------------------------------------------------------------ */

/** 목록 한 쪽(page)의 크기. 더 보기로 이어 붙인다 */
export const AUCTION_PAGE_SIZE = 10;

/** 홈의 마감 임박 가로 스크롤 (F2 3.1) */
export const HOME_ENDING_SOON_LIMIT = 10;
/** 홈의 전체 목록. 나머지는 `더 보기`로 목록 화면에서 본다 (F2 3.1) */
export const HOME_LATEST_LIMIT = 5;

/**
 * 마감이 가까운 순으로 진행 중인 경매 (홈 · F2 3.1).
 *
 * 24시간 창(`ENDING_SOON_MS`)으로 자르지 않는다. 그 창은 **배지를 빨갛게 칠할 기준**이고,
 * 이 영역은 "마감이 가까운 것부터 보여주는 자리"다. 창으로 자르면 마감이 하루 이상 남은
 * 시기에 영역이 통째로 사라져 홈이 목록 하나만 남는다.
 *
 * 이미 마감된 것은 담지 않는다 — 놓치지 말라고 띄우는 자리이기 때문이다.
 */
function queryEndingSoonRows(limit: number) {
  // 재시도가 첫 시도와 같은 경계를 쓰도록 한 번만 찍는다
  const now = new Date().toISOString();

  return readRows<AuctionRow>(
    "ending-soon",
    (supabase) =>
      supabase
        .from("v_auction_summary")
        .select(LIST_COLUMNS)
        .eq("status", "OPEN")
        .gt("end_at", now)
        .order("end_at", { ascending: true })
        .limit(limit),
    { retryAsAnon: true },
  );
}

/**
 * 정렬·검색·페이지를 하나로 받는 목록 조회 (F2 3.2 · 3.3).
 *
 * 검색 대상은 **제목만**이다. 대소문자를 가리지 않게 `ilike` 를 쓴다.
 * `%` 와 `_` 는 패턴 문자이므로 이스케이프한다 — 사용자가 친 글자는 글자여야 한다.
 *
 * 한 건 더 받아 다음 쪽이 있는지 확인한다. 개수를 따로 세지 않는다.
 */
function queryAuctionRows({
  sort,
  query,
  offset,
  limit,
}: {
  sort: AuctionSort;
  query?: string;
  offset: number;
  limit: number;
}) {
  const term = query?.trim();

  return readRows<AuctionRow>(
    `auctions:${sort}`,
    (supabase) => {
      let request = supabase.from("v_auction_summary").select(LIST_COLUMNS);

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

      return request.range(offset, offset + limit);
    },
    { retryAsAnon: true },
  );
}

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
  const rows = await queryAuctionRows({ sort, query, offset, limit });
  if (!rows) return { ok: false };

  return {
    ok: true,
    items: await withFavorites(rows.slice(0, limit)),
    hasMore: rows.length > limit,
  };
}

/**
 * 홈의 두 목록을 한 번에 (S01 · F2 3.1).
 *
 * 목록마다 `withFavorites` 를 따로 태우면 **같은 사용자의 찜을 두 번 묻는다.**
 * 홈은 로그인 상태에서 이미 왕복이 여덟 번이고, 그중 하나만 삐끗해도 영역이
 * 에러로 떨어진다 — 줄일 수 있는 왕복은 줄인다. 두 목록의 `auction_id` 를 합쳐
 * 한 번만 묻고, 결과를 각 목록에 나눠 얹는다.
 *
 * 두 목록은 **서로의 실패에 걸려 넘어지지 않는다.** 각자 `ok` 를 들고 나가고,
 * 화면이 마감 임박은 숨기고 최근 목록은 에러로 그린다 (F2 4).
 */
export async function getHomeAuctions(): Promise<{
  endingSoon: AuctionListResult;
  latest: AuctionListResult;
}> {
  const [user, endingRows, latestRows] = await Promise.all([
    getAuthUser(),
    queryEndingSoonRows(HOME_ENDING_SOON_LIMIT),
    queryAuctionRows({
      sort: "latest",
      offset: 0,
      limit: HOME_LATEST_LIMIT,
    }),
  ]);

  // 다음 쪽 확인용으로 한 건 더 받았다. 홈은 그 한 건을 그리지 않는다
  const latestPage = latestRows?.slice(0, HOME_LATEST_LIMIT) ?? null;

  const shown = [...(endingRows ?? []), ...(latestPage ?? [])];
  const asked = user
    ? [
        ...new Set(
          shown
            .filter((row) => row.user_id !== user.id)
            .map((row) => row.auction_id),
        ),
      ]
    : [];
  const favorited = user ? await getMyFavoriteIds(asked) : null;

  return {
    endingSoon: endingRows
      ? {
          ok: true,
          items: attachFavorites(endingRows, user?.id ?? null, favorited),
          hasMore: false,
        }
      : { ok: false },
    latest: latestPage
      ? {
          ok: true,
          items: attachFavorites(latestPage, user?.id ?? null, favorited),
          hasMore: (latestRows?.length ?? 0) > HOME_LATEST_LIMIT,
        }
      : { ok: false },
  };
}

/**
 * 내가 찜한 경매의 ID 집합. 목록 카드의 찜 버튼 초기 상태에 쓴다 (F7 3.5).
 *
 * 조회에 실패하면 빈 집합이 아니라 `null` 을 돌려준다. **모르는 것과 없는 것을 구분한다** —
 * 실패를 '찜 안 함'으로 확정하면 눌렀을 때 이미 있는 행을 또 넣으려 한다.
 *
 * `retryAsAnon` 을 켜지 않는다. 내 찜은 RLS 로 잠긴 데이터라 세션 없이 읽으면
 * 0건이 돌아오고, 그것은 실패가 아니라 **"찜 안 함"으로 위장된 실패**다.
 */
export async function getMyFavoriteIds(
  auctionIds: string[],
): Promise<Set<string> | null> {
  if (auctionIds.length === 0) return new Set();

  const user = await getAuthUser();
  if (!user) return new Set();

  const rows = await readRows<{ auction_id: string }>(
    "favorites",
    (supabase) =>
      supabase
        .from("auction_favorites")
        .select("auction_id")
        .in("auction_id", auctionIds),
  );

  if (!rows) return null;
  return new Set(rows.map((row) => row.auction_id));
}

/** `%` `_` `\` 는 `ilike` 의 패턴 문자다. 사용자가 친 글자는 글자로 다룬다 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
