/**
 * 서비스 워커 — 웹 푸시(F9 확장 X1) + 오프라인 폴백(X6).
 *
 * 하는 일은 셋이다.
 *   1. 푸시를 받아 알림으로 띄우고, 누르면 해당 화면을 연다
 *   2. 설치할 때 `/offline.html` **한 장만** 미리 받아 둔다
 *   3. 화면 이동이 네트워크 실패로 끊기면 그 한 장을 대신 돌려준다
 *
 * **페이지를 캐시하지 않는다.** 캐시가 늘수록 "고쳤는데 옛날 화면이 뜬다"는
 * 갱신 실패의 표면적만 넓어진다. 여기서 저장하는 것은 오프라인 화면 하나뿐이고,
 * 나머지는 전부 네트워크가 원본이다.
 */

const CACHE = "vidding-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `cache: "reload"` — HTTP 캐시에 남은 옛 사본을 쓰지 않고 항상 새로 받는다
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      // 새 워커가 이전 워커의 종료를 기다리지 않게 한다. 폴백 화면은
      // 옛 사본을 유지할 이유가 없다
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 지난 버전의 캐시를 남겨두지 않는다
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));

      // fetch 핸들러를 다는 순간 브라우저의 이동 선행 요청이 꺼진다.
      // 명시적으로 켜 두지 않으면 모든 화면 이동이 워커 기동 시간만큼 느려진다
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // 화면 이동만 가로챈다. 이미지·API 요청까지 감싸면 실패의 갈래가 늘고,
  // 그 실패는 화면 안의 `ErrorState` 가 이미 제 자리에서 다루고 있다
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        // 여기 오는 것은 네트워크가 끊긴 경우뿐이다. 서버가 5xx 를 주면
        // 그것은 응답이므로 그대로 흘려보내고 앱의 오류 화면이 받는다
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(OFFLINE_URL)) ??
          Response.error()
        );
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // 본문이 JSON 이 아니어도 알림 자체는 띄운다
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Vidding", {
      body: data.body || "",
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { url: data.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/notifications";

  // 이미 열린 창이 있으면 거기서 이동하고, 없으면 새로 연다
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows[0];
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return clients.openWindow(url);
      }),
  );
});
