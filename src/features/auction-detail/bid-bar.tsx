"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, PointStepper, Toast, useToast } from "@/components/ui";
import { BID_MAX, BID_MIN, nextBidStep } from "@/lib/constants";
import { formatPoint } from "@/lib/format";

import { placeBidAction } from "./actions";

/**
 * 참여자의 하단 바 — 자기 사연에 포인트를 더 건다 (F3 3.3).
 *
 * **누적이다.** 올린 만큼만 추가로 차감되고, 내리기는 사연 삭제로만 가능하다.
 * 그래서 스테퍼의 하한이 이미 확정한 입찰액이다 (F3 4.3).
 *
 * 숫자를 직접 입력하지 않으므로 **형식·범위 검증이 없다. 버튼이 곧 검증이다.**
 * 마지막 판정은 `place_bid()` 가 한다.
 */
export function BidBar({
  episodeId,
  /** 이미 확정한 입찰액. 새 사연이면 0 */
  currentBid,
  balance,
}: {
  episodeId: string;
  currentBid: number;
  balance: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const floor = currentBid > 0 ? currentBid : BID_MIN;
  /** 감당할 수 없는 단계부터 ＋ 를 잠근다. 차액만 차감되므로 확정액을 더한다 (F3 4.3) */
  const affordable = currentBid + balance;
  const step = nextBidStep(currentBid);

  const atMax = currentBid >= BID_MAX;
  const broke = step === null ? false : step > affordable;

  const [value, setValue] = useState(() =>
    step !== null && step <= affordable ? step : floor,
  );

  function submit() {
    startTransition(async () => {
      const result = await placeBidAction(episodeId, value);
      if (!result.ok) {
        toast.show(result.message);
        // 반영 여부를 최신 값으로 다시 조회해 표시한다 (F3 4.4)
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  if (atMax) {
    return (
      <p className="flex h-[52px] w-full items-center justify-center rounded-md bg-surface text-body font-semibold text-text-secondary">
        최대까지 입찰했습니다
      </p>
    );
  }

  if (broke) {
    return (
      <p className="flex h-[52px] w-full items-center justify-center rounded-md bg-surface px-4 text-center text-caption font-semibold text-text-secondary">
        보유 포인트가 부족해 더 올릴 수 없어요 ({formatPoint(balance)})
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      <PointStepper
        value={value}
        onChange={setValue}
        min={floor}
        max={affordable}
        disabled={pending}
      />

      <Button
        block
        disabled={pending || value <= currentBid}
        onClick={submit}
      >
        {pending ? "올리는 중…" : "포인트 올리기"}
      </Button>

      <Toast message={toast.message} onDone={toast.clear} />
    </div>
  );
}
