"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "./button";

/**
 * 확인 다이얼로그 (.pen 03 · Dialog · S07b).
 *
 * 되돌리는 데 품이 드는 행동 앞에서만 세운다. 취소가 왼쪽, 실행이 오른쪽이다.
 *
 * **실행 버튼은 밖에서 넘긴다.** 이 다이얼로그는 폼 안에서도 쓰이는데,
 * 그때 실행 버튼은 그 폼의 `submit` 이어야 한다. 안에서 만들어 `onConfirm`
 * 콜백으로 부르면 자바스크립트가 없을 때 아무 일도 일어나지 않는다 (F10 3.7).
 *
 * **`body` 로 옮겨 그린다.** `z-50` 만으로는 부족하다 — 부르는 쪽이 헤더처럼
 * `z-index` 가 걸린 자리에 있으면 그 쌓임 맥락 안에 갇혀, 더 높은 z 를 줘도
 * 하단 네비(`z-30`) 아래로 깔린다. 모달은 부모의 맥락을 벗어나야 한다.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  confirm,
  busy = false,
}: {
  open: boolean;
  title: string;
  /** 문장이 아니라 **보낼 값을 그대로 보여줘야 할 때**가 있어 노드를 받는다 (F6 3.6) */
  description?: React.ReactNode;
  onCancel: () => void;
  /** 실행 버튼. 폼 제출이어야 할 때가 있어 밖에서 받는다 */
  confirm: React.ReactNode;
  /** 실행이 진행 중이다. 취소·Esc·덮개를 모두 막는다 — 처리 중에 닫으면
   *  사용자는 취소된 줄 알지만 서버에서는 그대로 진행된다 */
  busy?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }

    document.addEventListener("keydown", onKeyDown);

    // 뒤 화면이 스크롤되면 다이얼로그만 제자리에 뜬 채 내용이 흘러간다
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel, busy]);

  // 포커스를 안으로 들인다. 뒤 화면에 남겨두면 보이지 않는 곳이 눌린다
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // `document` 확인은 서버 렌더 방어다. 지금은 모든 호출부가 닫힌 채로
  // 시작하지만, 열린 채 마운트되는 곳이 생기면 서버에서 터진다
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 덮개를 누르는 것은 취소와 같다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onCancel}
        disabled={busy}
        className="absolute inset-0 bg-primary-900/50"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex w-[calc(var(--shell-width)-80px)] max-w-[310px] flex-col gap-[22px] rounded-lg bg-bg p-6 shadow-[0_8px_28px_-4px_rgba(12,28,64,0.2)] outline-none"
      >
        <div className="flex flex-col gap-2">
          <p
            id={titleId}
            className="text-subtitle font-semibold text-text-primary"
          >
            {title}
          </p>

          {description && (
            <div className="text-caption text-text-secondary">{description}</div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </Button>

          {confirm}
        </div>
      </div>
    </div>,
    document.body,
  );
}
