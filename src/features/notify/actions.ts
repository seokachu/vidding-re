"use server";

import { refresh } from "next/cache";

import { getAuthUser } from "@/lib/auth";
import { formatShippingInfo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/supabase/database.types";

/**
 * 알림·채팅의 서버 액션.
 *
 * **읽음 처리 뒤 하단 탭 배지를 갱신하는 방법** — Next 16 의 `refresh()` 다
 * (`next/cache`). `TabShell` 은 서버에서 미읽음 수를 세는 서버 컴포넌트이고,
 * `fetch` 캐시나 `'use cache'` 태그를 쓰지 않는다. 그래서 `updateTag` 로 무효화할
 * 대상 자체가 없다. `refresh()` 는 클라이언트 라우터를 갱신해 현재 트리를 서버에서
 * 다시 그리게 하므로, `TabShell` → `getUnreadNotificationCount()` 가 다시 실행되고
 * `BottomNav` 의 점이 사라진다. 서버 액션 안에서만 호출할 수 있다.
 */

/**
 * 목록을 열면 읽음으로 처리한다 (F9 3.2).
 *
 * `notifications` 는 **`read_at` 만** UPDATE 할 수 있다 (컬럼 단위 GRANT).
 * 실패해도 던지지 않는다 — **배지 갱신 실패가 알림 목록을 망가뜨리면 안 된다** (F9 4).
 */
export async function markNotificationsRead(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return false;

  refresh();
  return true;
}

/**
 * 방을 열면 받은 메시지를 읽음으로 바꾼다 (F6 3.4).
 *
 * **RPC 로만 한다.** `messages` 의 UPDATE 정책은 발신자 전용이라 수신자는 직접
 * 고칠 수 없다 (supabase/README.md 7). 이 RPC 는 그 방의 `CHAT_MESSAGE` 알림도
 * 함께 읽음 처리하므로, 뒤이은 `refresh()` 로 배지까지 정리된다.
 */
export async function markChatRead(roomId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_messages_read", {
    p_chat_room_id: roomId,
  });

  if (error) return false;

  refresh();
  return true;
}

export type SendResult =
  | { ok: true; message: Message }
  | { ok: false; reason: "EMPTY" | "AUTH" | "FAILED" };

/**
 * 배송 정보 전송 (F6 3.6). **낙찰자가 자기 배송지를 메시지로 보낸다.**
 *
 * 보낼 값을 클라이언트에서 받지 않고 **여기서 다시 읽는다.** 화면이 미리보기용으로
 * 같은 값을 이미 갖고 있지만, 전송되는 것은 서버가 방금 읽은 것이어야 한다 —
 * 클라이언트가 준 문자열을 그대로 넣으면 남의 이름·연락처를 배송 정보로 위장해
 * 보낼 수 있다.
 *
 * 주최자가 `addresses` 를 읽는 것이 아니라 낙찰자가 **자기 것을 복사해 보내는**
 * 구조라, `addresses_select_own` 정책을 열 필요가 없다. 보낸 뒤 배송지를 고쳐도
 * 이미 보낸 메시지는 그때 값 그대로 남는다.
 */
export async function sendShippingInfo(
  roomId: string,
): Promise<SendResult | { ok: false; reason: "NO_ADDRESS" }> {
  const user = await getAuthUser();
  if (!user) return { ok: false, reason: "AUTH" };

  const supabase = await createClient();

  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .select("recipient, phone, zipcode, address1, address2")
    .eq("user_id", user.id)
    .maybeSingle();

  if (addressError) return { ok: false, reason: "FAILED" };
  if (!address) return { ok: false, reason: "NO_ADDRESS" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_room_id: roomId,
      sender_id: user.id,
      content: formatShippingInfo(address),
      kind: "ADDRESS",
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, reason: "FAILED" };
  return { ok: true, message: data };
}

/**
 * 메시지 전송. 실패를 예외로 던지지 않고 결과로 돌려준다 —
 * 화면이 **전송 실패 상태로 표시하고 재전송을 제공해야** 하기 때문이다 (F6 4).
 *
 * 빈 메시지와 공백만 있는 메시지는 보내지 않는다 (F6 4).
 * 참여자 판정은 RLS 가 한다 — 남의 방에는 INSERT 자체가 막힌다.
 */
export async function sendChatMessage(
  roomId: string,
  content: string,
): Promise<SendResult> {
  const body = content.trim();
  if (!body) return { ok: false, reason: "EMPTY" };

  const user = await getAuthUser();
  if (!user) return { ok: false, reason: "AUTH" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ chat_room_id: roomId, sender_id: user.id, content: body })
    .select("*")
    .single();

  if (error || !data) return { ok: false, reason: "FAILED" };
  return { ok: true, message: data };
}

/**
 * 실시간 연결이 끊겼다 붙었을 때 누락분을 다시 불러온다 (F6 4).
 * 조회 실패는 `null` 로 알려 **빈 대화로 위장하지 않게** 한다.
 */
export async function fetchChatMessages(
  roomId: string,
): Promise<Message[] | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) return null;
  return data;
}

/**
 * 온보딩을 봤다고 표시한다 (F11 3.3).
 *
 * **건너뛰기도 완료로 친다.** "안 볼래"라는 뜻인데 다음 로그인에 또 뜨면
 * 무시당한 것이다.
 *
 * 실패해도 알리지 않는다 — 소개 화면을 닫는 일이 오류 문구로 끝나면 안 된다.
 * 못 적으면 다음 로그인에 한 번 더 보게 될 뿐이다.
 *
 * 온보딩은 로그인 없이도 열리므로(F11 3.3) 비회원이면 조용히 지나간다.
 */
export async function completeOnboarding(): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("onboarded_at", null);
}
