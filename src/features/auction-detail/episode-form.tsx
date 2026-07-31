"use client";

import { Info } from "lucide-react";
import { useActionState, useState } from "react";

import {
  Button,
  ButtonLink,
  PointStepper,
  TextAreaField,
  TextField,
} from "@/components/ui";
import {
  BID_MIN,
  BID_STEPS,
  EPISODE_CONTENT_MAX,
  EPISODE_CONTENT_MIN,
  EPISODE_TITLE_MAX,
  EPISODE_TITLE_MIN,
} from "@/lib/constants";
import { formatPoint } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

import {
  createEpisodeAction,
  updateEpisodeAction,
  type EpisodeFormState,
} from "./actions";
import { BottomBar } from "./bottom-bar";

const GUIDE = [
  "진정성 있는 개인적인 이야기를 들려주세요",
  "이 경험이 왜 의미있는지 설명해주세요",
  "당신의 특별한 순간과 어떤 연관이 있는지 공유해주세요",
];

/**
 * S05 사연 작성 · 입찰 (F3).
 *
 * 작성과 입찰은 개념상 2단계지만 화면에서는 한 번에 낸다 (F3 3.1).
 * **사연이 저장된 뒤 입찰이 실패해도 사연을 되돌리지 않는다** (F3 4.4) —
 * 그 판단은 서버 함수가 한다.
 *
 * 수정 모드에서는 입찰 자리를 그리지 않는다. 이미 건 포인트는 내릴 수 없고,
 * 올리는 것은 경매 상세의 하단 바가 맡는다 (F3 3.3).
 */
export function EpisodeForm({
  auctionId,
  /** 있으면 수정 모드다 */
  episode,
  balance,
}: {
  auctionId: string;
  episode: { id: string; title: string; content: string; bid_amount: number } | null;
  balance: number;
}) {
  const editing = episode !== null;

  const [state, formAction, pending] = useActionState<
    EpisodeFormState,
    FormData
  >(editing ? updateEpisodeAction : createEpisodeAction, {});

  const [title, setTitle] = useState(state.values?.title ?? episode?.title ?? "");
  const [content, setContent] = useState(
    state.values?.content ?? episode?.content ?? "",
  );

  /** 감당할 수 없는 단계는 고를 수 없다 (F3 4.3) */
  const affordable = BID_STEPS.filter((step) => step <= balance);
  const canBid = affordable.length > 0;
  const [bid, setBid] = useState<number>(BID_MIN);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="auctionId" value={auctionId} />
      {episode && <input type="hidden" name="episodeId" value={episode.id} />}

      <main className="flex-1">
        {!editing && (
          <section className="px-gutter pt-4">
            <div className="flex flex-col gap-[7px] rounded-md bg-accent-subtle px-4 py-[15px]">
              <h2 className="text-label font-bold text-accent-text">
                이렇게 써보세요
              </h2>
              {GUIDE.map((line) => (
                <p key={line} className="flex gap-[7px] text-label leading-normal text-accent-text">
                  <span aria-hidden>·</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-[22px] px-gutter pt-6">
          <TextField
            id="episode-title"
            name="title"
            label="사연 제목"
            required
            placeholder="사연을 한 줄로 소개해 주세요"
            maxLength={EPISODE_TITLE_MAX}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            helper={`${EPISODE_TITLE_MIN}자 이상 ${EPISODE_TITLE_MAX}자 이하 · ${title.length}/${EPISODE_TITLE_MAX}`}
            // 한도에 닿으면 경고색으로 바꾼다 (F3 4.2)
            error={
              state.fieldErrors?.title ??
              (title.length >= EPISODE_TITLE_MAX
                ? `제목은 ${EPISODE_TITLE_MAX}자까지 쓸 수 있어요`
                : undefined)
            }
          />

          <TextAreaField
            id="episode-content"
            name="content"
            label="사연 내용"
            required
            rows={7}
            placeholder="왜 이 물건이 필요한지 이야기해 주세요"
            maxLength={EPISODE_CONTENT_MAX}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            helper={`${EPISODE_CONTENT_MIN}자 이상 ${EPISODE_CONTENT_MAX.toLocaleString("ko-KR")}자 이하 · ${content.length.toLocaleString("ko-KR")} / ${EPISODE_CONTENT_MAX.toLocaleString("ko-KR")}`}
            error={
              state.fieldErrors?.content ??
              (content.length >= EPISODE_CONTENT_MAX
                ? `내용은 ${EPISODE_CONTENT_MAX.toLocaleString("ko-KR")}자까지 쓸 수 있어요`
                : undefined)
            }
          />
        </section>

        {!editing && (
          <section className="flex flex-col gap-3 px-gutter pt-7">
            <div className="flex flex-col gap-[3px]">
              <h2 className="text-title font-bold text-text-primary">
                얼마를 걸까요
              </h2>
              <p className="text-caption leading-normal text-text-secondary">
                {formatPoint(BID_MIN)}부터 500 P씩 올릴 수 있어요. 상한은{" "}
                {formatPoint(BID_STEPS[BID_STEPS.length - 1])}입니다
              </p>
            </div>

            {canBid ? (
              <>
                {/* 숫자를 직접 입력하지 않는다. ＋/− 가 곧 검증이다 (F3 3.3 · 4.3) */}
                <input type="hidden" name="bid" value={bid} />
                <PointStepper
                  value={bid}
                  onChange={setBid}
                  max={balance}
                  disabled={pending}
                />

                <div className="flex items-center justify-between px-0.5 py-1">
                  <span className="text-caption text-text-secondary">
                    보유 포인트
                  </span>
                  <span className="tabular text-caption font-semibold text-text-primary">
                    {formatPoint(balance)}
                  </span>
                </div>

                <NoteBox>낙찰되지 않으면 건 포인트를 전액 돌려받아요</NoteBox>
              </>
            ) : (
              // 1,000 P 도 안 되면 진입 시 안내한다. 사연만 먼저 등록할 수 있다 (F3 4.3)
              <NoteBox>
                보유 포인트가 {formatPoint(balance)}이라 지금은 포인트를 걸 수
                없어요. 사연만 먼저 등록하고 나중에 올릴 수 있습니다.
              </NoteBox>
            )}
          </section>
        )}

        {state.message && (
          <p
            role="alert"
            className="mx-gutter mt-6 rounded-md bg-warning-subtle px-4 py-3 text-caption leading-relaxed text-warning-text"
          >
            {state.message}
          </p>
        )}
      </main>

      <BottomBar>
        {state.bidFailed ? (
          // 사연은 남아 있다. 다시 제출하게 두면 중복 작성으로 또 실패한다 (F3 4.4)
          <ButtonLink block href={ROUTES.auction(auctionId)}>
            경매로 돌아가 입찰 다시 하기
          </ButtonLink>
        ) : (
          <Button type="submit" block disabled={pending}>
            {pending ? "보내는 중…" : editing ? "수정 완료" : "사연 등록하기"}
          </Button>
        )}
      </BottomBar>
    </form>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-[7px] rounded-md bg-surface px-[14px] py-3">
      <Info size={15} className="mt-0.5 shrink-0 text-text-secondary" />
      <p className="text-label leading-normal text-text-secondary">{children}</p>
    </div>
  );
}
