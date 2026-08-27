import { Bell, MessageCircle, User } from "lucide-react";
import Link from "next/link";

import { ButtonLink, TopAppBar } from "@/components/ui";
import { NotFoundPath } from "@/features/errors/not-found-path";
import { ROUTES } from "@/lib/routes";

/**
 * 없는 주소 — 앱 전체의 404 (`.pen` S17 · S17b).
 *
 * `app/not-found.tsx` 는 두 가지를 함께 받는다. `notFound()` 를 던진 세그먼트와
 * **어느 라우트에도 걸리지 않은 주소** 전부다. 경매 상세처럼 자기 문맥이 있는
 * 곳은 자기 `not-found.tsx` 를 따로 두므로(`auctions/[id]`), 여기는 문맥이
 * 없는 나머지를 맡는다.
 *
 * **안내만 하고 끝내지 않는다 — 갈 곳을 함께 준다** (F3 4.1 과 같은 원칙).
 * 그래서 큰 버튼 둘(홈 · 경매 목록)과 빠른 이동 칩 셋을 함께 그린다.
 *
 * 앱(WebView)도 이 화면을 그대로 본다. 위에 네이티브 상태바만 얹힐 뿐
 * 따로 구현하지 않는다 — 앱 셸이 웹을 그대로 띄우기 때문이다.
 */
export default function NotFound() {
  return (
    <>
      <TopAppBar title="" />

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        {/* 타입 스케일에 없는 한 번뿐인 표시용 숫자다 (.pen S17) */}
        <p className="text-[64px] leading-[1.1] font-bold tracking-[-2px] text-accent">
          404
        </p>

        <h1 className="mt-[14px] text-title font-bold text-text-primary">
          페이지를 찾을 수 없어요
        </h1>

        <p className="mt-2 text-caption leading-relaxed text-text-secondary">
          주소가 바뀌었거나 지워진 페이지예요.
        </p>

        <NotFoundPath className="mt-[18px]" />

        <div className="mt-7 flex w-full flex-col gap-[10px]">
          <ButtonLink href={ROUTES.home} block>
            홈으로 가기
          </ButtonLink>
          <ButtonLink href={ROUTES.auctions} variant="secondary" block>
            경매 둘러보기
          </ButtonLink>
        </div>

        <div className="mt-8 flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="shrink-0 text-label text-text-tertiary">
            이런 곳은 어때요?
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <nav className="mt-[14px] flex flex-wrap items-center justify-center gap-2">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-[6px] rounded-full border border-border-strong bg-bg px-[14px] py-2 text-caption font-semibold text-text-secondary hover:bg-surface"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </>
  );
}

const QUICK_LINKS = [
  { href: ROUTES.chatList, label: "채팅", icon: MessageCircle },
  { href: ROUTES.notifications, label: "알림", icon: Bell },
  { href: ROUTES.mypage, label: "마이", icon: User },
] as const;
