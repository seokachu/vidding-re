import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vidding",
  description: "사연으로 입찰하는 경매 플랫폼",
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
      </body>
    </html>
  );
}
