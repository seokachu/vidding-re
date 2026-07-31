import { Heart, Lock, MessageCircle } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui";
import type { AuctionContext } from "@/lib/relationship.server";
import { ROUTES, signinWithReturn } from "@/lib/routes";

import { BidBar } from "./bid-bar";
import type { EpisodeItem } from "./types";

/**
 * 하단 고정 바 — **관계에 따라 달라지는 유일한 자리다** (00-관계-판정 3.4.1).
 *
 * 위 영역(이미지·제목·설명·사연 목록)은 네 관계 모두에게 똑같이 보인다.
 * 열람은 언제나 열려 있기 때문이다 (3.5).
 *
 * | 관계 | 진행중 | 마감 |
 * |---|---|---|
 * | 비회원 | 로그인 안내 | 마감 안내 |
 * | 주최자 | 공감 안내 (수정·삭제는 본문에) | 낙찰자와 채팅 · 유찰이면 마감 안내 |
 * | 참여자 | 입찰 스테퍼 + 포인트 올리기 | 낙찰자면 채팅 · 아니면 마감 안내 |
 * | 방문자 | 사연 쓰고 입찰하기 | 마감 안내 |
 */
export function AuctionActions({
  context,
  myEpisode,
  balance,
  chatRoomId,
}: {
  context: AuctionContext;
  myEpisode: EpisodeItem | null;
  balance: number | null;
  chatRoomId: string | null;
}) {
  const { relationship, can, isClosed, auctionId } = context;

  // 판정하지 못했다. **방문자로 취급하지 않는다** — 불확실하면 열지 않는다 (00 4)
  if (relationship === null) {
    return (
      <div className="flex flex-col gap-2">
        <Button block disabled>
          사연 쓰고 입찰하기
        </Button>
        <p className="text-center text-label text-text-secondary">
          잠시 후 다시 시도해주세요
        </p>
      </div>
    );
  }

  // 로그인 화면으로 유도하고, 로그인 후 원래 경매로 복귀시킨다 (F3 4.1 · F4 4)
  if (relationship === "GUEST") {
    return (
      <ButtonLink
        variant="secondary"
        block
        href={signinWithReturn(ROUTES.auction(auctionId))}
      >
        로그인하고 참여하기
      </ButtonLink>
    );
  }

  // 채팅은 낙찰 이후에만 열린다. 주최자와 낙찰자에 한한다 (F6 · F5 3.4)
  if (can.chat && chatRoomId) {
    return (
      <ButtonLink block href={ROUTES.chat(chatRoomId)}>
        <MessageCircle size={18} />
        {relationship === "HOST" ? "낙찰자와 대화 시작하기" : "주최자와 대화 시작하기"}
      </ButtonLink>
    );
  }

  if (isClosed) return <ClosedNote />;

  if (relationship === "HOST") {
    return (
      <Note icon={<Heart size={16} className="text-text-secondary" />}>
        공감으로 마음을 보태세요
      </Note>
    );
  }

  if (relationship === "PARTICIPANT" && myEpisode) {
    return (
      <div className="flex flex-col gap-2.5">
        {/* 이미 사연을 쓴 참여자에게는 작성 버튼을 숨기지 않고 상태를 밝힌다 (F3 4.1) */}
        <p className="text-label text-text-secondary">
          사연 작성 완료 · 포인트는 올리기만 할 수 있어요
        </p>
        <BidBar
          episodeId={myEpisode.id}
          currentBid={myEpisode.bidAmount}
          balance={balance ?? 0}
        />
      </div>
    );
  }

  if (can.writeEpisode) {
    return (
      <ButtonLink block href={ROUTES.episodeWrite(auctionId)}>
        사연 쓰고 입찰하기
      </ButtonLink>
    );
  }

  return <ClosedNote />;
}

/* -------------------------------------------------------------------------- */

function ClosedNote() {
  return (
    <Note icon={<Lock size={16} className="text-text-tertiary" />} muted>
      마감된 경매입니다
    </Note>
  );
}

/** 버튼이 아니다. 누를 것이 없으면 버튼처럼 보이지 않아야 한다 */
function Note({
  icon,
  muted,
  children,
}: {
  icon: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`flex h-[52px] w-full items-center justify-center gap-[7px] rounded-md bg-surface text-body font-semibold ${
        muted ? "text-text-tertiary" : "text-text-secondary"
      }`}
    >
      {icon}
      {children}
    </p>
  );
}
