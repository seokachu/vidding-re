import type { AuctionStatus } from "@/lib/supabase/database.types";

/**
 * 화면과 조회가 함께 쓰는 모양.
 *
 * `data.ts` 는 `server-only` 라 클라이언트 컴포넌트가 건드리면 빌드가 깨진다.
 * 타입과 상수만 여기로 떼어 둔다.
 */

/** 한 번에 이어 붙이는 사연 수. 사용자와의 약속이 아니라 구현값이다 (F3 3.6) */
export const EPISODE_PAGE_SIZE = 10;

export type AuctionDetail = {
  id: string;
  hostId: string;
  hostNickName: string;
  title: string;
  description: string;
  imageUrls: string[];
  endAt: string;
  status: AuctionStatus;
  winningEpisodeId: string | null;
};

export type EpisodeItem = {
  id: string;
  /** 전체 정렬에서의 순위. 페이지를 잘라도 흔들리지 않는다 */
  rank: number;
  authorId: string;
  nickName: string;
  title: string;
  content: string;
  /** 본인이 건 포인트 */
  bidAmount: number;
  /** 건 포인트 + 받은 공감 가중치 (F3 3.5) */
  totalScore: number;
  likeCount: number;
  likedByMe: boolean;
  isWinner: boolean;
  isMine: boolean;
};

export type EpisodeList = {
  /** 아래 목록. 내 사연은 빠져 있다 */
  items: EpisodeItem[];
  /** 목록 맨 위에 고정한다. 아래 목록에서는 중복해 보여주지 않는다 (F3 3.6) */
  mine: EpisodeItem | null;
  /** 목록 제목이 알려주는 총 개수. 내 사연을 포함한다 */
  total: number;
  hasMore: boolean;
};

/** 낙찰 사연의 점수 내역 (S09) */
export type ScoreBreakdown = {
  hostLikeCount: number;
  hostWeightSum: number;
  otherLikeCount: number;
  otherWeightSum: number;
};
