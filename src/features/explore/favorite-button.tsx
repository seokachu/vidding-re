"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import { signinWithReturn } from "@/lib/routes";
import { toggleFavorite } from "./favorite-actions";

/**
 * 찜 버튼 (F7).
 *
 * `.pen` S03 은 이것을 상단 바 우측 40×40 하트로 그린다. 그래서 기본 모양이
 * 아이콘 버튼이고, `TopAppBar action` 자리와 `AuctionCard trailing` 자리에 그대로 들어간다.
 *
 * **주최자에게는 아예 노출하지 않는다** (F7 4 · 완료 조건 3). 호출하는 쪽에서
 * `can.favorite` 를 보고 렌더 여부를 정한다 — 여기서 숨기면 판정이 두 곳에 생긴다.
 *
 * `favorited` 가 `null` 이면 **조회에 실패한 것**이다. 비활성으로 두고 재시도를
 * 안내한다. `false`(찜 안 함)와 구분한다 (F7 4).
 */
export function FavoriteButton({
  auctionId,
  favorited,
  /** 로그인 후 돌아올 위치. 없으면 지금 보고 있는 경로로 돌아온다 (F7 4) */
  returnTo,
  className,
}: {
  auctionId: string;
  favorited: boolean | null;
  returnTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  /**
   * 마운트 시점의 서버 값으로 시작해 이후에는 내 조작을 따른다.
   * 토글의 결과를 아는 것은 이 버튼이므로, 뒤늦게 온 서버 값으로 되돌리지 않는다.
   */
  const [state, setState] = useState(favorited);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 안내는 잠깐만 띄운다. 목록 카드 위에 계속 떠 있으면 다음 카드를 가린다
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const unknown = state === null;
  const active = state === true;

  function onClick() {
    if (pending || unknown) return;

    const previous = state;
    // 먼저 아이콘을 바꾸고, 실패하면 되돌린다 (F7 4 · 완료 조건 6)
    setState(!previous);
    setMessage(null);

    startTransition(async () => {
      const result = await toggleFavorite(auctionId);

      if (result.ok) {
        setState(result.favorited);
        return;
      }

      setState(previous);

      if (result.reason === "UNAUTHENTICATED") {
        router.push(signinWithReturn(returnTo ?? pathname));
        return;
      }

      setMessage(
        result.reason === "FORBIDDEN"
          ? "내가 연 경매는 찜할 수 없어요"
          : "잠시 후 다시 시도해주세요",
      );
    });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={active ? "찜 해제" : "찜하기"}
        // 연타·중복 클릭을 막는다 (F7 4 · 완료 조건 5)
        disabled={pending || unknown}
        onClick={onClick}
        title={unknown ? "잠시 후 다시 시도해주세요" : undefined}
        className={cn(
          "flex size-10 items-center justify-center rounded-sm transition-colors",
          active ? "text-accent" : "text-text-primary",
          unknown && "text-text-tertiary",
          pending || unknown
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-surface",
        )}
      >
        <Heart size={22} fill={active ? "currentColor" : "none"} />
      </button>

      {message && (
        <p
          role="status"
          className="absolute right-0 top-11 z-20 w-max max-w-[220px] rounded-sm bg-text-primary px-[10px] py-[6px] text-label text-text-on-accent"
        >
          {message}
        </p>
      )}
    </div>
  );
}
