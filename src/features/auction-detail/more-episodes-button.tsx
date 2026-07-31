"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui";

import { EPISODE_PAGE_SIZE } from "./types";

/**
 * 사연 더 보기 (F3 3.6).
 *
 * **자동 무한 스크롤을 쓰지 않는다.** 하단에 고정된 참여 버튼이 있어서
 * 스크롤이 끝나지 않으면 사용자가 페이지 끝에 도달하지 못한다.
 *
 * **버튼에 개수를 적지 않는다.** 총 개수는 목록 제목(`모인 사연 12`)이 이미
 * 알려주므로 두 번 말하게 된다. 10건은 구현이 고르는 값이지 약속이 아니다.
 *
 * 펼친 만큼을 주소에 담는다. 공감·입찰로 화면이 다시 그려져도 접히지 않는다.
 */
export function MoreEpisodesButton({ limit }: { limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      block
      disabled={pending}
      className="py-[14px] text-caption text-accent"
      onClick={() =>
        startTransition(() => {
          router.replace(`${pathname}?limit=${limit + EPISODE_PAGE_SIZE}`, {
            scroll: false,
          });
        })
      }
    >
      {pending ? "불러오는 중…" : "더보기"}
    </Button>
  );
}
