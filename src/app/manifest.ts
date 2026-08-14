import type { MetadataRoute } from "next";

/**
 * 웹 앱 매니페스트 — 브라우저가 "설치할 수 있는 앱"으로 인정하는 근거다.
 *
 * 이게 있어야 안드로이드 크롬이 `beforeinstallprompt` 를 쏘고, 설치 유도
 * 띠배너(`InstallBanner`)가 동작한다. 요건은 `name` · 192/512 아이콘 ·
 * `display: standalone` 셋이다.
 *
 * **안드로이드 스플래시는 여기서 끝난다** — 크롬이 `name` + `background_color`
 * + 512 아이콘으로 자동 생성한다. iOS 는 매니페스트를 읽지 않으므로
 * `layout.tsx` 의 `appleWebApp.startupImage` 가 따로 있다.
 *
 * 아이콘은 vidding-app(Expo)의 1024px 원본에서 내려받은 것이라 앱(APK)과
 * 홈 화면에서 같은 얼굴을 갖는다. `maskable` 은 안드로이드 adaptive 레이어
 * (배경+전경)를 합성한 것 — 전경에 세이프존 여백이 이미 있어 원형·둥근
 * 사각 어떤 마스크로 잘려도 로고가 잘리지 않는다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidding — 사연으로 입찰하는 경매",
    short_name: "Vidding",
    description:
      "가격을 부르지 않아요. 가장 공감받은 이야기를 쓴 사람이 낙찰받습니다.",
    id: "/",
    start_url: "/",
    display: "standalone",
    // 웹 셸(390px 모바일 기준)과 앱(Expo portrait 고정)에 맞춘다
    orientation: "portrait",
    // 스플래시 배경 — iOS 이미지(잉크 블루)와 같은 색으로 맞춘다
    background_color: "#1d48b0",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
