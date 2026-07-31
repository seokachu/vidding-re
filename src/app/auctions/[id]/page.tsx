import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BottomBar, TopAppBar } from "@/components/ui";
import { getAuctionContext } from "@/lib/relationship.server";
import { AuctionActions } from "@/features/auction-detail/auction-actions";
import { AuctionResult } from "@/features/auction-detail/auction-result";
import { AuctionSummary } from "@/features/auction-detail/auction-summary";
import {
  loadAuctionDetail,
  loadChatRoomId,
  loadEpisodes,
  loadPointBalance,
  loadScoreBreakdown,
} from "@/features/auction-detail/data";
import { EPISODE_PAGE_SIZE } from "@/features/auction-detail/types";
import { EpisodeSection } from "@/features/auction-detail/episode-section";
import { ErrorScreen } from "@/features/auction-detail/error-screen";
import { HostActions } from "@/features/auction-detail/host-actions";

type Props = {
  params: Promise<{ id: string }>;
  /** 펼쳐 둔 사연 수. 주소에 담아 두면 화면이 다시 그려져도 접히지 않는다 (F3 3.6) */
  searchParams: Promise<{ limit?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const auction = await loadAuctionDetail(id);
  return { title: auction ? `${auction.title} — Vidding` : "경매 — Vidding" };
}

/**
 * 경매 상세 — **한 페이지가 관계에 따라 달라진다** (00-관계-판정 3.4.1).
 *
 * 영역은 셋뿐이다. 이미지 · 제목과 설명 · 사연 목록. 관계가 바꾸는 것은
 * **하단 액션 한 자리**와 주최자의 수정·삭제 줄뿐이고, 나머지는 네 관계 모두에게
 * 똑같이 보인다. 열람은 언제나 열려 있기 때문이다 (3.5).
 *
 * 화면 갈래
 *   진행중            S03 방문자 · S03b 참여자 · S04 주최자
 *   마감 + 낙찰       S09 낙찰 결과
 *   마감 + 낙찰 없음   S03c 유찰
 *
 * **관계를 여기서 판정하지 않는다.** `getAuctionContext()` 하나가 판정하고,
 * 이 파일은 그 결과를 그리기만 한다.
 */
export default async function AuctionDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { limit: rawLimit } = await searchParams;
  const limit = clampLimit(rawLimit);

  const result = await getAuctionContext(id);

  if (!result.ok) {
    // 없는 경매는 404. 조회 실패는 재시도를 준다 — 둘은 다른 화면이다
    if (result.reason === "NOT_FOUND") notFound();
    return <ErrorScreen />;
  }

  const context = result.context;

  const [detail, list] = await Promise.all([
    loadAuctionDetail(id),
    loadEpisodes({
      auctionId: id,
      viewerId: context.userId,
      winningEpisodeId: context.winningEpisodeId,
      limit,
    }),
  ]);

  if (!detail) return <ErrorScreen />;

  // 참여자만 잔액이 필요하다. 입찰 단계 상한을 잡는 데 쓴다 (F3 4.3)
  const balance =
    context.relationship === "PARTICIPANT"
      ? await loadPointBalance(context.userId)
      : null;

  // RLS 가 주최자·낙찰자에게만 열어 준다. 조회되면 곧 참여 자격이 있다는 뜻이다
  const chatRoomId = context.can.chat ? await loadChatRoomId(id) : null;

  const winner =
    context.isClosed && context.winningEpisodeId && list
      ? (list.mine?.id === context.winningEpisodeId
          ? list.mine
          : list.items.find(
              (episode) => episode.id === context.winningEpisodeId,
            )) ?? null
      : null;

  const breakdown = winner ? await loadScoreBreakdown(winner.id) : null;

  const actions = (
    <AuctionActions
      context={context}
      myEpisode={list?.mine ?? null}
      balance={balance}
      chatRoomId={chatRoomId}
    />
  );

  /* --- 마감 + 낙찰 확정 → S09 낙찰 결과 --------------------------------- */
  if (winner && list) {
    return (
      <>
        <TopAppBar title={detail.title} />
        <main className="flex-1">
          <AuctionResult
            auction={detail}
            winner={winner}
            breakdown={breakdown}
            list={list}
            limit={limit}
            viewerId={context.userId}
          />
        </main>
        <BottomBar>{actions}</BottomBar>
      </>
    );
  }

  /* --- 진행중 · 유찰 ----------------------------------------------------- */
  return (
    <>
      {/* 우측 자리는 찜 버튼(F7)이다. 워크트리 A 의 `features/explore` 가 채운다 */}
      <TopAppBar title="" />

      <main className="flex-1">
        <AuctionSummary
          auction={detail}
          relationship={context.relationship}
          isClosed={context.isClosed}
          episodeCount={context.episodeCount}
          hostActions={
            // 주최자만 본다. 하단 바가 아니라 본문에 두는 것은 .pen S04 를 따른 것이다
            context.relationship === "HOST" && !context.isClosed ? (
              <HostActions
                auctionId={id}
                canEdit={context.can.editAuction}
                canDelete={context.can.deleteAuction}
                episodeCount={context.episodeCount}
              />
            ) : null
          }
        />

        <EpisodeSection
          list={list}
          auctionId={id}
          limit={limit}
          canLike={context.can.like}
          isClosed={context.isClosed}
          winningEpisodeId={context.winningEpisodeId}
        />
      </main>

      <BottomBar>{actions}</BottomBar>
    </>
  );
}

/** 주소로 들어오는 값이다. 터무니없는 수를 그대로 믿지 않는다 */
function clampLimit(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return EPISODE_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(parsed), EPISODE_PAGE_SIZE), 500);
}
