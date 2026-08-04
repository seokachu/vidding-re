"use client";

import { useEffect } from "react";

import { savePushSubscription } from "./actions";

/**
 * 하이브리드 앱 푸시 다리 (F9 확장).
 *
 * 안드로이드 웹뷰에는 Push API 가 없어 웹 푸시(sw.js)가 닿지 않는다.
 * 대신 앱 셸(vidding-app)이 Expo 푸시 토큰을 받아 페이지에 넘겨주면
 * (`window.__VIDDING_PUSH_TOKEN` + `vidding:push-token` 이벤트),
 * 여기서 그 토큰을 `push_subscriptions` 에 저장한다. 발송은 웹 푸시와
 * 같은 파이프라인이다 — notifications INSERT 트리거 → /api/push 가
 * endpoint 모양을 보고 웹 푸시 / Expo 푸시로 갈라 보낸다.
 *
 * 브라우저에서는 아무것도 하지 않는다. 웹 푸시가 그 몫을 한다 —
 * 웹에서 보면 웹이 울리고, 앱이면 앱이 울린다.
 */

declare global {
  interface Window {
    /** react-native-webview 가 주입한다 — 있으면 앱 셸 안이다 */
    ReactNativeWebView?: { postMessage: (message: string) => void };
    /** 앱 셸이 넣어주는 Expo 푸시 토큰 (`ExponentPushToken[…]`) */
    __VIDDING_PUSH_TOKEN?: string;
  }
}

export function AppPushBridge() {
  useEffect(() => {
    if (!window.ReactNativeWebView) return; // 브라우저 — 웹 푸시가 담당한다

    // 같은 토큰을 로그인 세션마다 다시 저장할 필요는 없다
    let saved: string | null = null;

    async function register() {
      const token = window.__VIDDING_PUSH_TOKEN;
      if (!token || token === saved) return;

      // 비로그인이면 서버가 false 를 돌려준다. 로그인 후 페이지가 새로
      // 뜨면 셸이 토큰을 다시 넣어주므로 그때 저장된다
      const ok = await savePushSubscription({
        endpoint: token,
        p256dh: "",
        auth: "",
      });
      if (ok) saved = token;
    }

    // 토큰이 이미 와 있으면 바로, 아직이면 셸이 쏘는 이벤트를 기다린다
    void register();
    window.addEventListener("vidding:push-token", register);
    return () => window.removeEventListener("vidding:push-token", register);
  }, []);

  return null;
}
