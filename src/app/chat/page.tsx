import Link from "next/link";

import { Avatar, EmptyState, ErrorState, TopAppBar } from "@/components/ui";
import { getAuthUser } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * 채팅 목록 (S16). 탭 4곳 헤더의 채팅 아이콘으로 들어온다.
 *
 * 참여자 판정은 RLS 가 한다 — `chat_rooms` 를 그냥 조회하면 그게 곧 내 방
 * 목록이다 (F6 3.2). 상대는 저장돼 있지 않으므로 경매에서 도출한다:
 * 내가 주최자면 낙찰자, 아니면 주최자다 (P2).
 *
 * 마지막 메시지가 배송 정보(ADDRESS)면 내용을 미리보기하지 않는다 —
 * 이름·연락처·주소가 목록에 노출되기 때문이다 (푸시 미리보기와 같은 규칙,
 * `20260804000002`).
 */
export default async function ChatListPage() {
  const user = await getAuthUser();
  if (!user) return null; // 미로그인은 proxy 가 이미 돌려보낸다

  const supabase = await createClient();

  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select(
      "id, created_at, auctions!inner(title, user_id, winning_episode_id), messages(kind, content, sender_id, created_at)",
    )
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });

  if (error) {
    return (
      <Shell>
        <ErrorState description={"대화 목록을 불러오지 못했어요.\n잠시 후 다시 시도해주세요"} />
      </Shell>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <Shell>
        <EmptyState
          title="아직 대화가 없어요"
          description={"낙찰이 이뤄지면 주최자와 낙찰자의\n채팅방이 여기에 열려요"}
          className="pt-16"
        />
      </Shell>
    );
  }

  // 상대 도출: 내가 주최자면 낙찰 사연의 작성자, 아니면 주최자 (P2)
  const winningIds = rooms
    .map((room) => room.auctions.winning_episode_id)
    .filter((id): id is string => id !== null);

  const { data: winners } = winningIds.length
    ? await supabase.from("episodes").select("id, user_id").in("id", winningIds)
    : { data: [] };
  const winnerByEpisode = new Map(
    (winners ?? []).map((episode) => [episode.id, episode.user_id]),
  );

  const otherIds = rooms
    .map((room) =>
      room.auctions.user_id === user.id
        ? (winnerByEpisode.get(room.auctions.winning_episode_id ?? "") ?? null)
        : room.auctions.user_id,
    )
    .filter((id): id is string => id !== null);

  const { data: profiles } = otherIds.length
    ? await supabase
        .from("v_user_profiles")
        .select("id, nick_name, avatar_url")
        .in("id", otherIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // 방별 미읽음 수 — RLS 가 내 방으로 좁혀 주므로 상대가 보낸 미읽음만 세면 된다
  const { data: unread } = await supabase
    .from("messages")
    .select("chat_room_id")
    .is("read_at", null)
    .neq("sender_id", user.id);
  const unreadByRoom = new Map<string, number>();
  for (const m of unread ?? []) {
    unreadByRoom.set(m.chat_room_id, (unreadByRoom.get(m.chat_room_id) ?? 0) + 1);
  }

  // 최근 대화가 위로 온다. 메시지가 없는 방은 방이 생긴 시각으로 줄 세운다
  const sorted = [...rooms].sort(
    (a, b) =>
      new Date(b.messages[0]?.created_at ?? b.created_at).getTime() -
      new Date(a.messages[0]?.created_at ?? a.created_at).getTime(),
  );

  return (
    <Shell>
      <ul className="px-gutter">
        {sorted.map((room) => {
          const otherId =
            room.auctions.user_id === user.id
              ? (winnerByEpisode.get(room.auctions.winning_episode_id ?? "") ?? null)
              : room.auctions.user_id;
          const other = otherId ? profileById.get(otherId) : undefined;
          const last = room.messages[0] ?? null;
          const unreadCount = unreadByRoom.get(room.id) ?? 0;

          const preview = !last
            ? "아직 메시지가 없어요"
            : last.kind === "ADDRESS"
              ? "배송 정보를 보냈어요"
              : last.content;

          return (
            <li key={room.id}>
              <Link
                href={ROUTES.chat(room.id)}
                className="flex items-center gap-3 py-3.5"
              >
                <Avatar
                  src={other?.avatar_url}
                  nickName={other?.nick_name}
                  size={48}
                />

                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-body font-semibold text-text-primary">
                      {other?.nick_name ?? "상대"}
                    </span>
                    <span className="truncate text-label text-text-tertiary">
                      · {room.auctions.title}
                    </span>
                    <span className="ml-auto shrink-0 text-label text-text-tertiary">
                      {formatRelativeTime(last?.created_at ?? room.created_at)}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <span
                      className={
                        last
                          ? "min-w-0 flex-1 truncate text-caption text-text-secondary"
                          : "min-w-0 flex-1 truncate text-caption text-text-tertiary"
                      }
                    >
                      {preview}
                    </span>
                    {unreadCount > 0 && (
                      <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-micro font-semibold text-text-on-accent">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/** 헤더가 모든 분기에서 같아야 화면이 덜컹거리지 않는다 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopAppBar title="채팅" />
      <main className="flex-1">{children}</main>
    </>
  );
}
