"use client";

import { Hash, Info, TriangleAlert } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 화면이 통째로 실패했을 때의 500 화면 (`.pen` S19).
 *
 * **`ui/error-state.tsx` 와 역할이 다르다.** 그쪽은 화면 *일부*(목록 조회 등)가
 * 실패했을 때 그 자리에만 들어가는 조각이고, 이건 페이지가 아예 못 그려졌을 때
 * 대신 서는 화면이다. 시각 언어는 같다 — 레드는 여기서도 경고 의미다 (F11 3.6).
 *
 * `error.tsx` 와 `global-error.tsx` 가 함께 쓴다.
 */
export function ErrorScreen({
  digest,
  onRetry,
  /** 루트 레이아웃이 깨진 자리(global-error)에서는 클라이언트 이동 대신 새로 연다 */
  reloadOnHome = false,
}: {
  digest?: string;
  onRetry: () => void;
  reloadOnHome?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
      <span className="flex size-22 items-center justify-center rounded-full bg-warning-subtle">
        <TriangleAlert size={38} className="text-warning-text" />
      </span>

      <h1 className="mt-[18px] text-title font-bold text-text-primary">
        화면을 불러오지 못했어요
      </h1>

      <p className="mt-2 whitespace-pre-line text-caption leading-relaxed text-text-secondary">
        {"일시적인 문제일 수 있어요.\n잠시 후 다시 시도해 주세요."}
      </p>

      {/* 서버에서 난 오류는 내용을 클라이언트로 넘기지 않는다 — 서버 로그와
          맞춰볼 수 있는 것은 이 해시뿐이라, 제보에 실어 보낼 수 있게 보여준다 */}
      {digest && (
        <p className="mt-[18px] inline-flex max-w-full items-center gap-[6px] rounded-full bg-surface-sunken px-[14px] py-2">
          <Hash size={14} className="shrink-0 text-text-tertiary" />
          <span className="min-w-0 truncate text-label text-text-tertiary">
            오류 코드 {digest}
          </span>
        </p>
      )}

      <div className="mt-7 flex w-full flex-col gap-[10px]">
        <Button block onClick={onRetry}>
          다시 시도
        </Button>

        {reloadOnHome ? (
          <a
            href={ROUTES.home}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-bg px-5 py-[15px] text-body font-semibold text-text-primary hover:bg-surface"
          >
            홈으로 가기
          </a>
        ) : (
          <ButtonLink href={ROUTES.home} variant="secondary" block>
            홈으로 가기
          </ButtonLink>
        )}
      </div>

      <p className="mt-[14px] inline-flex items-center gap-[5px] text-label text-text-tertiary">
        <Info size={12} className="shrink-0" />
        문제가 계속되면 오류 코드와 함께 알려주세요
      </p>
    </main>
  );
}
