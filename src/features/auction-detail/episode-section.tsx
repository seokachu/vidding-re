import { EmptyState, ErrorState } from "@/components/ui";

import type { EpisodeList } from "./types";
import { EpisodeCard } from "./episode-card";
import { MoreEpisodesButton } from "./more-episodes-button";
import { MyEpisodeBlock } from "./my-episode-block";

/**
 * 사연 목록 (F3 3.6).
 *
 * **입찰 랭킹 카드를 따로 두지 않는다.** 점수순으로 정렬하면 이 목록이 곧
 * 랭킹이고, 그것으로 F5 3.2.1 의 "마감 전 랭킹 노출" 요건이 충족된다
 * (00-관계-판정 3.4.1).
 *
 * 조회 실패는 빈 목록으로 위장하지 않는다 (docs/구조.md).
 */
export function EpisodeSection({
  list,
  auctionId,
  limit,
  canLike,
  isClosed,
  winningEpisodeId,
}: {
  list: EpisodeList | null;
  auctionId: string;
  limit: number;
  canLike: boolean;
  isClosed: boolean;
  winningEpisodeId: string | null;
}) {
  if (!list) {
    return (
      <section className="px-gutter pt-7">
        <ErrorState description="사연 목록을 불러오지 못했어요." />
      </section>
    );
  }

  const mine = list.mine;

  return (
    <section className="flex flex-col gap-3 px-gutter pt-7">
      <div className="flex items-center justify-between gap-2">
        <h2 className="tabular text-title font-bold text-text-primary">
          모인 사연 {list.total}
        </h2>
        {list.total > 0 && (
          <span className="text-label text-text-tertiary">포인트 높은 순</span>
        )}
      </div>

      {list.total === 0 ? (
        <EmptyState
          title="사연이 모이지 않았어요"
          description={
            isClosed
              ? "마감까지 아무도 사연을 쓰지 않았습니다"
              : "이 경매의 첫 사연을 기다리고 있어요"
          }
        />
      ) : (
        <>
          {mine && (
            <MyEpisodeBlock
              episode={mine}
              total={list.total}
              auctionId={auctionId}
              // 마감된 경매의 사연은 고칠 수 없다 (RLS episodes_update_author)
              canEdit={!isClosed}
              // 낙찰 사연은 거래 기록이므로 보존한다 (F3 3.4)
              canDelete={mine.id !== winningEpisodeId}
            />
          )}

          {list.items.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              canLike={canLike}
            />
          ))}

          {list.hasMore && <MoreEpisodesButton limit={limit} />}
        </>
      )}
    </section>
  );
}
