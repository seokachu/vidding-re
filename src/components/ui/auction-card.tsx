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

  // 마감된 카드는 글자를 죽인다 (.pen S02). 목록에서 아직 참여할 수 있는 것과
  // 끝난 것이 같은 무게로 보이면 안 된다
  const { closed } = status;

  return (
    <div
      className={cn(
        "relative flex w-full gap-[14px] rounded-md border border-border p-[14px]",
        closed ? "bg-surface" : "bg-bg",
        className,
      )}
    >
      <Thumb
        src={auction.thumbnail}
        size={88}
        rounded="rounded-sm"
        className={closed ? "opacity-60" : undefined}
      />

      <div className="flex h-22 min-w-0 flex-1 flex-col justify-center gap-[7px]">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>

          {/*
            **배지와 같은 줄에 둔다.** 따로 세우면 카드 세로 가운데에 걸려
            혼자 내려간 것처럼 보인다. 버튼은 40px 이고 배지는 22px 이라
            위아래 9px 씩 걷어내 **줄 높이를 배지에 맞춘다** — 그래야 카드
            높이가 버튼 때문에 늘어나지 않는다.
          */}
          {trailing && (
            <div className="relative z-10 -my-[9px] ml-auto shrink-0">
              {trailing}
            </div>
          )}
        </div>

        <h3
          className={cn(
            "truncate text-subtitle font-semibold",
            closed ? "text-text-tertiary" : "text-text-primary",
          )}
        >
          <Link
            href={ROUTES.auction(auction.auction_id)}
            className="before:absolute before:inset-0"
          >
            {auction.title}
          </Link>
        </h3>

        <div
          className={cn(
            "flex items-center gap-[7px] text-caption",
            closed ? "text-text-tertiary" : "text-text-secondary",
          )}
        >
          <span
            className={cn(
              "tabular",
              !closed && left.endingSoon && "text-warning-text",
            )}
          >
            {left.text}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="tabular">사연 {auction.episode_count}</span>
        </div>
      </div>

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
