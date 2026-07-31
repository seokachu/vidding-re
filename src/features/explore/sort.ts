/**
 * 정렬 (F2 3.2 · 3.4).
 *
 * **정렬만 URL 에 담는다.** 검색어는 화면 상태로만 관리한다 (3.4).
 * 순수 함수만 두어 서버 컴포넌트와 클라이언트 컴포넌트가 같은 판정을 쓴다.
 */

import { ROUTES } from "@/lib/routes";

export const AUCTION_SORTS = ["ending", "popular", "latest"] as const;

export type AuctionSort = (typeof AUCTION_SORTS)[number];

/** 마감 임박순이 기본이다 — 참여 기회를 놓치지 않게 하는 것이 이 화면의 목적이다 (F2 2) */
export const AUCTION_SORT_DEFAULT: AuctionSort = "ending";

export const AUCTION_SORT_TABS = [
  { value: "ending", label: "마감 임박" },
  /** **인기순 기준은 모인 사연 수다.** 찜 수가 아니다 (F2 3.2 · F7 2) */
  { value: "popular", label: "사연 많은순" },
  { value: "latest", label: "최신순" },
] as const satisfies readonly { value: AuctionSort; label: string }[];

/**
 * 주소의 `sort` 값을 판정한다.
 *
 * **잘못된 값은 조용히 기본값으로 돌린다.** 오류를 노출하지 않는다 (F2 3.4 · 완료 조건 4).
 * 배열(`?sort=a&sort=b`)로 들어와도 마찬가지다.
 */
export function parseAuctionSort(
  value: string | string[] | undefined,
): AuctionSort {
  if (typeof value !== "string") return AUCTION_SORT_DEFAULT;
  return (AUCTION_SORTS as readonly string[]).includes(value)
    ? (value as AuctionSort)
    : AUCTION_SORT_DEFAULT;
}

/** 정렬 탭의 이동 주소. 정렬은 주소에 남아야 뒤로가기·공유가 동작한다 */
export function auctionSortHref(sort: AuctionSort): string {
  return `${ROUTES.auctions}?sort=${sort}`;
}
