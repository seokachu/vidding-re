/**
 * 경매 등록·수정의 입력값과 검증 (F1 3.3 · 4.2).
 *
 * 순수 함수만 둔다. **폼과 서버 액션이 같은 판정을 쓴다** — 클라이언트에서
 * 버튼이 눌렸더라도 서버가 다시 검증하고, 서버 판정이 최종이다 (00-관계-판정 4).
 *
 * 글자 수 한도의 단일 출처는 `데이터-모델-명세.md` §11.4 다. DB 는
 * `btrim(...) > 0` 만 강제하므로 상한은 여기서 지킨다 (F1 4.2).
 */

import { AUCTION_IMAGE_MAX, AUCTION_IMAGE_MIN } from "@/lib/constants";

export const AUCTION_TITLE_MAX = 50;
export const AUCTION_DESCRIPTION_MAX = 500;

/** 기간은 버튼 3개에서만 고른다. 선택지가 곧 검증이다 (F1 3.3) */
export const AUCTION_DURATION_DAYS = [1, 3, 7] as const;
export type AuctionDurationDays = (typeof AUCTION_DURATION_DAYS)[number];

export type AuctionInput = {
  title: string;
  description: string;
  /** 업로드가 끝난 공개 URL. 순서가 그대로 대표 이미지 순서다 */
  imageUrls: string[];
  days: number;
};

export type AuctionFieldErrors = {
  images?: string;
  title?: string;
  description?: string;
  days?: string;
};

const REQUIRED = "필수 입력 항목입니다";

/** 검증 실패는 제출을 막고, 해당 입력 항목 아래에 사유를 인라인으로 띄운다 (F1 4.2) */
export function validateAuctionInput(input: AuctionInput): AuctionFieldErrors {
  const errors: AuctionFieldErrors = {};

  if (input.imageUrls.length < AUCTION_IMAGE_MIN) {
    errors.images = `이미지를 ${AUCTION_IMAGE_MIN}장 이상 등록해주세요`;
  } else if (input.imageUrls.length > AUCTION_IMAGE_MAX) {
    errors.images = `이미지는 ${AUCTION_IMAGE_MAX}장까지 등록할 수 있어요`;
  }

  const title = input.title.trim();
  if (!title) errors.title = REQUIRED;
  else if (title.length > AUCTION_TITLE_MAX) {
    errors.title = `${AUCTION_TITLE_MAX}자까지 쓸 수 있어요`;
  }

  const description = input.description.trim();
  if (!description) errors.description = REQUIRED;
  else if (description.length > AUCTION_DESCRIPTION_MAX) {
    errors.description = `${AUCTION_DESCRIPTION_MAX}자까지 쓸 수 있어요`;
  }

  if (!isAuctionDuration(input.days)) errors.days = REQUIRED;

  return errors;
}

export function hasFieldError(errors: AuctionFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function isAuctionDuration(value: number): value is AuctionDurationDays {
  return (AUCTION_DURATION_DAYS as readonly number[]).includes(value);
}

/**
 * 마감 시각 = 등록 시점 + 선택한 기간 (F1 3.3).
 * 날짜·시간 피커가 없으므로 과거 날짜 같은 검증이 필요 없다.
 */
export function auctionEndAt(days: AuctionDurationDays, from = new Date()): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}
