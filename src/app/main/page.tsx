import { ChevronRight, PackageOpen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { TabShell } from "@/components/layout/tab-shell";
import { AuctionCard, AuctionCardCompact, EmptyState, ErrorState } from "@/components/ui";
import { getHomeAuctions } from "@/features/explore/queries";
import { FavoriteButton } from "@/features/explore";
import { WriteFab } from "@/features/explore/write-fab";
import {
  AUCTION_SORT_DEFAULT,
  auctionSortHref,
} from "@/features/explore/sort";
import { auctionDisplayStatus } from "@/lib/auction-status";
import { getAuthUser } from "@/lib/auth";

import { HomeSectionsSkeleton } from "./sections-skeleton";

export const metadata = { title: "Vidding" };

/**
 * 홈 (S01 · F2 3.1).
 *
 * **섹션은 둘뿐이다** — 마감 임박 가로 스크롤 + 전체 목록 (완료 조건 7).
 * 서비스가 데이터 0건에서 시작하므로 큐레이션 섹션을 여럿 두면 빈 상태만 여러 번 보인다.
 *
 * 로그인 없이 열린다 (F2 3.5 · 완료 조건 1). 관계에 따라 달라지는 것은
 * ＋ 버튼 하나뿐이다 (완료 조건 2).
 *
 * **목록을 기다렸다 그리지 않는다.** 여기서 `await` 하면 껍데기(`TabShell`)가
 * 그 뒤에 줄을 서고, 헤더·하단 네비까지 목록 조회만큼 늦게 나온다. 조회는 먼저
 * 던져 두고 제목과 껍데기를 곧장 내보낸 뒤, 목록은 `Suspense` 로 흘려보낸다.
 */
export default async function HomePage() {
  // 기다리지 않는다. 아래 `await` 와 껍데기의 조회가 이 왕복과 겹쳐 돈다
  const auctions = getHomeAuctions();

  // 요청 안에서 캐시된다 — `getHomeAuctions` 가 이미 부른 그 약속이다
  const user = await getAuthUser();

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

      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections auctions={auctions} />
      </Suspense>

      {/* 로그인한 사용자 전원에게 보인다. 유형 조건이 없다 (F1 완료 조건 1) */}
      {user && <WriteFab />}
    </TabShell>
  );
}

/** 두 목록. 도착하는 대로 제목 아래에 끼워 넣는다 */
async function HomeSections({
  auctions,
}: {
  auctions: ReturnType<typeof getHomeAuctions>;
}) {
  const { endingSoon, latest } = await auctions;

  // 마감 임박은 0건이어도, 조회에 실패해도 영역을 아예 숨긴다.
  // 빈 상태를 따로 그리지 않고, 전체 목록은 정상 노출한다 (F2 4)
  const showEndingSoon = endingSoon.ok && endingSoon.items.length > 0;

  return (
    <>
      {showEndingSoon && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-gutter">
            <h3 className="text-title font-bold text-text-primary">마감 임박</h3>
            <MoreLink href={auctionSortHref(AUCTION_SORT_DEFAULT)} />
          </div>

          <div className="no-scrollbar flex gap-3 overflow-x-auto px-gutter">
            {endingSoon.items.map((auction) => (
              <AuctionCardCompact
                key={auction.auction_id}
                auction={auction}
                /* 같은 화면 안에서 어떤 카드엔 있고 어떤 카드엔 없으면 규칙이 없어 보인다 */
                trailing={
                  auction.canFavorite ? (
                    <FavoriteButton
                      auctionId={auction.auction_id}
                      favorited={auction.favorited}
                      size="sm"
                    />
                  ) : undefined
                }
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
          <ErrorState description="목록을 불러오지 못했어요" />
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
              /* 목록에서 바로 찜한다. 주최자·비회원에게는 서버가 끄고 내려보낸다 (F7 3.5) */
              trailing={
                auction.canFavorite ? (
                  <FavoriteButton
                    auctionId={auction.auction_id}
                    favorited={auction.favorited}
                  />
                ) : undefined
              }
              className={
                auctionDisplayStatus(auction).closed ? "bg-surface" : undefined
              }
            />
          ))
        )}
      </section>
    </>
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
