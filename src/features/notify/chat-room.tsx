"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowUp, Info, Package, RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button, ConfirmDialog, ErrorState, TopAppBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import type { Message, MessageKind } from "@/lib/supabase/database.types";
import {
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  sendShippingInfo,
} from "./actions";

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
  isWinner,
  myShippingInfo,
  initialMessages,
  loadFailed,
}: {
  roomId: string;
  meId: string;
  otherName: string;
  auctionId: string;
  auctionTitle: string;
  /** 배송 정보를 보내는 것은 낙찰자뿐이다 (F6 3.6) */
  isWinner: boolean;
  /** 미리보기용. `null` 이면 버튼이 배송지 등록으로 안내한다 */
  myShippingInfo: string | null;
  initialMessages: Message[];
  loadFailed: boolean;
}) {
  const router = useRouter();
  /**
   * 서버가 그려 준 목록(`initialMessages`)이 진실이고, state 에는 **그 뒤에 들어온 것만**
   * 담는다. 둘을 렌더 중에 합치므로 `initialMessages` 가 바뀔 때마다 state 를 맞춰 주는
   * effect 가 필요 없다. 읽음 처리 뒤 `refresh()` 로 서버 목록이 갱신돼도 그대로 반영된다.
   */
  const [live, setLive] = useState<Message[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(true);
  const [askingShip, setAskingShip] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState<string>();
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

  /**
   * **항상 맨 아래(최신)를 보여준다.**
   *
   * `useLayoutEffect` 인 이유는 그리기 전에 옮겨야 맨 위가 잠깐 비치지 않기
   * 때문이고, 의존성이 개수가 아니라 `messages` 자체인 이유는 **읽음 처리 뒤
   * `refresh()` 로 목록이 갱신될 때 개수는 그대로**여서 개수만 보면 다시
   * 내려가지 않기 때문이다.
   */
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, outgoing.length]);

  /**
   * 키보드가 열리면 뷰포트가 줄어드는데(`interactive-widget=resizes-content`)
   * 스크롤 위치는 그대로라 최신 메시지가 접힌 만큼 아래로 숨는다.
   * 뷰포트가 변하면 다시 맨 아래(최신)에 붙인다.
   */
  useEffect(() => {
    const toEnd = () => endRef.current?.scrollIntoView({ block: "end" });
    window.addEventListener("resize", toEnd);
    return () => window.removeEventListener("resize", toEnd);
  }, []);

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

  /* --- 배송 정보 (F6 3.6) ------------------------------------------------ */

  /** 배송지가 없으면 등록 화면으로 보내고, 마치면 이 대화로 돌아온다 */
  function goRegisterAddress() {
    router.push(
      `${ROUTES.address}?next=${encodeURIComponent(ROUTES.chat(roomId))}`,
    );
  }

  function openShipping() {
    setShipError(undefined);
    if (!myShippingInfo) return goRegisterAddress();
    setAskingShip(true);
  }

  /**
   * 이름·연락처·주소가 한 번에 나가는 일이라 **보낼 값을 그대로 보여주고**
   * 확인을 받은 뒤에만 보낸다. 되돌릴 수 없기 때문이다.
   */
  async function confirmShipping() {
    setShipping(true);
    const result = await sendShippingInfo(roomId);
    setShipping(false);

    if (result.ok) {
      setLive((prev) => mergeById(prev, [result.message]));
      setAskingShip(false);
      return;
    }

    // 미리보기를 그린 뒤에 지웠을 수 있다. 그때는 등록 화면으로 보낸다
    if (result.reason === "NO_ADDRESS") {
      setAskingShip(false);
      return goRegisterAddress();
    }

    setShipError("보내지 못했어요. 잠시 후 다시 시도해주세요");
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
    /*
      **대화는 화면 높이에 가둔다** (카카오톡과 같은 구조). 전에는 페이지 전체가
      늘어나며 스크롤돼서, 방에 들어가면 맨 위(가장 오래된 말)에 서고 최신
      메시지는 화면 밖으로 밀려 있었다. 읽음 처리 뒤 `refresh()` 가 화면을 다시
      그리면 스크롤이 또 위로 돌아갔다.

      이제 헤더·안내·입력줄은 제자리에 고정되고 **가운데 메시지 영역만 스크롤**한다.
      바깥 페이지가 움직이지 않으므로 다시 그려도 보던 자리가 유지된다.
    */
    <div className="flex h-dvh flex-col">
      <TopAppBar title={otherName} />

      {/* 이 대화의 목적을 한 줄로 못 박는다 — 채팅은 전달 논의 하나다 (F6 2) */}
      <div className="flex items-start gap-2 bg-surface px-gutter py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-text-secondary" />
        <p className="text-label leading-normal text-text-secondary">
          택배로 보낼지 직접 만날지, 배송지도 여기서 정하세요.{" "}
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

      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-gutter pb-6 pt-5">
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
                  kind={row.message.kind}
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

      <div className="shrink-0 border-t border-border bg-bg">
        {/* 낙찰자에게만. 택배에 필요한 것은 받는 쪽 정보다 (F6 3.6) */}
        {isWinner && (
          <div className="px-4 pt-3">
            <button
              type="button"
              onClick={openShipping}
              aria-haspopup="dialog"
              className="flex w-full items-center justify-center gap-[6px] rounded-full border border-border-strong py-[10px] text-caption font-semibold text-text-primary hover:bg-surface"
            >
              <Package size={15} />
              배송 정보 보내기
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-[9px] px-4 pb-6 pt-3"
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
      </div>

      <ConfirmDialog
        open={askingShip}
        busy={shipping}
        title="이 정보를 보낼까요?"
        description={
          <div className="flex flex-col gap-2">
            <p>보내면 상대가 대화에서 계속 볼 수 있어요</p>
            <p className="whitespace-pre-line rounded-md bg-surface px-3 py-[10px] leading-relaxed text-text-primary">
              {myShippingInfo}
            </p>
            {shipError && <p className="text-warning-text">{shipError}</p>}
          </div>
        }
        onCancel={() => setAskingShip(false)}
        confirm={
          <Button className="flex-1" disabled={shipping} onClick={confirmShipping}>
            {shipping ? "보내는 중…" : "보내기"}
          </Button>
        }
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Bubble({
  content,
  kind = "TEXT",
  mine,
  time,
  read,
  sending,
  failed,
  onRetry,
}: {
  content: string;
  kind?: MessageKind;
  mine: boolean;
  time?: string;
  read?: boolean;
  sending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  /**
   * 배송 정보는 **말풍선이 아니라 카드로** 그린다 (F6 3.6). 보낸 사람에 따라
   * 색이 갈리지 않는 것은 의도다 — 이건 누가 한 말이 아니라 **양쪽이 같이 보는
   * 자료**이고, 대화를 한참 올려 다시 찾을 때 한눈에 걸려야 한다.
   */
  const bubble =
    kind === "ADDRESS" ? (
      <div className="w-[250px] rounded-[14px] border border-border bg-bg p-[14px]">
        <p className="flex items-center gap-[6px] text-label font-semibold text-text-primary">
          <Package size={14} className="shrink-0 text-accent" />
          배송 정보
        </p>
        <p className="mt-2 whitespace-pre-line text-caption leading-relaxed text-text-primary">
          {content}
        </p>
      </div>
    ) : (
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
            {/*
              **두 상태를 모두 적는다.** 읽었을 때만 `읽음` 을 띄우면, 안 읽은
              메시지는 아무 표시가 없어 "아직 안 읽음"과 "표시가 없는 것"이
              구분되지 않는다. 보낸 사람이 가장 궁금해하는 것이 그 차이다.

              읽음은 강조색, 안읽음은 눌러 둔다 — 기다리는 상태가 결과보다
              먼저 눈에 들어올 이유가 없다.
            */}
            <span
              className={cn(
                "text-micro",
                read ? "font-semibold text-accent" : "text-text-tertiary",
              )}
            >
              {read ? "읽음" : "안읽음"}
            </span>
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
