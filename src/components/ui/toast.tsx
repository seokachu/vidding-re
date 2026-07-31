"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 실패 안내. 화면 아래에 잠깐 띄운다.
 *
 * 여러 스펙이 "실패 안내를 표시한다"를 요구한다 (F3 4 · F4 4 · F6 4 · F7 4).
 * 서버 판정이 거절했을 때 화면을 통째로 바꾸지 않고 알리는 자리다.
 *
 * 하단 고정 바(88px)를 가리지 않게 그 위에 앉힌다.
 */
export function Toast({
  message,
  onDone,
}: {
  message: string | null;
  /** 안정된 참조여야 한다. `useToast()` 의 `clear` 를 그대로 넘긴다 */
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-[104px] left-1/2 z-30 w-[calc(var(--shell-width)-40px)] max-w-[350px] -translate-x-1/2 rounded-md bg-neutral-800 px-4 py-3 text-caption font-medium text-text-on-accent shadow-lg"
    >
      {message}
    </div>
  );
}

/** 한 화면에 하나면 충분하다 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const clear = useCallback(() => setMessage(null), []);
  const show = useCallback((next: string) => setMessage(next), []);

  return { message, show, clear };
}
