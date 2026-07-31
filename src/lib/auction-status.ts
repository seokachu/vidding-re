import type { BadgeTone } from "@/components/ui/badge";
import { ENDING_SOON_MS } from "./constants";
import type { AuctionStatus } from "./supabase/database.types";

/**
 * 경매 상태 배지 판정.
 *
 * DB 는 `OPEN` / `CLOSED` 둘만 저장한다. **마감 임박·낙찰·유찰은 파생 상태다** (P5).
 * 화면 다섯 갈래가 같은 판정을 쓰도록 여기 한 곳에서 계산한다.
 */
export type AuctionDisplayStatus = {
  label: "진행중" | "마감 임박" | "마감됨" | "낙찰됨" | "유찰";
  tone: BadgeTone;
  closed: boolean;
};

export function auctionDisplayStatus(
  auction: {
    status: AuctionStatus;
    end_at: string;
    winning_episode_id?: string | null;
  },
  now: Date = new Date(),
): AuctionDisplayStatus {
  if (auction.status === "CLOSED") {
    return auction.winning_episode_id
      ? { label: "낙찰됨", tone: "won", closed: true }
      : { label: "유찰", tone: "void", closed: true };
  }

  const left = new Date(auction.end_at).getTime() - now.getTime();

  // 마감 시각이 지났는데 아직 OPEN 이다. 크론(1분 주기)이 곧 처리한다.
  // 처리 완료 전이라도 화면은 마감으로 표시하고 참여 액션을 막는다 (데이터 모델 §9)
  if (left <= 0) return { label: "마감됨", tone: "closed", closed: true };

  if (left <= ENDING_SOON_MS) {
    return { label: "마감 임박", tone: "endingSoon", closed: false };
  }

  return { label: "진행중", tone: "ongoing", closed: false };
}
