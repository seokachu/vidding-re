"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";

/**
 * 주소 검색 (F12 3.2).
 *
 * 우편번호와 기본 주소는 **검색 결과로만** 채운다. 오타로 인한 전달 실패를 막기
 * 위한 규칙이라, 로드에 실패했다고 직접 입력으로 우회시키지 않는다 (F12 4).
 *
 * ## 왜 다음 우편번호 서비스인가
 *
 * `package.json` 에 의존성을 더할 수 없다. 다행히 이 서비스는 **스크립트 태그
 * 하나로 끝난다.** npm 패키지(`react-daum-postcode` 등)는 같은 스크립트를 감싼
 * 것일 뿐이고, 키 발급도 요금도 없다. 그래서 여기서 직접 넣는다.
 *
 * `next/script` 대신 손으로 넣는 이유는 **로드 실패를 잡아야** 하기 때문이다.
 * F12 4 가 "주소 검색 서비스 로드 실패 → 안내와 재시도"를 요구한다.
 *
 * 이 컴포넌트는 **열려 있는 동안에만 마운트된다.** 닫으면 통째로 사라지므로
 * 다시 열 때 상태가 남지 않는다.
 */

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type PostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
};

type PostcodeInstance = { embed: (element: HTMLElement) => void };

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeData) => void;
        width?: string;
        height?: string;
      }) => PostcodeInstance;
    };
  }
}

function loadScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // 실패한 뒤 다시 시도하면 죽은 태그가 남아 있다. 매번 새로 건다
    document.querySelector("script[data-daum-postcode]")?.remove();

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.dataset.daumPostcode = "true";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("LOAD_FAILED")));
    document.head.appendChild(script);
  });
}

/** 도로명을 고르면 법정동·건물명을 괄호로 덧붙인다 — 우편물에 적히는 형태다 */
function composeAddress(data: PostcodeData): string {
  if (data.userSelectedType === "J") return data.jibunAddress;

  const extras: string[] = [];
  if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
  if (data.apartment === "Y" && data.buildingName) {
    extras.push(data.buildingName);
  }

  return extras.length > 0
    ? `${data.roadAddress} (${extras.join(", ")})`
    : data.roadAddress;
}

export type SelectedAddress = { zipcode: string; address1: string };

export function AddressSearch({
  onSelect,
  onClose,
}: {
  /** 부모에서 안정적인 참조로 넘긴다 — 매 렌더 새 함수면 검색창이 다시 그려진다 */
  onSelect: (value: SelectedAddress) => void;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    loadScript()
      .then(() => {
        const host = hostRef.current;
        if (cancelled || !host || !window.daum) return;

        host.replaceChildren();
        new window.daum.Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (data) => {
            onSelect({
              zipcode: data.zonecode,
              address1: composeAddress(data),
            });
            onClose();
          },
        }).embed(host);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, onSelect, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="주소 검색"
      // 셸을 통째로 덮는 화면이라 좌우 경계도 셸과 같이 간다 (layout.tsx)
      className="fixed inset-0 z-40 mx-auto flex w-full max-w-[var(--shell-width)] flex-col border-border bg-bg min-[391px]:pointer-fine:border-x"
    >
      <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-border px-2">
        <h2 className="min-w-0 flex-1 px-2 text-subtitle font-semibold text-text-primary">
          주소 검색
        </h2>

        <button
          type="button"
          // 취소해도 기존 입력값은 그대로 둔다. 초기화하지 않는다 (F12 4)
          onClick={onClose}
          aria-label="닫기"
          className="flex size-10 shrink-0 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
        >
          <X size={22} />
        </button>
      </header>

      {failed ? (
        <div
          role="alert"
          className="flex flex-1 flex-col items-center justify-center gap-[14px] px-6 text-center"
        >
          <p className="text-body font-semibold text-text-primary">
            주소 검색을 불러오지 못했습니다
          </p>
          <p className="whitespace-pre-line text-caption leading-relaxed text-text-secondary">
            {"네트워크를 확인한 뒤 다시 시도해주세요.\n우편번호와 기본 주소는 검색으로만 입력할 수 있어요."}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <div ref={hostRef} className="min-h-0 flex-1" />
      )}
    </div>
  );
}
