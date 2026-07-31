"use client";

import { Heart } from "lucide-react";
import { useTransition } from "react";

import { cn } from "@/lib/cn";
import { removeFavorite } from "./actions";

/**
 * 찜 해제. 카드에서 바로 뗄 수 있어야 한다 (F8 3.5).
 *
 * > **자리만 잡아 둔 임시 구현이다.** 찜 토글은 워크트리 A 의
 * > `src/features/explore/` 소관이다. 그쪽이 올라오면 이 버튼을 지우고
 * > `AuctionCard` 의 `trailing` 에 그 토글을 꽂는다. 붙는 자리는 그대로다.
 *
 * 찜은 개인 북마크라 경매가 마감돼도 뗄 수 있다 (00-관계-판정 3.5).
 */
export function FavoriteRemoveButton({ auctionId }: { auctionId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      aria-label="찜 해제"
      disabled={pending}
      onClick={() => start(() => removeFavorite(auctionId))}
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-accent transition-colors hover:bg-accent-subtle",
        pending && "cursor-not-allowed text-text-tertiary",
      )}
    >
      <Heart size={19} fill="currentColor" />
    </button>
  );
}
