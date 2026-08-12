"use client";

import { Check, Share, SquarePlus, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 앱 설치(홈 화면 추가) 유도 띠배너.
 *
 * 하단 탭 바로 위에 뜬다. **도울 수 없을 때는 나타나지 않는다** — 앱 셸 안,
 * 이미 설치된 standalone, 인앱 브라우저(홈 화면 추가 자체가 불가), 최근에
 * 닫은 사용자에게는 조용히 빠진다 (`PushBanner` 와 같은 원칙).
 *
 * 갈림길은 설치 방식이다:
 * - **크로미움(안드로이드·데스크톱 크롬/엣지)**: `beforeinstallprompt` 를
 *   잡아뒀다가 버튼을 누르면 `prompt()` — 네이티브 설치 다이얼로그가 바로
 *   뜬다. 이벤트가 **온 뒤에만** 배너를 보이므로, 설치가 안 되는
 *   브라우저(파이어폭스, 데스크톱 사파리, 인앱 등)에서는 저절로 안 뜬다.
 * - **iOS**: 프로그래매틱 설치가 없다. 버튼을 누르면 바텀시트로
 *   "공유 → 홈 화면에 추가" 순서를 보여준다.
 *
 * 탭 네 화면에서만 띄운다 — 상세·작성 화면의 하단은 액션 바(`BottomBar`)
 * 자리라 겹치면 결제·제출 버튼을 가린다.
 */

/** 크로미움만 쏘는 비표준 이벤트 — `lib.dom` 에 타입이 없다 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    /** 하이드레이션 전에 온 beforeinstallprompt — layout 인라인 스크립트가 잡아둔다 */
    __bipEvent?: BeforeInstallPromptEvent;
  }
}

const DISMISS_KEY = "vidding:install-banner-dismissed-at";
const DISMISS_DAYS = 7;

const TAB_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.auctions,
  ROUTES.notifications,
  ROUTES.mypage,
];

/** 닫은 지 얼마 안 됐다 — 같은 사람을 배너로 계속 조르지 않는다 */
function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false; // 사파리 시크릿 모드 등 — 저장을 못 하면 매번 보일 뿐이다
  }
}

export function InstallBanner() {
  const pathname = usePathname();
  const [mode, setMode] = useState<"chromium" | "ios" | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.ReactNativeWebView) return; // 앱 셸 — 이미 앱이다
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (snoozed()) return;

    const ua = navigator.userAgent;
    // 인앱 브라우저 — 설치 이벤트도, 공유 → 홈 화면 추가도 없다
    if (/kakaotalk|naver|instagram|fbav|fban|line\//i.test(ua)) return;

    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      // 아이패드는 맥 UA 를 쓴다 — 터치 지점 수로 가른다
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    if (isIos) {
      // iOS 홈 화면 실행은 display-mode 대신 이 비표준 속성이 잡는 수가 있다
      if ((navigator as { standalone?: boolean }).standalone) return;
      // 안드로이드가 이벤트를 기다리듯 한 틱 미룬다 — effect 본문의 동기
      // setState 는 렌더를 연쇄시켜 린트가 막는다
      const timer = setTimeout(() => setMode("ios"), 0);
      return () => clearTimeout(timer);
    }

    function show(event: BeforeInstallPromptEvent) {
      promptRef.current = event;
      // 데스크톱은 "홈 화면"이 없다 — 설치 흐름은 같고 문구만 가른다
      setDesktop(!window.matchMedia("(pointer: coarse)").matches);
      setMode("chromium");
    }
    function onPrompt(event: Event) {
      event.preventDefault(); // 크롬 자체 설치 유도 대신 우리 배너로 받는다
      show(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setMode(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 이벤트가 하이드레이션보다 먼저 왔으면 리스너로는 영영 못 받는다 —
    // layout 의 인라인 스크립트가 잡아둔 것을 회수한다
    const stashed = window.__bipEvent;
    const timer = stashed ? setTimeout(() => show(stashed), 0) : undefined;

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장을 못 해도 이번 화면에서는 내린다
    }
    setMode(null);
  }

  async function install() {
    const deferred = promptRef.current;
    if (!deferred) return;
    promptRef.current = null; // prompt() 는 페이지당 한 번만 쓸 수 있다

    await deferred.prompt();
    const { outcome } = await deferred.userChoice;

    // 수락이면 곧 appinstalled 가 온다. 거절이면 다시 누를 방법이 없으므로
    // (이벤트 소진) 닫은 것으로 치고 한동안 보이지 않는다
    if (outcome === "dismissed") dismiss();
    else setMode(null);
  }

  if (!mode || !TAB_ROUTES.includes(pathname)) return null;

  return (
    <>
      {/* 하단 탭(fixed z-30, 76px 지대) 바로 위. 탭과 같은 플로팅 문법이다 */}
      <div className="fixed inset-x-0 bottom-[84px] z-40 mx-auto w-full max-w-[var(--shell-width)] px-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg/95 p-3 shadow-[0_6px_20px_-4px_#0C1C4026] backdrop-blur-md">
          <Image
            src="/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="shrink-0 rounded-md border border-border"
          />

          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-text-primary">
              Vidding 앱 설치
            </p>
            <p className="text-label leading-normal text-text-secondary">
              {desktop
                ? "설치하면 별도 창에서 앱처럼 열려요"
                : "홈 화면에 추가하고 앱처럼 쓰세요"}
            </p>
          </div>

          <Button
            onClick={mode === "chromium" ? install : () => setSheetOpen(true)}
            className="shrink-0 px-3 py-2 text-caption"
          >
            설치
          </Button>

          <button
            type="button"
            aria-label="설치 배너 닫기"
            onClick={dismiss}
            className="shrink-0 p-1 text-text-tertiary"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {mode === "ios" && (
        <InstallGuideSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

/**
 * iOS 설치 가이드 바텀시트.
 *
 * 문구를 "사파리"로 못박지 않는다 — iOS 16.4+ 는 크롬 등에서도 공유 시트의
 * "홈 화면에 추가"가 동작하므로, 버튼 위치만 짚고 이름은 공통으로 쓴다.
 *
 * 포털·Esc·배경 잠금은 `ConfirmDialog` 와 같은 이유로 같은 방식이다.
 */
function InstallGuideSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-primary-900/50"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[var(--shell-width)] rounded-t-lg bg-bg px-6 pb-8 pt-4 outline-none"
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />

        <p id={titleId} className="text-subtitle font-semibold text-text-primary">
          홈 화면에 Vidding 추가하기
        </p>
        <p className="pt-1 text-caption text-text-secondary">
          iPhone·iPad 는 브라우저에서 직접 추가해요
        </p>

        <ol className="flex flex-col gap-3 pt-5">
          <Step icon={<Share size={17} className="text-accent" />}>
            브라우저 하단(또는 주소창 옆)의{" "}
            <strong className="font-semibold">공유</strong> 버튼을 눌러요
          </Step>
          <Step icon={<SquarePlus size={17} className="text-accent" />}>
            <strong className="font-semibold">홈 화면에 추가</strong>를 선택해요
          </Step>
          <Step icon={<Check size={17} className="text-accent" />}>
            오른쪽 위 <strong className="font-semibold">추가</strong>를 누르면
            홈 화면에 아이콘이 생겨요
          </Step>
        </ol>

        <Button block className="mt-6" onClick={onClose}>
          확인
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function Step({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        {icon}
      </span>
      <span className="text-caption leading-normal text-text-primary">
        {children}
      </span>
    </li>
  );
}
