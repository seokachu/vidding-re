import { ImageIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { formatTimeLeft } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { AuctionSummary } from "@/lib/supabase/database.types";

/**
 * 세로형 좁은 카드. 홈의 **마감 임박 가로 스크롤**에 쓴다 (F2 3.1).
 *
 * 남은 시간을 강조색으로 보여준다 — 이 줄에 사용자가 반응해야 한다.
 */
export function AuctionCardCompact({
  auction,
  /** 찜 버튼. 썸네일 위에 얹는다 — 좁은 카드라 글자 줄을 밀어낼 자리가 없다 */
  trailing,
  className,
}: {
  auction: Pick<
    AuctionSummary,
    "auction_id" | "title" | "thumbnail" | "end_at" | "episode_count"
  >;
  trailing?: React.ReactNode;
  className?: string;
}) {
  const left = formatTimeLeft(auction.end_at);

  return (
    /*
      **링크를 카드 전체에 덮되 찜 버튼은 그 위에 띄운다.** 버튼을 링크 안에
      두면 눌렀을 때 상세로 따라 들어간다. 그래서 뿌리를 `div` 로 두고 제목
      링크가 `before:inset-0` 로 카드를 덮는다 — 가로형 카드와 같은 방식이다.
    */
    <div
      className={cn(
        "relative flex w-[158px] shrink-0 flex-col gap-[9px]",
        className,
      )}
    >
      {/*
        사진 위에 그냥 얹으면 어두운 사진에서 묻힌다. 반투명 바탕을 깔아
        어떤 사진 위에서도 읽히게 한다.
      */}
      {trailing && (
        <div className="absolute right-1 top-1 z-10 rounded-full bg-bg/75 backdrop-blur-[2px]">
          {trailing}
        </div>
      )}

      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
        {auction.thumbnail ? (
          <Image
            src={auction.thumbnail}
            alt=""
            width={158}
            height={112}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon size={22} className="text-text-tertiary" />
        )}
      </div>

      <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-text-primary">
        <Link
          href={ROUTES.auction(auction.auction_id)}
          className="before:absolute before:inset-0"
        >
          {auction.title}
        </Link>
      </p>

      <div className="flex items-center gap-1.5 text-label">
        <span
          className={cn(
            "tabular font-semibold",
            left.closed
              ? "text-text-tertiary"
              : left.endingSoon
                ? "text-warning"
                : "text-text-secondary",
          )}
        >
          {left.text}
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="tabular text-text-secondary">
          사연 {auction.episode_count}
        </span>
      </div>
    </div>
  );
}
