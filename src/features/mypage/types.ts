import type { AuctionSummary, PointType } from "@/lib/supabase/database.types";

/**
 * 조회 결과 한 개. **실패를 빈 값으로 위장하지 않는다** (F8 4).
 *
 * 마이페이지는 영역이 다섯이고(프로필 · 배송지 · 탭 3개) 각각 따로 실패할 수 있다.
 * 한 영역이 실패해도 나머지는 그려야 하므로(F8 5-9) 예외를 던지지 않고
 * 이 모양으로 감싸서 돌려준다. `ok: false` 는 빈 목록과 다른 화면이 된다.
 */
export type Result<T> = { ok: true; data: T } | { ok: false };

export const FAILED = { ok: false } as const;

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/** 카드가 쓰는 경매 정보. 뷰에서 필요한 컬럼만 좁힌 것이다 */
export type AuctionCardData = Pick<
  AuctionSummary,
  | "auction_id"
  | "title"
  | "thumbnail"
  | "end_at"
  | "status"
  | "winning_episode_id"
  | "episode_count"
>;

/**
 * 내 사연 한 건. 담는 것은 **경매 이미지 · 경매 제목 · 상태** 셋뿐이다 (F8 3.4).
 *
 * 사연 내용 · 건 포인트 · 받은 공감 · 순위는 담지 않는다. 경매 상세에서 본다.
 */
export type MyEpisodeItem = {
  episodeId: string;
  auctionId: string;
  title: string;
  thumbnail: string | null;
  endAt: string;
  /** 참여중 · 낙찰 · 탈락 */
  outcome: "JOINED" | "WON" | "LOST";
};

/** 포인트 원장 한 줄. 사유 · 금액 · 시각뿐이다 (F8 3.6) */
export type PointItem = {
  id: string;
  type: PointType;
  amount: number;
  description: string;
  createdAt: string;
};

/** 프로필 영역. 이메일은 담지 않는다 — 화면에서 하는 일이 없다 (F8 3.2) */
export type MyProfile = {
  nickName: string;
  avatarUrl: string | null;
  pointBalance: number;
};
