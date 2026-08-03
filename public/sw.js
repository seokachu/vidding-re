/**
 * 웹 푸시 서비스 워커 (F9 확장).
 *
 * 하는 일은 둘뿐이다 — 푸시를 받아 알림으로 띄우고, 누르면 해당 화면을 연다.
 * 오프라인 캐시 등 다른 일은 하지 않는다. 파일이 커질수록 갱신 실패의
 * 표면적만 넓어진다.
 */

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
