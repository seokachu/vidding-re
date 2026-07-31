"use client";

import { Pin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ButtonLink, StoryCard, Toast, useToast } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { deleteEpisodeAction } from "./actions";
import type { EpisodeItem } from "./types";

/**
 * 내 사연 고정 블록 (F3 3.6).
 *
 * **목록 위치와 무관하게 맨 위에 순위와 함께 고정한다.** 아래 목록에서는
 * 중복해 보여주지 않는다. 100건 중 47위인 사연을 찾으려고 목록을 내리게 만들면
 * "동점자가 마감 전에 자기 순위를 알고 대응한다"는 F5 3.2.1 요건이 무너진다.
 *
 * 자기 사연이므로 공감 버튼은 없다 (F4 3.4).
 */
export function MyEpisodeBlock({
  episode,
  total,
  auctionId,
  /** 진행중이면 수정할 수 있다 (RLS episodes_update_author) */
  canEdit,
  /** 낙찰 사연은 거래 기록이라 지울 수 없다 (F3 3.4) */
  canDelete,
}: {
  episode: EpisodeItem;
  total: number;
  auctionId: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteEpisodeAction(episode.id);
      setConfirming(false);

      if (!result.ok) {
        toast.show(result.message);
        return;
      }

      // 참여자 → 방문자 전이가 화면에 반영되어야 한다 (00-관계-판정 3.4)
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2.5 rounded-md bg-accent-subtle p-[14px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-label font-bold text-accent-text">
          <Pin size={14} />
          내 사연
        </span>
        <span className="tabular text-label font-semibold text-accent-text">
          {total}명 중 {episode.rank}위
        </span>
      </div>

      <StoryCard
        rank={episode.rank}
        nickName="나"
        score={episode.totalScore}
        title={episode.title}
        content={episode.content}
        highlighted={episode.isWinner}
      />

      {(canEdit || canDelete) &&
        (confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-label leading-normal text-accent-text">
              사연을 지우면 받은 공감도 함께 사라져요.
              {episode.bidAmount > 0 && " 건 포인트는 전액 돌려드립니다."}
            </p>
            <div className="flex w-full gap-2">
              <Button
                variant="secondary"
                block
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="py-[13px] text-label"
              >
                그만두기
              </Button>
              <Button
                block
                disabled={pending}
                onClick={remove}
                className="py-[13px] text-label"
              >
                {pending ? "지우는 중…" : "지우기"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full gap-2">
            {canEdit && (
              <ButtonLink
                variant="secondary"
                block
                href={ROUTES.episodeWrite(auctionId)}
                className="py-[13px] text-label"
              >
                수정
              </ButtonLink>
            )}
            {canDelete && (
              <Button
                variant="secondary"
                block
                onClick={() => setConfirming(true)}
                className="py-[13px] text-label text-text-tertiary"
              >
                삭제
              </Button>
            )}
          </div>
        ))}

      <Toast message={toast.message} onDone={toast.clear} />
    </div>
  );
}
