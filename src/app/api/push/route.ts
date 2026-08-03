import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";

import { ROUTES } from "@/lib/routes";

/**
 * 웹 푸시 발송 (F9 확장).
 *
 * 부르는 쪽은 DB 트리거 하나다 — `notifications` INSERT 마다 pg_net 이
 * 알림 내용과 **받는 사람의 구독 목록을 통째로** 넘긴다
 * (`20260803000003_push.sql`). 그래서 여기서는 DB 를 읽지 않는다.
 * service role 키를 Vercel 에 두지 않는다는 방침이 그대로 유지된다.
 *
 * 인증은 Vault 와 맞춘 시크릿 헤더 하나다. 값이 다르면 403 으로 끝낸다.
 */

type IncomingSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "vapid_missing" }, { status: 500 });
  }

  let payload: {
    title?: string;
    body?: string;
    auction_id?: string | null;
    chat_room_id?: string | null;
    subscriptions?: IncomingSubscription[];
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const subscriptions = payload.subscriptions ?? [];
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // 이동할 곳은 알림 목록과 같은 규칙이다 — 채팅이 걸려 있으면 채팅이 우선
  // (notification-meta.ts). 대상이 없으면 알림 목록으로 보낸다.
  const url = payload.chat_room_id
    ? ROUTES.chat(payload.chat_room_id)
    : payload.auction_id
      ? ROUTES.auction(payload.auction_id)
      : ROUTES.notifications;

  webpush.setVapidDetails("mailto:staybomi@gmail.com", publicKey, privateKey);

  const body = JSON.stringify({
    title: payload.title ?? "Vidding",
    body: payload.body ?? "",
    url,
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      ),
    ),
  );

  // 만료된 구독(404·410)은 실패로 남는다. 여기서 지우려면 DB 접근이 필요해
  // 방침과 충돌하므로, 다음 구독 갱신 때 자연히 교체되도록 둔다
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subscriptions.length });
}
