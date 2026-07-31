import { redirect } from "next/navigation";

import { ChatRoom } from "@/features/notify/chat-room";
import { RetryState } from "@/features/notify/retry-state";
import { TopAppBar } from "@/components/ui";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "채팅 · Vidding" };

/**
 * S10 · S10b — 주최자 ↔ 낙찰자 1:1 채팅 (F6).
 *
 * Next 16 에서 `params` 는 Promise 다. `await` 로 푼다.
 *
 * **참여자는 저장돼 있지 않다. 경매에서 도출한다** (F6 3.1 · 완료 조건 5).
 * 주최자 = `auctions.user_id`, 낙찰자 = `winning_episode_id` 가 가리키는 사연의 작성자.
 * RLS(`is_chat_participant`)가 같은 규칙을 강제하므로 **남의 방은 애초에 조회되지 않는다.**
 * 즉 아래 `room` 이 비는 경우는 "없는 방"과 "내 방이 아님"이 구분되지 않는다 —
 * 둘 다 조용히 내보낸다.
 */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuthUser(ROUTES.chat(id));
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .select("id, auction_id")
    .eq("id", id)
    .maybeSingle();

  if (roomError) {
    return (
      <>
        <TopAppBar title="채팅" />
        <main className="flex-1">
          <RetryState description={"대화를 불러오지 못했어요.\n잠시 후 다시 시도해주세요"} />
        </main>
      </>
    );
  }

  // 없는 방이거나 내가 참여자가 아니다. 어느 쪽인지 알려주지 않고 내보낸다 (F6 4)
  if (!room) redirect(ROUTES.notifications);

  const { data: auction } = await supabase
    .from("auctions")
    .select("id, title, user_id, winning_episode_id")
    .eq("id", room.auction_id)
    .maybeSingle();

  if (!auction) redirect(ROUTES.notifications);

  // 낙찰자는 저장하지 않고 낙찰 사연에서 도출한다 (P2)
  let winnerId: string | null = null;
  if (auction.winning_episode_id) {
    const { data: winning } = await supabase
      .from("episodes")
      .select("user_id")
      .eq("id", auction.winning_episode_id)
      .maybeSingle();
    winnerId = winning?.user_id ?? null;
  }

  const otherId = user.id === auction.user_id ? winnerId : auction.user_id;

  const { data: other } = otherId
    ? await supabase
        .from("v_user_profiles")
        .select("id, nick_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle()
    : { data: null };

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_room_id", room.id)
    .order("created_at", { ascending: true });

  return (
    <ChatRoom
      roomId={room.id}
      meId={user.id}
      otherName={other?.nick_name ?? "상대"}
      auctionId={auction.id}
      auctionTitle={auction.title}
      initialMessages={messages ?? []}
      // 조회 실패를 빈 대화로 위장하지 않는다 (F6 4)
      loadFailed={Boolean(messagesError)}
    />
  );
}
