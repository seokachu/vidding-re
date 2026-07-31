"use client";

import { StoryCard } from "@/components/ui";

import type { EpisodeItem } from "./types";
import { EpisodeLikeButton } from "./episode-like-button";
import { Toast, useToast } from "./toast";

/**
 * 사연 카드 한 장. **목록이 곧 랭킹이다** (00-관계-판정 3.4.1).
 *
 * 담는 것은 다섯이다 — 순위 · 닉네임 · 최종 입찰 포인트 · 공감 · 제목·내용.
 * 마스킹된 이메일 · 작성일 · 프로필 이미지는 담지 않는다 (F3 3.6).
 */
export function EpisodeCard({
  episode,
  /** 공감할 수 있는가. 마감·비회원·판정 불가면 `false` (00-관계-판정 3.5) */
  canLike,
}: {
  episode: EpisodeItem;
  canLike: boolean;
}) {
  const toast = useToast();

  return (
    <>
      <StoryCard
        rank={episode.rank}
        nickName={episode.isMine ? "나" : episode.nickName}
        score={episode.totalScore}
        title={episode.title}
        content={episode.content}
        highlighted={episode.isWinner}
        like={
          // 자기 사연에는 공감 버튼을 노출하지 않는다 (F4 3.4 · 4)
          episode.isMine ? undefined : (
            <EpisodeLikeButton
              episodeId={episode.id}
              liked={episode.likedByMe}
              count={episode.likeCount}
              disabled={!canLike}
              onError={toast.show}
            />
          )
        }
      />

      <Toast message={toast.message} onDone={toast.clear} />
    </>
  );
}
