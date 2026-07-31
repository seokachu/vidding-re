"use client";

import { useState, useTransition } from "react";

import { LikeButton } from "@/components/ui";

import { toggleLikeAction } from "./actions";

/**
 * 사연 공감 (F4).
 *
 * **가중치를 화면에서 계산하지 않는다.** 주최자 50 / 그 외 10 은
 * `toggle_episode_like()` 가 부여 시점에 정해 저장하고, 점수는 뷰가 집계한다.
 *
 * 눌린 즉시 반영해 두고 서버가 거부하면 되돌린다 —
 * **성공한 것처럼 보이지 않아야 한다** (F4 4).
 */
export function EpisodeLikeButton({
  episodeId,
  liked,
  count,
  /** 비회원·마감된 경매면 누를 수 없다. 공감 수는 그대로 보여준다 (F4 4) */
  disabled,
  onError,
}: {
  episodeId: string;
  liked: boolean;
  count: number;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [state, setState] = useState({ liked, count });
  const [seen, setSeen] = useState({ liked, count });
  const [pending, startTransition] = useTransition();

  // 서버가 화면을 다시 그렸으면 그 값을 따른다 (렌더 중 조정 — 효과가 필요 없다)
  if (seen.liked !== liked || seen.count !== count) {
    setSeen({ liked, count });
    setState({ liked, count });
  }

  function toggle() {
    const before = state;
    setState({
      liked: !before.liked,
      count: before.count + (before.liked ? -1 : 1),
    });

    startTransition(async () => {
      const result = await toggleLikeAction(episodeId);
      if (!result.ok) {
        setState(before);
        onError?.(result.message);
      }
    });
  }

  return (
    <LikeButton
      count={state.count}
      liked={state.liked}
      // 연타로 요청이 겹치지 않게 처리 중에는 잠근다 (F4 4)
      disabled={disabled || pending}
      onToggle={toggle}
    />
  );
}
