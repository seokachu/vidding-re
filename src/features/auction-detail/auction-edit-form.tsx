"use client";

import { Info } from "lucide-react";
import { useActionState, useState } from "react";

import { Button, TextAreaField, TextField, Thumb } from "@/components/ui";
import { formatTimeLeft } from "@/lib/format";

import { updateAuctionAction, type AuctionFormState } from "./actions";
import { BottomBar } from "./bottom-bar";

const TITLE_MAX = 50;
const DESCRIPTION_MAX = 500;

/**
 * 경매 수정 (F1 3.5) — **소유 여부만으로 판단한다.**
 *
 * 고칠 수 있는 것은 제목과 사연 요청 설명 둘이다.
 *
 * - **기간은 고치지 않는다.** 마감 시각은 등록 시점에 정해지고(F1 3.3),
 *   이미 사연을 쓴 사람들이 그 시각을 보고 참여했다. 뒤늦게 옮기면
 *   F5 3.2.1 의 "마감 전에 자기 순위를 알고 대응한다"가 무너진다
 * - **이미지는 이 화면에서 바꾸지 않는다.** 업로드는 경매 등록 화면의 몫이다
 *
 * 실패해도 입력값을 유지한 채 화면에 머무른다. 절대 초기화하지 않는다 (F1 4.3).
 */
export function AuctionEditForm({
  auction,
}: {
  auction: {
    id: string;
    title: string;
    description: string;
    imageUrls: string[];
    endAt: string;
  };
}) {
  const [state, formAction, pending] = useActionState<
    AuctionFormState,
    FormData
  >(updateAuctionAction, {});

  const [title, setTitle] = useState(state.values?.title ?? auction.title);
  const [description, setDescription] = useState(
    state.values?.description ?? auction.description,
  );

  const left = formatTimeLeft(auction.endAt);

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="auctionId" value={auction.id} />

      <main className="flex-1">
        <section className="flex flex-col gap-[22px] px-gutter pt-6">
          <div className="flex flex-col gap-[7px]">
            <p className="text-label font-semibold text-text-secondary">
              등록한 사진
            </p>
            <div className="flex gap-2">
              {auction.imageUrls.map((src) => (
                <Thumb key={src} src={src} size={88} rounded="rounded-sm" />
              ))}
            </div>
          </div>

          <TextField
            id="auction-title"
            name="title"
            label="제목"
            required
            maxLength={TITLE_MAX}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            helper={`${title.length}/${TITLE_MAX}`}
            error={
              state.fieldErrors?.title ??
              (title.length >= TITLE_MAX
                ? `제목은 ${TITLE_MAX}자까지 쓸 수 있어요`
                : undefined)
            }
          />

          <TextAreaField
            id="auction-description"
            name="description"
            label="사연 요청 설명"
            required
            rows={6}
            placeholder="어떤 사연을 듣고 싶은지 알려주세요"
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            helper={`${description.length}/${DESCRIPTION_MAX}`}
            error={
              state.fieldErrors?.description ??
              (description.length >= DESCRIPTION_MAX
                ? `설명은 ${DESCRIPTION_MAX}자까지 쓸 수 있어요`
                : undefined)
            }
          />

          <div className="flex gap-[7px] rounded-md bg-surface px-[14px] py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-text-secondary" />
            <p className="text-label leading-normal text-text-secondary">
              마감까지 {left.text}. 마감 시각과 사진은 바꿀 수 없어요 — 이미 이
              조건을 보고 사연을 쓴 사람이 있기 때문입니다.
            </p>
          </div>
        </section>

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
        <Button type="submit" block disabled={pending}>
          {pending ? "저장 중…" : "수정 완료"}
        </Button>
      </BottomBar>
    </form>
  );
}
