import { notFound, redirect } from "next/navigation";

import { TopAppBar } from "@/components/ui";
import { getAuctionContext } from "@/lib/relationship.server";
import { ROUTES } from "@/lib/routes";
import {
  loadMyEpisode,
  loadPointBalance,
} from "@/features/auction-detail/data";
import { EpisodeForm } from "@/features/auction-detail/episode-form";
import { ErrorScreen } from "@/features/auction-detail/error-screen";

export const metadata = { title: "사연 쓰기 — Vidding" };

/**
 * S05 사연 작성 · 입찰 (F3).
 *
 * **한 경로가 작성과 수정을 겸한다.** 관계가 이미 답을 갖고 있기 때문이다 —
 * 방문자면 쓸 것이 없으니 작성, 참여자면 이미 쓴 것이 있으니 수정이다.
 * 사연은 한 경매에 1개뿐이라(F3 3.2) 어느 쪽인지 헷갈릴 여지가 없다.
 *
 * 주최자는 자기 경매에 사연을 쓸 수 없다. 버튼을 감추는 것으로 끝내지 않고
 * **직접 URL 진입도 경매 상세로 되돌린다** (F3 4.1).
 */
export default async function EpisodeWritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getAuctionContext(id);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") notFound();
    return <ErrorScreen title="사연 쓰기" />;
  }

  const { relationship, can, userId, isClosed } = result.context;

  // 판정하지 못했으면 열지 않는다. 불확실하면 넓히지 않는다 (00-관계-판정 4)
  if (relationship === null) {
    return (
      <ErrorScreen
        title="사연 쓰기"
        description={"잠시 후 다시 시도해주세요.\n지금은 사연을 쓸 수 없어요."}
      />
    );
  }

  // 프록시가 이미 걸러내지만 서버에서도 확인한다
  if (!userId) redirect(ROUTES.signin);

  // 주최자 · 마감된 경매 → 되돌린다 (F3 4.1)
  if (relationship === "HOST" || isClosed) redirect(ROUTES.auction(id));

  const episode =
    relationship === "PARTICIPANT" ? await loadMyEpisode(id, userId) : null;

  // 참여자인데 사연을 못 읽었다. 빈 작성 화면을 열면 중복 작성으로 실패한다
  if (relationship === "PARTICIPANT" && !episode) {
    return <ErrorScreen title="사연 수정" />;
  }

  if (!episode && !can.writeEpisode) redirect(ROUTES.auction(id));

  const balance = (await loadPointBalance(userId)) ?? 0;

  return (
    <>
      <TopAppBar title={episode ? "사연 수정" : "사연 쓰기"} />
      <EpisodeForm auctionId={id} episode={episode} balance={balance} />
    </>
  );
}
