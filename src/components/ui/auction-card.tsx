import { ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { auctionDisplayStatus } from "@/lib/auction-status";
import { cn } from "@/lib/cn";
import { formatTimeLeft } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { AuctionSummary } from "@/lib/supabase/database.types";
import { Badge } from "./badge";

/**
 * 가로형 경매 카드. 목록·마이페이지 탭이 쓴다.
 *
 * 담는 것은 대표 이미지 · 제목 · 남은 시간 · 모인 사연 수뿐이다 (F2 3.1).
 * **찜 수는 담지 않는다.** 공개 지표가 아니다 (F7).
 */
export function AuctionCard({
  auction,
  /** 카드 우측에 붙일 것 (찜 해제 버튼 등, F8 3.5) */
  trailing,
  className,
}: {
  auction: Pick<
    AuctionSummary,
    | "auction_id"
    | "title"
    | "thumbnail"
    | "end_at"
    | "status"
    | "winning_episode_id"
    | "episode_count"
  >;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const status = auctionDisplayStatus(auction);
  const left = formatTimeLeft(auction.end_at);

  return (
    <div
      className={cn(
        "relative flex w-full gap-[14px] rounded-md border border-border bg-bg p-[14px]",
        className,
      )}
    >
      <Thumb src={auction.thumbnail} size={88} rounded="rounded-sm" />

      <div className="flex h-22 min-w-0 flex-1 flex-col justify-center gap-[7px]">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <h3 className="truncate text-subtitle font-semibold text-text-primary">
          <Link
            href={ROUTES.auction(auction.auction_id)}
            className="before:absolute before:inset-0"
          >
            {auction.title}
          </Link>
        </h3>

        <div className="flex items-center gap-[7px] text-caption text-text-secondary">
          <span className={cn("tabular", left.endingSoon && "text-warning-text")}>
            {left.text}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="tabular">사연 {auction.episode_count}</span>
        </div>
      </div>

      {trailing && <div className="relative z-10 shrink-0">{trailing}</div>}
    </div>
  );
}

export function Thumb({
  src,
  size,
  rounded,
  className,
}: {
  src: string | null;
  size: number;
  rounded: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-surface-sunken",
        rounded,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon size={22} className="text-text-tertiary" />
      )}
    </div>
  );
}
