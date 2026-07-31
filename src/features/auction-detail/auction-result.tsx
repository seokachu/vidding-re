import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui";
import { formatPoint, formatRelativeTime } from "@/lib/format";

import type {
  AuctionDetail,
  EpisodeItem,
  EpisodeList,
  ScoreBreakdown as Breakdown,
} from "./types";
import { EpisodeCard } from "./episode-card";
import { MoreEpisodesButton } from "./more-episodes-button";
import { MyEpisodeBlock } from "./my-episode-block";

/**
 * S09 낙찰 결과 — **경매 상세의 '마감 + 낙찰 확정' 상태다.**
 *
 * 별도 경로를 두지 않은 이유가 둘이다.
 *   1. F5 3.4 가 마감 이후 화면을 '경매 상세'로 규정한다
 *   2. 낙찰 알림(`AUCTION_RESULT`)이 들고 다니는 것은 `auction_id` 하나뿐이다.
 *      결과를 다른 주소에 두면 알림이 결과가 아닌 평범한 상세로 떨어진다
 *
 * 유찰(낙찰 사연 없음)은 이 화면이 아니라 S03c 로 간다.
 */
export function AuctionResult({
  auction,
  winner,
  breakdown,
  list,
  limit,
  viewerId,
}: {
  auction: AuctionDetail;
  winner: EpisodeItem;
  breakdown: Breakdown | null;
  list: EpisodeList;
  limit: number;
  viewerId: string | null;
}) {
  const others = [
    ...(list.mine && list.mine.id !== winner.id ? [list.mine] : []),
    ...list.items.filter((episode) => episode.id !== winner.id),
  ];

  const mineIsWinner = list.mine?.id === winner.id;
  const myLosingEpisode = mineIsWinner ? null : list.mine;

  return (
    <>
      <section className="flex flex-col items-center gap-2.5 bg-accent px-gutter py-7">
        <Trophy size={30} className="text-text-on-accent" />
        <h2 className="text-title font-bold text-text-on-accent">
          낙찰이 결정됐어요
        </h2>
        <p className="tabular text-caption text-primary-200">
          {formatRelativeTime(auction.endAt)} 마감 · 모인 사연 {list.total}
        </p>
      </section>

      <section className="flex flex-col gap-3 px-gutter pt-6">
        <div className="flex items-center gap-2">
          <Badge tone="won">낙찰 사연</Badge>
          <span className="tabular flex-1 text-right text-caption font-semibold text-accent-text">
            {formatPoint(winner.totalScore)}
          </span>
        </div>

        {/* 낙찰 사연은 강조해 상단에 노출한다 (F5 3.4) */}
        <EpisodeCard
          episode={{ ...winner, isWinner: true }}
          canLike={false}
        />
      </section>

      {breakdown && (
        <ScoreBreakdown
          bidAmount={winner.bidAmount}
          total={winner.totalScore}
          {...breakdown}
        />
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-2.5 px-gutter pt-6">
          <h3 className="text-subtitle font-semibold text-text-primary">
            나머지 사연
          </h3>
          {/* 미낙찰분은 마감 시 전액 반환됐다 (F5 3.5) */}
          <p className="text-label text-text-secondary">
            건 포인트는 모두 돌려드렸어요
          </p>

          {myLosingEpisode && (
            <MyEpisodeBlock
              episode={myLosingEpisode}
              total={list.total}
              auctionId={auction.id}
              canEdit={false}
              canDelete
            />
          )}

          <div className="flex flex-col gap-3 opacity-60">
            {others
              .filter((episode) => episode.id !== myLosingEpisode?.id)
              .map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  canLike={false}
                />
              ))}
          </div>

          {list.hasMore && <MoreEpisodesButton limit={limit} />}
        </section>
      )}

      {viewerId === winner.authorId && (
        <p className="px-gutter pt-6 text-caption leading-relaxed text-text-secondary">
          축하해요. 주최자와 대화를 열어 물건을 어떻게 받을지 정해보세요.
        </p>
      )}
    </>
  );
}

/**
 * 점수 계산 내역. **공감이 낙찰을 결정했다는 것을 눈으로 확인시킨다** (F4 2 · F5 3.2).
 * 가중치는 `episode_likes.weight` 에 남은 부여 시점 값을 센 것이다.
 */
function ScoreBreakdown({
  bidAmount,
  hostLikeCount,
  hostWeightSum,
  otherLikeCount,
  otherWeightSum,
  total,
}: Breakdown & { bidAmount: number; total: number }) {
  return (
    <section className="px-gutter pt-4">
      <div className="flex flex-col gap-[9px] rounded-md bg-surface px-4 py-[15px]">
        <h3 className="text-label font-bold text-text-primary">
          점수는 이렇게 계산됐어요
        </h3>

        <Row label="본인이 건 포인트" value={formatPoint(bidAmount)} />
        <Row
          label={`주최자 공감 · ${hostLikeCount}회`}
          value={`+ ${formatPoint(hostWeightSum)}`}
        />
        <Row
          label={`그 외 공감 · ${otherLikeCount}회`}
          value={`+ ${formatPoint(otherWeightSum)}`}
        />

        <div className="flex items-center justify-between gap-2 border-t border-border-strong pt-[9px]">
          <span className="text-caption font-bold text-text-primary">
            최종 점수
          </span>
          <span className="tabular text-caption font-bold text-accent">
            {formatPoint(total)}
          </span>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-label text-text-secondary">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
