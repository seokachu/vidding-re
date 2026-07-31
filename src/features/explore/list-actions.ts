"use server";

import { getAuctions, type AuctionListResult } from "./queries";
import { parseAuctionSort } from "./sort";

/**
 * 목록 한 쪽을 더 받아온다 — 검색과 더 보기가 같은 입구를 쓴다 (F2 3.2 · 3.3).
 *
 * 검색을 서버에서 하는 이유는 **이미 불러온 쪽만 걸러내면 검색이 아니기 때문이다.**
 * 목록 첫 쪽에 없는 경매는 제목을 정확히 쳐도 나오지 않는다.
 *
 * 정렬 값은 클라이언트에서 온 문자열이므로 여기서 다시 판정한다.
 * 잘못된 값은 조용히 기본값이 된다 (F2 3.4).
 */
export async function fetchAuctionPage(input: {
  sort: string;
  query: string;
  offset: number;
}): Promise<AuctionListResult> {
  return getAuctions({
    sort: parseAuctionSort(input.sort),
    query: input.query,
    offset: Math.max(0, Math.trunc(input.offset)),
  });
}
