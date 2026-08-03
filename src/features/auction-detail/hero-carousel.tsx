"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * 경매 상세 히어로 캐러셀 (.pen S03).
 *
 * 온보딩(S12)과 같은 방식이다 — 좌우 스와이프는 CSS scroll-snap 이 처리하고,
 * 셰브런 버튼은 `scrollTo` 로 같은 자리를 가리킨다. 스크롤 위치가 곧 상태이므로
 * 둘이 어긋날 일이 없다.
 *
 * 표시 규칙 (.pen S03 · S03b):
 * - 사진이 1장이면 칩·셰브런을 모두 숨긴다. 넘길 것이 없는데 넘기라는
 *   표시를 두지 않는다.
 * - 첫 장에서는 왼쪽, 마지막 장에서는 오른쪽 셰브런을 숨긴다.
 */
export function HeroCarousel({
  images,
  dimmed,
}: {
  images: string[];
  dimmed: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = images.length - 1;

  function goTo(to: number) {
    const track = trackRef.current;
    if (!track) return;

    const clamped = Math.min(Math.max(to, 0), last);
    // 애니메이션을 끈 환경에서도 이동은 정상 동작해야 한다
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
    setIndex(clamped);
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth === 0) return;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className={cn(
          "no-scrollbar flex h-60 w-full snap-x snap-mandatory overflow-x-auto",
          dimmed && "opacity-55",
        )}
      >
        {images.map((src) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={390}
            height={240}
            className="h-60 w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <span
            role="status"
            aria-label={`사진 ${images.length}장 중 ${index + 1}번째`}
            className="tabular absolute right-3 top-3 rounded-full bg-neutral-900/60 px-2.5 py-1 text-label font-medium text-neutral-0"
          >
            {index + 1}/{images.length}
          </span>

          {index > 0 && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="이전 사진"
              className="absolute left-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/35 text-neutral-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {index < last && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="다음 사진"
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900/35 text-neutral-0"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
