"use client";

import { useEffect, useState } from "react";

import { Button, ButtonLink, Logo } from "@/components/ui";
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
 * - **그 밖의 안드로이드 인앱**(네이버 · 인스타그램 · 페이스북 · 라인 · 그 외
 *   웹뷰 전부 — UA 의 `wv`): `intent://` 스킴으로 기본 브라우저를 연다
 * - **일반 브라우저**: 바로 내려받기를 시작한다
 * - **iOS**: APK 가 없다 — 홈 화면 추가(PWA) 안내로 대신한다
 *
 * 스킴이 무시되는 환경(구버전 · iOS 인앱)이 있으므로 자동 전환에만 기대지
 * 않고 수동 안내와 다운로드 버튼을 항상 함께 보여준다.
 *
 * **페이지를 떠나지 않고 받는다.** 예전에는 `location.href` 로 파일 주소에
 * 이동시켰는데, 카메라가 여는 **크롬 커스텀 탭**에서는 그 이동이 크롬의
 * 다운로드 화면("다운로드 중…")으로 이 페이지를 통째로 덮었다. 그 화면은
 * 용량을 다 채우고도 표시가 안 바뀌는 경우가 있어 — 파일은 이미 받아져
 * 있는데 — 사용자는 멈춘 줄 알고 기다린다. 숨긴 iframe 으로 받으면 이
 * 페이지가 남아 "알림창에서 열라"는 안내가 보인다. iframe 다운로드가 막히는
 * 환경을 위해 직접 링크도 남긴다.
 *
 * **버전 · 용량은 GitHub 릴리스 API 에서 읽는다.** 어떤 버전을 받는지 알아야
 * 설치 뒤 "왜 안 바뀌지"가 생기지 않는다. 실패하면 조용히 숨긴다 —
 * 미인증 호출 한도(시간당 60건/IP)가 이 페이지에 모자랄 일은 없다.
 */

const APK_URL =
  "https://github.com/seokachu/vidding-re/releases/latest/download/vidding.apk";

const RELEASE_API =
  "https://api.github.com/repos/seokachu/vidding-re/releases/latest";

type Env = "loading" | "inapp" | "ios" | "started";

type Release = { version: string; mb: number };

export function ApkDownload() {
  const [env, setEnv] = useState<Env>("loading");
  // iframe 을 다시 세우면 같은 주소라도 다시 받는다 — "APK 다시 받기"
  const [attempt, setAttempt] = useState(0);
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;

    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    let next: Env = "started";
    let go: string | undefined;

    if (isIos) {
      next = "ios";
    } else if (/kakaotalk/i.test(ua)) {
      next = "inapp";
      go =
        "kakaotalk://web/openExternal?url=" +
        encodeURIComponent(window.location.href);
    } else if (/naver|instagram|fbav|fban|line\/|\bwv\b/i.test(ua)) {
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

  useEffect(() => {
    const controller = new AbortController();
    fetch(RELEASE_API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const asset = data?.assets?.find(
          (a: { name?: string }) => a.name === "vidding.apk",
        );
        if (!asset || typeof data.tag_name !== "string") return;
        setRelease({
          version: data.tag_name.replace(/^v/, ""),
          mb: Math.round(asset.size / 1048576),
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const subtitle =
    env === "ios"
      ? "iPhone·iPad 는 APK 없이 웹에서 바로 설치해요"
      : env === "inapp"
        ? "외부 브라우저로 여는 중이에요…"
        : env === "started"
          ? "다운로드를 시작했어요"
          : "잠시 후 다운로드가 자동으로 시작돼요";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-gutter py-10 text-center">
      <Logo width={90} />

      <div className="flex flex-col gap-1.5">
        <h1 className="text-title font-bold text-text-primary">
          Vidding 앱 다운로드
        </h1>
        <p className="text-caption leading-normal text-text-secondary">
          {subtitle}
        </p>
        {release && env !== "ios" && (
          <p className="text-label text-text-tertiary">
            v{release.version} · {release.mb} MB
          </p>
        )}
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
          <ol className="flex flex-col gap-1.5 text-caption leading-normal text-text-primary">
            <li>
              1. 알림창을 내려{" "}
              <strong className="font-semibold">vidding.apk</strong> 를 눌러요
            </li>
            <li>2. &ldquo;출처를 알 수 없는 앱&rdquo; 허용을 지나면 설치돼요</li>
          </ol>

          <Button
            onClick={() => {
              setEnv("started");
              setAttempt((n) => n + 1);
            }}
            className="px-8"
          >
            APK 다시 받기
          </Button>

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
              크롬 다운로드 화면이 100%에서 &ldquo;다운로드 중…&rdquo;으로 멈춘
              듯 보여도 이미 다 받은 거예요 — 알림창이나 파일 앱의 Download
              폴더에서 열면 돼요
            </p>
            <p>
              시작되지 않으면{" "}
              <a
                href={APK_URL}
                className="font-semibold text-text-secondary underline underline-offset-2"
              >
                여기서 직접 받기
              </a>
            </p>
          </div>
        </>
      )}

      {/* 다운로드 자체. 페이지를 떠나지 않으려고 iframe 으로 받는다 (위 주석) */}
      {env === "started" && (
        <iframe key={attempt} src={APK_URL} title="APK 다운로드" hidden />
      )}
    </main>
  );
}
