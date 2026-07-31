import { TabShell } from "@/components/layout/tab-shell";
import { AuctionExplorer } from "@/features/explore/auction-explorer";
import { getAuctions } from "@/features/explore/queries";
import { parseAuctionSort } from "@/features/explore/sort";
import { WriteFab } from "@/features/explore/write-fab";
import { getAuthUser } from "@/lib/auth";

export const metadata = { title: "경매 현황 — Vidding" };

/**
 * 경매 목록 (S02 · F2 3.2).
 *
 * 로그인 없이 열린다 (완료 조건 1). 정렬만 주소에 담고, 잘못된 값은
 * 조용히 기본값으로 고친다 (완료 조건 3 · 4).
 *
 * Next 16 에서 `searchParams` 는 Promise 다.
 */
export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort = parseAuctionSort(rawSort);

  const [user, initial] = await Promise.all([
    getAuthUser(),
    getAuctions({ sort }),
  ]);

  return (
    <TabShell title="경매 현황">
      <AuctionExplorer sort={sort} initial={initial} />

      {/* 로그인한 사용자에게만 노출한다 (F2 3.5 · F1 3.1) */}
      {user && <WriteFab />}
    </TabShell>
  );
}
