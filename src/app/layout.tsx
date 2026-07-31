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
 * 테마는 잉크 블루 라이트 1벌이다. 유형에 따른 테마 전환이 없다 (F10 5-5).
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${pretendard.variable} antialiased`}>
      <body className="bg-surface">
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--shell-width)] flex-col bg-bg">
          {children}
        </div>
      </body>
    </html>
  );
}
