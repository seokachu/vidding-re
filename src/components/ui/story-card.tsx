"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { formatPoint } from "@/lib/format";

/**
 * 사연 카드. **목록이 곧 랭킹이다** — 별도 랭킹 카드를 두지 않는다 (00-관계-판정 3.4.1).
 *
 * 담는 것은 다섯이다 (F3 3.6).
 *   순위 · 닉네임 · 최종 입찰 포인트 · 공감 · 제목·내용
 *
 * 담지 않는 것 — 마스킹된 이메일, 작성일, 프로필 이미지.
 *
 * **더보기는 넘칠 때만 나온다.** 두 줄 안에 다 들어오면 `…` 도 더보기도 두지 않는다.
 * 펼칠 것이 없는데 버튼이 보이면 눌러도 아무 일이 없어 신뢰를 깎는다.
 * 넘치는지는 그려본 뒤에야 알 수 있으므로 마운트 후 높이를 재서 판단한다.
 */
export function StoryCard({
  rank,
  nickName,
  score,
  title,
  content,
  /** 공감 버튼. 관계에 따라 비활성으로 넘긴다 (00-관계-판정 3.5) */
  like,
  /** 낙찰 사연이면 강조한다 (F5) */
  highlighted,
  className,
}: {
  rank: number;
  nickName: string;
  score: number;
  title: string;
  content: string;
  like?: React.ReactNode;
  highlighted?: boolean;
  className?: string;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () =>
      setOverflowing(el.scrollHeight > el.clientHeight + 1);

    measure();

    // 폰트가 늦게 뜨거나 화면 폭이 바뀌면 줄 수가 달라진다
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [content]);

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-2.5 rounded-md border bg-bg p-4",
        highlighted ? "border-accent ring-1 ring-accent" : "border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-[7px]">
          <span className="shrink-0 rounded-full bg-accent-subtle px-2 py-[3px] text-label font-bold text-accent-text">
            {rank}위
          </span>
          <span className="truncate text-caption font-semibold text-text-primary">
            {nickName}
          </span>
          <span className="text-caption text-text-tertiary">·</span>
          <span className="tabular shrink-0 text-caption font-semibold text-accent-text">
            {formatPoint(score)}
          </span>
        </div>

        {like}
      </div>

      <h3 className="text-subtitle font-semibold leading-snug text-text-primary">
        {title}
      </h3>

      <p
        ref={bodyRef}
        className={cn(
          "whitespace-pre-line text-body leading-relaxed text-text-primary",
          !expanded && "line-clamp-2",
        )}
      >
        {content}
      </p>

      {overflowing && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-end text-label font-semibold text-accent"
        >
          더보기
        </button>
      )}

      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="self-end text-label font-semibold text-accent"
        >
          접기
        </button>
      )}
    </article>
  );
}
