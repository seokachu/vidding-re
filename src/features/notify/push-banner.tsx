"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { savePushSubscription } from "./actions";

/**
 * 푸시 알림 켜기 배너 (F9 확장 · S08).
 *
 * 알림 목록 위에 있다가, 켜면 사라진다. **도울 수 없을 때는 나타나지 않는다** —
 * 브라우저가 푸시를 지원하지 않거나, 권한이 이미 거부됐거나, 이미 구독한 상태면
 * 조용히 빠진다. 거부한 사용자를 배너로 계속 조르지 않는다.
 *
 * 구독 절차: 권한 요청 → 서비스 워커 등록 → 푸시 서비스 구독 →
 * 서버에 구독 저장. 서버 저장이 실패하면 브라우저 구독도 되돌린다 —
 * 반쪽 구독은 "켰는데 안 오는" 상태가 된다.
 */
export function PushBanner() {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      Notification.permission === "denied"
    ) {
      return;
    }

    navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) setVisible(true);
    });
  }, []);

  async function enable() {
    setPending(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // 거부는 실패가 아니라 선택이다. 배너를 내리고 끝낸다
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
        ),
      });

      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) throw new Error("keys missing");

      const saved = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      if (!saved) {
        await subscription.unsubscribe();
        throw new Error("save failed");
      }

      setVisible(false);
    } catch {
      setError("알림을 켜지 못했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setPending(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="px-gutter pt-4">
      <div className="flex items-center gap-3 rounded-md bg-accent-subtle px-4 py-3">
        <BellRing size={18} className="shrink-0 text-accent" />

        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-accent-text">
            푸시 알림 받기
          </p>
          <p className="text-label leading-normal text-text-secondary">
            마감·낙찰 소식을 브라우저 알림으로 알려드려요
          </p>
        </div>

        <Button
          onClick={enable}
          disabled={pending}
          className="shrink-0 px-3 py-2 text-caption"
        >
          {pending ? "켜는 중…" : "켜기"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="pt-2 text-caption text-warning-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** VAPID 공개 키(base64url)를 구독 API 가 받는 바이트 배열로 바꾼다 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
