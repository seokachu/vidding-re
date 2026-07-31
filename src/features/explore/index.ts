/**
 * 탐색·등록(F1 · F2 · F7)이 다른 화면에 열어 주는 것.
 *
 * 경매 상세(B)와 마이페이지(C)가 여기서 가져다 쓴다. 화면 안에서만 쓰는
 * 컴포넌트는 내보내지 않는다 — 이 목록이 곧 이 갈래의 공개 면이다.
 *
 * **여기 있는 것은 서버·클라이언트 어디서 가져다 써도 안전하다.**
 * 조회 함수는 `server-only` 라 이 파일을 거치지 않는다 —
 * 서버 컴포넌트에서 `@/features/explore/queries` 를 직접 가져다 쓴다.
 */

/* --- F7 찜하기 ------------------------------------------------------------ */

/** 경매 상세 상단 바와 마이페이지 찜 목록이 쓴다. 주최자에게는 렌더하지 않는다 */
export { FavoriteButton } from "./favorite-button";
export { toggleFavorite } from "./favorite-actions";
export type { ToggleFavoriteResult } from "./favorite-actions";

/* --- F1 경매 등록·수정·삭제 ------------------------------------------------ */

/**
 * 수정 화면의 주소. F1 3.5 가 정한 `?auction_id=` 형태다.
 *
 * `ROUTES.auctionEdit` 은 `/auctions/[id]/edit` 을 가리키는데 F1 3.5 와 다르다.
 * 등록·수정은 같은 폼이라 한 화면에 두었다. 상세의 **수정** 버튼은 이 함수를 쓴다.
 */
export function auctionEditHref(auctionId: string): string {
  return `/auctions/write?auction_id=${encodeURIComponent(auctionId)}`;
}

/** 상세의 수정·삭제 버튼이 쓴다. 삭제에 성공하면 홈으로 이동한다 (F1 3.6) */
export { deleteAuction, updateAuction } from "./auction-actions";
export type {
  AuctionSubmitResult,
  DeleteAuctionResult,
} from "./auction-actions";

/** 등록·수정 폼. `/auctions/[id]/edit` 을 따로 두고 싶으면 그대로 쓰면 된다 */
export { AuctionForm } from "./auction-form";

/* --- F2 탐색 -------------------------------------------------------------- */

export {
  AUCTION_SORT_DEFAULT,
  AUCTION_SORT_TABS,
  auctionSortHref,
  parseAuctionSort,
} from "./sort";
export type { AuctionSort } from "./sort";

export type { AuctionListItem, AuctionListResult } from "./queries";

/** 서버 컴포넌트에서 쓰는 재시도 가능한 에러 화면 */
export { ListErrorState } from "./list-error-state";
