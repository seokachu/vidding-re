/**
 * 00. 관계 판정 — 모든 기능의 노출·허용 여부를 결정하는 공통 기반.
 *
 * 사용자 유형(`role`)을 대신해 **사용자와 경매 1건 사이의 관계**로 권한을 판단한다.
 * 이 파일은 `users.role` 을 조회하지 않는다. 그런 컬럼은 스키마에 없다 (F10 5-3).
 *
 * 순수 함수만 둔다. 서버 컴포넌트도 클라이언트 컴포넌트도 같은 판정을 쓰되,
 * **서버 판정이 최종이다** (00-관계-판정 4). 클라이언트에서 버튼이 보였더라도
 * 서버가 거부하면 실패를 안내하고 화면을 갱신한다.
 */

export type Relationship =
  /** 미로그인 */
  | "GUEST"
  /** 내가 등록한 경매 */
  | "HOST"
  /** 내가 사연을 쓴 경매 */
  | "PARTICIPANT"
  /** 로그인했지만 위 둘 다 아님 */
  | "VISITOR";

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  GUEST: "비회원",
  HOST: "주최자",
  PARTICIPANT: "참여자",
  VISITOR: "방문자",
};

/** 판정에 필요한 최소 정보 (00-관계-판정 3.1) */
export type RelationshipInput = {
  /** 로그인 사용자 ID. 없으면 비회원 */
  userId: string | null;
  /** 경매 주최자 */
  auctionUserId: string;
  /**
   * 해당 경매에 내 사연이 있는가.
   *
   * **`null` 은 "조회에 실패했다"는 뜻이다.** `false` 와 구별한다 —
   * 실패를 방문자로 확정하면 권한이 넓어지는 쪽으로 잘못 판정된다.
   */
  hasMyEpisode: boolean | null;
};

/**
 * 관계를 판정한다. **위에서부터 순서대로 평가하고 처음 일치하는 것으로 확정한다** (3.2).
 *
 * 네 관계는 상호배타다. 주최자는 자기 경매에 사연을 쓸 수 없으므로(F3)
 * 2번과 3번이 동시에 참이 되는 경우는 없다.
 *
 * 판정할 수 없으면 `null` 을 돌려준다. **방문자로 떨어뜨리지 않는다** (4).
 */
export function resolveRelationship({
  userId,
  auctionUserId,
  hasMyEpisode,
}: RelationshipInput): Relationship | null {
  if (!userId) return "GUEST";
  if (userId === auctionUserId) return "HOST";

  // 주최자가 아닌데 사연 존재 여부를 모른다 → 참여자인지 방문자인지 가릴 수 없다
  if (hasMyEpisode === null) return null;

  return hasMyEpisode ? "PARTICIPANT" : "VISITOR";
}

/* -------------------------------------------------------------------------- */

/** 접근 판정에 필요한 경매 상태 */
export type AuctionState = {
  status: "OPEN" | "CLOSED";
  /** 마감 시각. 지났으면 처리 완료 전이라도 마감으로 본다 (데이터 모델 §9) */
  endAt: string | Date;
  /** 모인 사연 수. 삭제 가능 여부에 쓴다 (F1 3.6) */
  episodeCount?: number;
  /** 낙찰 사연 작성자. 채팅 상대 판정에 쓴다 (F6) */
  winnerUserId?: string | null;
};

export type Abilities = {
  /** 경매·사연 열람 — 언제나 열려 있다 */
  view: boolean;
  /** 경매 수정 — 주최자 + OPEN (F1 3.5) */
  editAuction: boolean;
  /** 경매 삭제 — 주최자 + 사연 0건 (F1 3.6) */
  deleteAuction: boolean;
  /** 사연 작성 — 방문자만 (주최자는 자기 경매에 쓸 수 없다) */
  writeEpisode: boolean;
  /** 사연 입찰 — 참여자만 */
  placeBid: boolean;
  /** 공감 — 주최자 +50, 그 외 +10 */
  like: boolean;
  /** 찜 — 개인 북마크라 경매 상태와 무관하다 (F7) */
  favorite: boolean;
  /** 1:1 채팅 — 낙찰 확정 이후 주최자와 낙찰자에게만 (F6) */
  chat: boolean;
};

const NOTHING: Abilities = {
  view: true,
  editAuction: false,
  deleteAuction: false,
  writeEpisode: false,
  placeBid: false,
  like: false,
  favorite: false,
  chat: false,
};

/** `end_at` 이 지났으면 마감 처리 완료 전이라도 마감으로 본다 */
export function isAuctionClosed(auction: AuctionState): boolean {
  if (auction.status === "CLOSED") return true;
  return new Date(auction.endAt).getTime() <= Date.now();
}

/**
 * 3.5 기능 접근 규칙 표를 그대로 옮긴 것이다.
 * **이 함수가 모든 기능 스펙의 권한 기준이다.** 개별 화면이 다시 정의하지 않는다.
 *
 * `relationship` 이 `null`(판정 불가)이면 아무 액션도 열지 않는다.
 * 원칙 — 불확실하면 열지 않는다.
 */
export function abilities(
  relationship: Relationship | null,
  auction: AuctionState,
  userId: string | null = null,
): Abilities {
  if (relationship === null || relationship === "GUEST") return NOTHING;

  const closed = isAuctionClosed(auction);
  /** 마감되면 경매 결과에 영향을 주는 액션을 차단한다 (4) */
  const scoring = !closed;

  const isWinner =
    !!userId && !!auction.winnerUserId && auction.winnerUserId === userId;

  switch (relationship) {
    case "HOST":
      return {
        view: true,
        editAuction: !closed,
        deleteAuction: (auction.episodeCount ?? 0) === 0,
        writeEpisode: false,
        placeBid: false,
        like: scoring,
        favorite: false,
        // 낙찰이 확정된 뒤에만 열린다. 유찰이면 방이 없다
        chat: closed && !!auction.winnerUserId,
      };

    case "PARTICIPANT":
      return {
        view: true,
        editAuction: false,
        deleteAuction: false,
        writeEpisode: false,
        placeBid: scoring,
        like: scoring,
        favorite: true,
        chat: closed && isWinner,
      };

    case "VISITOR":
      return {
        view: true,
        editAuction: false,
        deleteAuction: false,
        writeEpisode: scoring,
        placeBid: false,
        like: scoring,
        favorite: true,
        chat: false,
      };
  }
}
