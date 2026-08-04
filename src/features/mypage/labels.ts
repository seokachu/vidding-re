import type { BadgeTone } from "@/components/ui";
import type { PointType } from "@/lib/supabase/database.types";
import type { MyEpisodeItem } from "./types";

/**
 * 포인트 원장의 사유 (F8 3.6).
 *
 * 반환은 종류가 셋(탈락 · 유찰 · 취소)이지만 화면에는 **`반환` 하나로 보인다.**
 * 사용자가 알아야 할 것은 "돌아왔다"이지 어떤 경로로 돌아왔는지가 아니다.
 * 경로는 `description` 이 문장으로 설명한다.
 */
const POINT_LABEL: Record<PointType, string> = {
  SIGNUP_BONUS: "가입 축하",
  BID: "입찰",
  BID_REFUND_LOST: "반환",
  BID_REFUND_VOID: "반환",
  BID_REFUND_CANCEL: "반환",
  WIN_TRANSFER: "낙찰 수령",
};

export function pointLabel(type: PointType): string {
  return POINT_LABEL[type] ?? "포인트";
}

/**
 * 내 사연의 상태 배지 (F8 3.4).
 *
 * 경매 배지(`auctionDisplayStatus`)와 다르다. 저기는 경매가 어떻게 됐는지를,
 * 여기는 **내 사연이 어떻게 됐는지**를 말한다. 같은 경매라도 사람마다 다르다.
 *
 * `LOST` 를 `탈락` 이라고 하지 않는다 — 사연을 꺼낸 사람에게 시험 낙방처럼
 * 읽힌다. 사람이 아니라 결과를 말한다(낙찰이 아니었다). 떨어진 쪽 알림이
 * "결과가 나왔어요" 라고만 하는 것과 같은 결이다.
 */
export function episodeOutcome(outcome: MyEpisodeItem["outcome"]): {
  label: string;
  tone: BadgeTone;
} {
  if (outcome === "WON") return { label: "낙찰", tone: "won" };
  if (outcome === "LOST") return { label: "미낙찰", tone: "void" };
  return { label: "참여중", tone: "ongoing" };
}
