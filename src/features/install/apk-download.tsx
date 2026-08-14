"use client";

import { useEffect, useState } from "react";

import { ButtonLink, Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * APK 다운로드 페이지 본문.
 *
 * QR·공유 링크가 릴리스 파일을 직접 가리키면 **인앱 브라우저에서 설치가
 * 막힌다** — 카카오톡 등은 APK 를 받아도 설치기로 넘겨주지 못해 "다운로드
 * 중"에서 영영 멈춘다. 그래서 링크는 이 페이지를 가리키고, 여기서 환경을
 * 갈라 처리한다.
 *
 * - **카카오톡**: `kakaotalk://web/openExternal` 스킴으로 이 페이지를 외부
 *   브라우저에서 다시 연다
 * - **그 밖의 안드로이드 인앱**(네이버 · 인스타그램 · 페이스북 · 라인):
 *   `intent://` 스킴으로 기본 브라우저를 연다
 * - **일반 브라우저**: 바로 내려받기를 시작한다
 * - **iOS**: APK 가 없다 — 홈 화면 추가(PWA) 안내로 대신한다
 *
 * 스킴이 무시되는 환경(구버전 · iOS 인앱)이 있으므로 자동 전환에만 기대지
 * 않고 수동 안내와 다운로드 버튼을 항상 함께 보여준다.
 */

const APK_URL =
  "https://github.com/seokachu/vidding-re/releases/latest/download/vidding.apk";

type Env = "loading" | "inapp" | "ios" | "ready";

export function ApkDownload() {
  const [env, setEnv] = useState<Env>("loading");

  useEffect(() => {
    const ua = navigator.userAgent;

    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    let next: Env = "ready";
    let go: string | undefined = APK_URL;

    if (isIos) {
      next = "ios";
      go = undefined;
    } else if (/kakaotalk/i.test(ua)) {
      next = "inapp";
      go =
        "kakaotalk://web/openExternal?url=" +
        encodeURIComponent(window.location.href);
    } else if (/naver|instagram|fbav|fban|line\//i.test(ua)) {
      next = "inapp";
      go = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;end`;
    }

    // effect 본문의 동기 setState 는 렌더를 연쇄시켜 린트가 막는다 —
    // InstallBanner 와 같은 이유로 한 틱 미룬다
    const timer = setTimeout(() => {
      setEnv(next);
      if (go) window.location.href = go;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-gutter py-10 text-center">
      <Logo width={90} />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-title font-bold text-text-primary">
          Vidding 앱 다운로드
        </h1>
        <p className="text-caption leading-normal text-text-secondary">
          {env === "ios"
            ? "iPhone·iPad 는 APK 없이 웹에서 바로 설치해요"
            : env === "inapp"
              ? "외부 브라우저로 여는 중이에요…"
              : "잠시 후 다운로드가 자동으로 시작돼요"}
        </p>
      </div>

      {env === "ios" ? (
        <>
          <ol className="flex flex-col gap-1.5 text-caption leading-normal text-text-primary">
            <li>1. 브라우저 하단(또는 주소창 옆)의 공유 버튼을 눌러요</li>
            <li>
              2. <strong className="font-semibold">홈 화면에 추가</strong>를
              선택하면 아이콘이 생겨요
            </li>
          </ol>
          <ButtonLink href={ROUTES.home} className="px-8">
            서비스 열기
          </ButtonLink>
        </>
      ) : (
        <>
          <ButtonLink href={APK_URL} className="px-8">
            APK 다시 받기
          </ButtonLink>
          <div className="flex flex-col gap-1.5 text-label leading-normal text-text-tertiary">
            {env === "inapp" && (
              <p>
                자동으로 열리지 않으면 오른쪽 위 ⋮ 메뉴에서{" "}
                <strong className="font-semibold text-text-secondary">
                  다른 브라우저로 열기
                </strong>
                를 눌러주세요
              </p>
            )}
            <p>
              내려받은 파일을 열고 &ldquo;출처를 알 수 없는 앱&rdquo; 허용을
              지나면 설치돼요
            </p>
          </div>
        </>
      )}
    </main>
  );
}
