"use client";

import { useState, useTransition } from "react";

import { Button, ButtonLink, Toast, useToast } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { deleteAuctionAction } from "./actions";

/**
 * 주최자의 경매 수정·삭제 (F1 3.5 · 3.6).
 *
 * **사연이 1건이라도 있으면 삭제할 수 없다.** 경매를 지우면 참여자가 쓴 사연과
 * 다른 사람이 누른 공감이 함께 사라진다. 주최자 한 사람의 조작으로
 * 제3자의 기록이 소멸하는 것을 허용하지 않는다.
 */
export function HostActions({
  auctionId,
  /** 주최자 + 진행중 (F1 4.1) */
  canEdit,
  /** 주최자 + 사연 0건 (F1 3.6) */
  canDelete,
  episodeCount,
}: {
  auctionId: string;
  canEdit: boolean;
  canDelete: boolean;
  episodeCount: number;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      // 성공하면 서버 함수가 홈으로 보낸다. 그때는 돌려받을 값이 없다
      const result = await deleteAuctionAction(auctionId);
      setConfirming(false);
      if (result && !result.ok) toast.show(result.message);
    });
  }

  return (
    <section className="flex flex-col gap-2 px-gutter pt-5">
      {confirming ? (
        <>
          <p className="text-caption leading-normal text-text-primary">
            이 경매를 지울까요? 되돌릴 수 없어요.
          </p>
          <div className="flex w-full gap-2">
            <Button
              variant="secondary"
              block
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="py-[14px] text-caption"
            >
              그만두기
            </Button>
            <Button
              block
              disabled={pending}
              onClick={remove}
              className="py-[14px] text-caption"
            >
              {pending ? "지우는 중…" : "지우기"}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex w-full gap-2">
          {canEdit && (
            <ButtonLink
              variant="secondary"
              block
              href={ROUTES.auctionEdit(auctionId)}
              className="py-[14px] text-caption"
            >
              수정하기
            </ButtonLink>
          )}
          <Button
            variant="secondary"
            block
            disabled={!canDelete}
            onClick={() => setConfirming(true)}
            className="py-[14px] text-caption text-text-tertiary"
          >
            삭제하기
          </Button>
        </div>
      )}

      {!canDelete && episodeCount > 0 && (
        <p className="text-micro text-text-tertiary">
          사연이 모인 경매는 삭제할 수 없어요
        </p>
      )}

      <Toast message={toast.message} onDone={toast.clear} />
    </section>
  );
}
