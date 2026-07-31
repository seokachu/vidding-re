"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowUp, Info, RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ErrorState, TopAppBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/database.types";
import { fetchChatMessages, markChatRead, sendChatMessage } from "./actions";

/** 보내는 중이거나 실패한 내 메시지. 서버에 아직 행이 없으므로 따로 들고 있는다 */
type Outgoing = {
  localId: string;
  content: string;
  status: "sending" | "failed";
};

/**
 * S10 · S10b — 1:1 채팅방 (F6 · .pen S10).
 *
 * 실시간은 Supabase Realtime 이다. `messages` 에 발행이 켜져 있고 **RLS 가 그대로
 * 적용되므로 참여자만 이벤트를 받는다** (마이그레이션 05). 별도 인가가 필요 없다.
 */
export function ChatRoom({
  roomId,
  meId,
  otherName,
  auctionId,
  auctionTitle,
  initialMessages,
  loadFailed,
}: {
  roomId: string;
  meId: string;
  otherName: string;
  auctionId: string;
  auctionTitle: string;
  initialMessages: Message[];
  loadFailed: boolean;
}) {
  /**
   * 서버가 그려 준 목록(`initialMessages`)이 진실이고, state 에는 **그 뒤에 들어온 것만**
   * 담는다. 둘을 렌더 중에 합치므로 `initialMessages` 가 바뀔 때마다 state 를 맞춰 주는
   * effect 가 필요 없다. 읽음 처리 뒤 `refresh()` 로 서버 목록이 갱신돼도 그대로 반영된다.
   */
  const [live, setLive] = useState<Message[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // 나중에 받은 것이 이긴다 — read_at 이 채워진 행으로 덮인다
  const messages = useMemo(
    () => mergeById(initialMessages, live),
    [initialMessages, live],
  );

  /** 방을 열면 받은 메시지를 읽음으로 바꾼다 (F6 3.4). 배지도 함께 정리된다 */
  useEffect(() => {
    void markChatRead(roomId);
  }, [roomId, messages.length]);

  /* --- 실시간 수신 ------------------------------------------------------- */
  useEffect(() => {
    const supabase = createClient();
    let wasDown = false;
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    async function listen() {
      /**
       * **구독 전에 소켓에 토큰을 실어야 한다.**
       * `postgres_changes` 의 RLS 판정은 채널에 join 하는 순간 한 번 이뤄진다.
       * supabase-js 가 `INITIAL_SESSION` 을 받고 `setAuth` 를 부르는 것은
       * 비동기라, 그냥 구독하면 익명으로 join 해 **RLS 가 모든 행을 걸러낸다.**
       * 상태는 `SUBSCRIBED` 인데 이벤트만 오지 않아 알아채기 어렵다.
       */
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`chat-room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => {
            setLive((prev) => mergeById(prev, [payload.new as Message]));
          },
        )
        .on(
          "postgres_changes",
          {
            // 상대가 방을 열면 read_at 이 채워진다. '읽음' 표시가 여기서 바뀐다
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `chat_room_id=eq.${roomId}`,
          },
          (payload) => {
            setLive((prev) => mergeById(prev, [payload.new as Message]));
          },
        )
        .subscribe((status) => {
          const ok = status === "SUBSCRIBED";
          setConnected(ok);

          // 재연결됐다면 끊긴 사이 놓친 메시지를 다시 불러온다 (F6 4)
          if (ok && wasDown) {
            wasDown = false;
            void fetchChatMessages(roomId).then((rows) => {
              if (rows) setLive((prev) => mergeById(prev, rows));
            });
          }
          if (!ok) wasDown = true;
        });
    }

    void listen();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [roomId]);

  /* --- 하단 고정 스크롤 -------------------------------------------------- */
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, outgoing.length]);

  /* --- 전송 -------------------------------------------------------------- */
  const deliver = useCallback(async (localId: string, content: string) => {
    const result = await sendChatMessage(roomId, content);

    if (result.ok) {
      setLive((prev) => mergeById(prev, [result.message]));
      setOutgoing((prev) => prev.filter((o) => o.localId !== localId));
      return;
    }

    // 전송 실패 상태로 남겨 두고 재전송을 제공한다. 내용은 지우지 않는다 (F6 4)
    setOutgoing((prev) =>
      prev.map((o) => (o.localId === localId ? { ...o, status: "failed" } : o)),
    );
  }, [roomId]);

  function submit() {
    const content = draft.trim();
    if (!content) return; // 빈 메시지·공백만은 보내지 않는다 (F6 4)

    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOutgoing((prev) => [...prev, { localId, content, status: "sending" }]);
    setDraft("");
    void deliver(localId, content);
  }

  function retry(item: Outgoing) {
    setOutgoing((prev) =>
      prev.map((o) =>
        o.localId === item.localId ? { ...o, status: "sending" } : o,
      ),
    );
    void deliver(item.localId, item.content);
  }

  const rows = withDateSeparators(messages);

  return (
    <>
      <TopAppBar title={otherName} />

      {/* 이 대화의 목적을 한 줄로 못 박는다 — 채팅은 전달 논의 하나다 (F6 2) */}
      <div className="flex items-start gap-2 bg-surface px-gutter py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-text-secondary" />
        <p className="text-label leading-normal text-text-secondary">
          낙찰 이후 전달 방법을 정하는 대화예요.{" "}
          <Link
            href={ROUTES.auction(auctionId)}
            className="font-semibold text-accent-text underline underline-offset-2"
          >
            ‘{auctionTitle}’
          </Link>{" "}
          경매
        </p>
      </div>

      {!connected && (
        <p
          role="status"
          className="flex items-center gap-2 bg-warning-subtle px-gutter py-2 text-label text-warning-text"
        >
          <WifiOff size={14} className="shrink-0" />
          연결이 끊겼어요. 다시 연결하는 중이에요
        </p>
      )}

      <main className="flex flex-1 flex-col gap-[14px] px-gutter pb-6 pt-5">
        {loadFailed ? (
          // 조회 실패를 빈 대화로 위장하지 않는다 (F6 4)
          <ErrorState description={"대화를 불러오지 못했어요.\n잠시 후 다시 시도해주세요"} />
        ) : (
          <>
            {rows.length === 0 && outgoing.length === 0 && (
              <p className="py-10 text-center text-caption text-text-tertiary">
                전달 방법을 이야기해 보세요
              </p>
            )}

            {rows.map((row) =>
              row.kind === "date" ? (
                <p
                  key={`d-${row.label}`}
                  className="pb-1 text-center text-micro text-text-tertiary"
                >
                  {row.label}
                </p>
              ) : (
                <Bubble
                  key={row.message.id}
                  content={row.message.content}
                  mine={row.message.sender_id === meId}
                  time={formatClock(row.message.created_at)}
                  read={Boolean(row.message.read_at)}
                />
              ),
            )}

            {outgoing.map((o) => (
              <Bubble
                key={o.localId}
                content={o.content}
                mine
                failed={o.status === "failed"}
                sending={o.status === "sending"}
                onRetry={() => retry(o)}
              />
            ))}
          </>
        )}

        <div ref={endRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="sticky bottom-0 flex items-center gap-[9px] border-t border-border bg-bg px-4 pb-6 pt-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메시지 입력"
          aria-label="메시지 입력"
          className="min-w-0 flex-1 rounded-full bg-surface px-[15px] py-3 text-caption text-text-primary outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          aria-label="보내기"
          disabled={draft.trim().length === 0}
          className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-text-on-accent hover:bg-accent-pressed disabled:bg-neutral-300"
        >
          <ArrowUp size={19} />
        </button>
      </form>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Bubble({
  content,
  mine,
  time,
  read,
  sending,
  failed,
  onRetry,
}: {
  content: string;
  mine: boolean;
  time?: string;
  read?: boolean;
  sending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const bubble = (
    <div
      className={cn(
        "max-w-[250px] px-[14px] py-3 text-caption leading-relaxed",
        mine
          ? "rounded-[14px_14px_4px_14px]"
          : "rounded-[14px_14px_14px_4px] bg-surface-sunken text-text-primary",
        mine && failed && "border border-warning bg-bg text-text-primary",
        mine && !failed && "bg-accent text-text-on-accent",
        mine && sending && "opacity-70",
      )}
    >
      {content}
    </div>
  );

  if (!mine) {
    return (
      <div className="flex items-end gap-2">
        {bubble}
        {time && <span className="text-micro text-text-tertiary">{time}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-end gap-2">
      <div className="flex flex-col items-end gap-[3px]">
        {failed ? (
          <>
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 text-micro font-semibold text-warning"
            >
              <RotateCcw size={11} />
              재전송
            </button>
            <span className="text-micro text-warning-text">전송 실패</span>
          </>
        ) : sending ? (
          <span className="text-micro text-text-tertiary">보내는 중</span>
        ) : (
          <>
            {read && (
              <span className="text-micro font-semibold text-accent">읽음</span>
            )}
            {time && <span className="text-micro text-text-tertiary">{time}</span>}
          </>
        )}
      </div>
      {bubble}
    </div>
  );
}

/* --- 순수 함수 ------------------------------------------------------------ */

/** id 기준으로 합치고 시간순으로 세운다. 실시간과 서버 렌더가 겹쳐도 중복되지 않는다 */
function mergeById(prev: Message[], incoming: Message[]): Message[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);

  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

type Row =
  | { kind: "date"; label: string }
  | { kind: "message"; message: Message };

function withDateSeparators(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let lastKey = "";

  for (const message of messages) {
    const key = new Date(message.created_at).toDateString();
    if (key !== lastKey) {
      lastKey = key;
      rows.push({ kind: "date", label: formatDay(message.created_at) });
    }
    rows.push({ kind: "message", message });
  }

  return rows;
}

/** `오전 9:12` */
function formatClock(at: string): string {
  return new Date(at).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** `오늘` · `어제` · `2026. 7. 15.` */
function formatDay(at: string): string {
  const then = new Date(at);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (then.toDateString() === today.toDateString()) return "오늘";
  if (then.toDateString() === yesterday.toDateString()) return "어제";
  return then.toLocaleDateString("ko-KR");
}
