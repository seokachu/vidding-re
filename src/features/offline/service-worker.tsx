"use client";

import { useEffect } from "react";

/**
 * 서비스 워커 등록 — 오프라인 폴백을 위해 **모두에게** 건다 (X6).
 *
 * 지금까지는 알림 켜기 배너만 워커를 등록했다. 그러면 푸시를 켠 사람만
 * 오프라인 화면을 갖게 되므로, 등록 자체를 앱 시작 지점으로 옮긴다.
 * 등록은 권한을 묻지 않는다 — 권한이 필요한 것은 알림 쪽이고,
 * 그 절차는 `push-banner` 에 그대로 남아 있다 (같은 주소를 다시 등록해도
 * 이미 있는 등록이 그대로 돌아온다).
 *
 * **첫 화면과 경쟁시키지 않는다.** 워커 설치는 `/offline.html` 을 한 번
 * 받아오므로, `load` 이후로 미뤄 본문 렌더와 대역폭을 다투지 않게 한다.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((cause) => {
        // 등록 실패는 사용자에게 알릴 일이 아니다 — 오프라인 화면이 없을 뿐,
        // 온라인 동작은 그대로다
        console.error("서비스 워커 등록 실패", cause);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
