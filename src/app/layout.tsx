import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { AppPushBridge } from "@/features/notify/app-push-bridge";

import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

const DESCRIPTION =
  "가격을 부르지 않아요. 가장 공감받은 이야기를 쓴 사람이 낙찰받습니다.";

/**
 * 링크를 붙였을 때 보이는 것들.
 *
 * **`metadataBase` 가 있어야 한다.** OG 이미지 주소는 절대 경로여야 하는데,
 * 없으면 상대 경로로 나가 크롤러가 읽지 못한다.
 *
 * **기준은 항상 프로덕션 도메인이다 (`VERCEL_PROJECT_PRODUCTION_URL`).**
 * `VERCEL_URL` 은 배포마다 다른 주소(`vidding-xxxx-….vercel.app`)라서
 * 여기에 걸면 og:image 가 인증 보호가 걸린 배포 URL 을 가리키고,
 * 크롤러가 401 을 받아 미리보기 이미지가 회색으로 뜬다.
 *
 * 대표 이미지는 `app/opengraph-image.png` 다 (파일 규약). `.pen` 의
 * `OG 이미지 v2 (1200×630)` 프레임을 내보낸 것이라 시안과 어긋나지 않는다.
 * 경매 상세는 자기 사진으로 덮어쓴다 (`auctions/[id]`).
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://vidding-re.vercel.app"),
  ),
  title: "Vidding",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Vidding",
    title: "Vidding — 사연으로 입찰하는 경매",
    description: DESCRIPTION,
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vidding — 사연으로 입찰하는 경매",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

/**
 * 390px 모바일 폭을 기준으로 만든 디자인이다 (.pen).
 * 넓은 화면에서는 같은 폭을 가운데 두고 바깥을 surface 로 채운다.
 *
 * **좌우 경계선은 데스크톱 브라우저에서만 켠다.** 흰 셸과 surface 는 한 단계
 * 차이라 넓은 화면에서 앱이 어디서 끝나는지 보이지 않는다. 반대로 폰에서는
 * 선이 화면 가장자리에 붙는 군더더기다.
 *
 * 조건이 폭이 아니라 `pointer: fine` 인 이유는, **폭으로는 폰을 못 거르기
 * 때문이다** — 아이폰을 가로로 돌리면 844px 라 어떤 폭 기준도 넘어선다.
 * 마우스·트랙패드가 주 입력이면 브라우저로 보는 것이고, 터치면 폰이다.
 * `min-[391px]` 을 함께 거는 것은 셸보다 좁게 줄인 브라우저 창에서
 * 선이 화면 양끝에 달라붙는 것을 막기 위해서다.
 *
 * 테마는 잉크 블루 라이트 1벌이다. 유형에 따른 테마 전환이 없다 (F10 5-5).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${pretendard.variable} antialiased`}>
      <body className="bg-surface">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--shell-width)] flex-col border-border bg-bg min-[391px]:pointer-fine:border-x">
          {children}
        </div>
        {/* 앱 셸 안에서만 동작한다 — 브라우저에서는 아무것도 그리지 않는다 */}
        <AppPushBridge />
      </body>
    </html>
  );
}
