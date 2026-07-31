/**
 * 고정 상수.
 *
 * **단일 출처는 `docs/데이터-모델-명세.md` §11 이다.** 값이 바뀌면 그 표를 먼저 고친다.
 * 여기 있는 것은 화면이 쓰기 위한 사본이고, DB 의 CHECK 제약이 최종 판정을 한다.
 */

import type { BidAmount } from "./supabase/database.types";

/* --- §11.1 입찰 ---------------------------------------------------------- */

/** 숫자를 직접 입력하지 않는다. ＋/− 버튼으로 이 배열 위를 오간다 */
export const BID_STEPS = [1000, 1500, 2000, 2500, 3000] as const satisfies
  readonly BidAmount[];

export const BID_MIN = BID_STEPS[0];
export const BID_MAX = BID_STEPS[BID_STEPS.length - 1];
/** 아직 포인트를 걸지 않은 사연 */
export const BID_NONE = 0;

export function isBidStep(value: number): value is (typeof BID_STEPS)[number] {
  return (BID_STEPS as readonly number[]).includes(value);
}

/** 현재 단계의 다음 값. 상한이면 `null` */
export function nextBidStep(current: number): number | null {
  const next = BID_STEPS.find((step) => step > current);
  return next ?? null;
}

/** 현재 단계의 이전 값. 하한이면 `null` (0 으로 되돌리는 길은 사연 삭제뿐이다) */
export function prevBidStep(current: number): number | null {
  const prev = [...BID_STEPS].reverse().find((step) => step < current);
  return prev ?? null;
}

/* --- §11.2 공감 가중치 --------------------------------------------------- */

/** 주최자가 결과에 개입하는 수단은 공감 하나뿐이다 */
export const LIKE_WEIGHT_HOST = 50;
export const LIKE_WEIGHT_OTHER = 10;

/* --- §11.3 경매 기간 ----------------------------------------------------- */

export const AUCTION_DURATIONS = [
  { days: 1, label: "1일" },
  { days: 3, label: "3일" },
  { days: 7, label: "7일" },
] as const;

/** 회전이 빠른 쪽을 기본으로 둔다 */
export const AUCTION_DURATION_DEFAULT = 1;

/* --- §11.4 글자 수 ------------------------------------------------------- */

export const EPISODE_TITLE_MIN = 2;
export const EPISODE_TITLE_MAX = 50;
export const EPISODE_CONTENT_MIN = 5;
export const EPISODE_CONTENT_MAX = 1000;

/* --- §11.5 이미지 -------------------------------------------------------- */

export const AUCTION_IMAGE_BUCKET = "auction-images";
export const AUCTION_IMAGE_MIN = 1;
export const AUCTION_IMAGE_MAX = 3;
export const AUCTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const AUCTION_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/* --- §10 포인트 ---------------------------------------------------------- */

export const SIGNUP_BONUS = 5000;

/* --- 마감 임박 ----------------------------------------------------------- */

/**
 * 화면에서 '마감 임박'으로 볼 시간.
 *
 * DB 의 알림 단계(3일·1일·1시간)와는 **별개다.** 알림은 깨우는 것이고,
 * 이 값은 목록에서 빨갛게 보여줄 기준이다.
 */
export const ENDING_SOON_MS = 24 * 60 * 60 * 1000;
