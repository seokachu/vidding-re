import { ChevronRight, PackageOpen } from "lucide-react";
import Link from "next/link";

import { TabShell } from "@/components/layout/tab-shell";
import { AuctionCard, AuctionCardCompact, EmptyState } from "@/components/ui";
import { ListErrorState } from "@/features/explore/list-error-state";
import {
  getEndingSoonAuctions,
  getLatestAuctions,
} from "@/features/explore/queries";
import { WriteFab } from "@/features/explore/write-fab";
import {
  AUCTION_SORT_DEFAULT,
  auctionSortHref,
} from "@/features/explore/sort";
import { auctionDisplayStatus } from "@/lib/auction-status";
import { getAuthUser } from "@/lib/auth";

export const metadata = { title: "Vidding" };

/**
 * 홈 (S01 · F2 3.1).
 *
 * **섹션은 둘뿐이다** — 마감 임박 가로 스크롤 + 전체 목록 (완료 조건 7).
 * 서비스가 데이터 0건에서 시작하므로 큐레이션 섹션을 여럿 두면 빈 상태만 여러 번 보인다.
 *
 * 로그인 없이 열린다 (F2 3.5 · 완료 조건 1). 관계에 따라 달라지는 것은
 * ＋ 버튼 하나뿐이다 (완료 조건 2).
 */
export default async function HomePage() {
  const [user, endingSoon, latest] = await Promise.all([
    getAuthUser(),
    getEndingSoonAuctions(),
    getLatestAuctions(),
  ]);

  // 마감 임박은 0건이어도, 조회에 실패해도 영역을 아예 숨긴다.
  // 빈 상태를 따로 그리지 않고, 전체 목록은 정상 노출한다 (F2 4)
  const showEndingSoon = endingSoon.ok && endingSoon.items.length > 0;

  return (
    <TabShell>
      <section className="flex flex-col gap-2 px-gutter pb-7 pt-4">
        <h2 className="text-display font-bold text-text-primary">
          사연을 기다리는 물건
        </h2>
        <p className="text-caption text-text-secondary">
          가장 공감받은 이야기가 가져갑니다
        </p>
      </section>

      {showEndingSoon && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-gutter">
            <h3 className="text-title font-bold text-text-primary">마감 임박</h3>
            <MoreLink href={auctionSortHref(AUCTION_SORT_DEFAULT)} />
          </div>

          <div className="flex gap-3 overflow-x-auto px-gutter">
            {endingSoon.items.map((auction) => (
              <AuctionCardCompact
                key={auction.auction_id}
                auction={auction}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 px-gutter pt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-title font-bold text-text-primary">
            최근 올라온 경매
          </h3>
          {/* 전체 목록은 탐색 화면에서 이어 본다 (F2 3.1) */}
          <MoreLink href={auctionSortHref("latest")} />
        </div>

        {!latest.ok ? (
          <ListErrorState />
        ) : latest.items.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="아직 등록된 경매가 없어요"
            description={"새로운 경매가 등록되면\n알려드릴게요"}
          />
        ) : (
          latest.items.map((auction) => (
            <AuctionCard
              key={auction.auction_id}
              auction={auction}
              className={
                auctionDisplayStatus(auction).closed ? "bg-surface" : undefined
              }
            />
          ))
        )}
      </section>

      {/* 로그인한 사용자 전원에게 보인다. 유형 조건이 없다 (F1 완료 조건 1) */}
      {user && <WriteFab />}
    </TabShell>
  );
}

function MoreLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-0.5 text-caption font-semibold text-accent"
    >
      전체
      <ChevronRight size={15} />
    </Link>
  );
}
