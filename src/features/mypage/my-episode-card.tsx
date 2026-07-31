import Link from "next/link";

import { Badge, Thumb } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatTimeLeft } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { episodeOutcome } from "./labels";
import type { MyEpisodeItem } from "./types";

/**
 * 내 사연 카드 (F8 3.4). **담는 것은 셋뿐이다** — 경매 이미지 · 경매 제목 · 상태.
 *
 * `AuctionCard` 를 쓰지 않는 이유는 그 카드가 `사연 N` 을 함께 그리기 때문이다.
 * 내 사연 탭에서 그 숫자는 넷째 정보가 되어 "내 사연 3개" 상한을 넘는다 (F8 5-6).
 * 여기서 알아야 할 것은 **"됐는지 안 됐는지"** 하나다.
 *
 * 진행중일 때만 남은 시간을 덧붙인다. 끝난 경매의 시간은 배지가 이미 말한다.
 *
 * > `src/components/ui/` 에 올릴 후보다. 지금은 마이페이지만 쓴다.
 */
export function MyEpisodeCard({ item }: { item: MyEpisodeItem }) {
  const status = episodeOutcome(item.outcome);
  const left = formatTimeLeft(item.endAt);

  return (
    <div className="relative flex w-full gap-[14px] rounded-md border border-border bg-bg p-[14px]">
      <Thumb src={item.thumbnail} size={88} rounded="rounded-sm" />

      <div className="flex h-22 min-w-0 flex-1 flex-col justify-center gap-[7px]">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <h3 className="truncate text-subtitle font-semibold text-text-primary">
          <Link
            href={ROUTES.auction(item.auctionId)}
            className="before:absolute before:inset-0"
          >
            {item.title}
          </Link>
        </h3>

        {item.outcome === "JOINED" && (
          <p
            className={cn(
              "tabular text-caption text-text-secondary",
              left.endingSoon && "text-warning-text",
            )}
          >
            {left.text}
          </p>
        )}
      </div>
    </div>
  );
}
