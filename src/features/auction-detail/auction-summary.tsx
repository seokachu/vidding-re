import { ImageIcon, Info } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui";
import { auctionDisplayStatus } from "@/lib/auction-status";
import { cn } from "@/lib/cn";
import { formatRelativeTime, formatTimeLeft } from "@/lib/format";
import type { Relationship } from "@/lib/relationship";

import type { AuctionDetail } from "./types";

/**
 * 경매 상세 윗부분 — 이미지 · 제목 · 주최자 한 줄 · 사연 요청 설명.
 *
 * **주최자 정보 카드를 따로 두지 않는다.** 제목 아래 한 줄로 흡수한다
 * (00-관계-판정 3.4.1). 관계에 따라 달라지는 것은 그 한 줄의 문구뿐이다.
 */
export function AuctionSummary({
  auction,
  relationship,
  isClosed,
  episodeCount,
  /** 주최자의 수정·삭제 줄. 설명 바로 아래에 붙는다 (S04) */
  hostActions,
}: {
  auction: AuctionDetail;
  relationship: Relationship | null;
  isClosed: boolean;
  episodeCount: number;
  hostActions?: React.ReactNode;
}) {
  const status = auctionDisplayStatus({
    status: auction.status,
    end_at: auction.endAt,
    winning_episode_id: auction.winningEpisodeId,
  });
  const left = formatTimeLeft(auction.endAt);
  const isVoid = isClosed && !auction.winningEpisodeId;

  return (
    <>
      <Hero images={auction.imageUrls} dimmed={isClosed} />

      <section className="flex flex-col gap-3 px-gutter pt-5">
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span
            className={cn(
              "tabular text-caption",
              isClosed
                ? "text-text-tertiary"
                : left.endingSoon
                  ? "text-warning-text"
                  : "text-text-secondary",
            )}
          >
            {isClosed
              ? `${formatRelativeTime(auction.endAt)} 마감`
              : left.text}
          </span>
        </div>

        <h2
          className={cn(
            "text-display font-bold leading-tight",
            isVoid ? "text-text-secondary" : "text-text-primary",
          )}
        >
          {auction.title}
        </h2>

        <HostLine
          nickName={auction.hostNickName}
          relationship={relationship}
          isClosed={isClosed}
        />

        <p className="whitespace-pre-line text-body leading-relaxed text-text-primary">
          {auction.description}
        </p>
      </section>

      {hostActions}

      <RuleNote isVoid={isVoid} isClosed={isClosed} episodeCount={episodeCount} />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Hero({ images, dimmed }: { images: string[]; dimmed: boolean }) {
  if (images.length === 0) {
    return (
      <div className="flex h-60 w-full items-center justify-center bg-surface-sunken">
        <ImageIcon size={34} className="text-text-tertiary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-60 w-full snap-x snap-mandatory overflow-x-auto",
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
  );
}

/**
 * 주최자 한 줄. 관계마다 문구가 다르다 —
 * 내 경매인지 남의 경매인지가 여기서 한 번에 읽혀야 한다.
 */
function HostLine({
  nickName,
  relationship,
  isClosed,
}: {
  nickName: string;
  relationship: Relationship | null;
  isClosed: boolean;
}) {
  const isHost = relationship === "HOST";

  return (
    <div className="flex items-center gap-2">
      <span className="flex size-[26px] items-center justify-center rounded-full bg-surface-sunken text-micro font-semibold text-text-secondary">
        주
      </span>
      <span
        className={cn(
          "text-caption font-medium",
          isHost ? "text-accent" : "text-text-secondary",
        )}
      >
        {isHost
          ? "내가 연 경매"
          : `${nickName} 님이 ${isClosed ? "열었습니다" : "엽니다"}`}
      </span>
    </div>
  );
}

/**
 * 동점 기준을 화면에 노출한다 — **규칙 안내 의무다** (F5 3.2.1).
 * 마감 이후에야 동점 탈락을 알게 되는 상황을 만들지 않는다.
 */
function RuleNote({
  isVoid,
  isClosed,
  episodeCount,
}: {
  isVoid: boolean;
  isClosed: boolean;
  episodeCount: number;
}) {
  if (isVoid) {
    return (
      <section className="px-gutter pt-5">
        <div className="flex gap-[9px] rounded-md bg-surface px-[15px] py-[13px]">
          <Info size={16} className="mt-0.5 shrink-0 text-text-secondary" />
          <p className="text-label leading-normal text-text-secondary">
            {episodeCount === 0
              ? "사연이 한 건도 모이지 않아 유찰됐어요. 걸린 포인트가 없어 정산할 것도 없습니다."
              : "마감됐지만 아직 낙찰 처리가 끝나지 않았어요. 잠시 후 결과가 표시됩니다."}
          </p>
        </div>
      </section>
    );
  }

  if (isClosed) return null;

  return (
    <section className="px-gutter pt-5">
      <div className="flex items-center gap-[9px] rounded-md bg-accent-subtle px-[15px] py-[13px]">
        <Info size={16} className="shrink-0 text-accent-text" />
        <p className="text-label leading-normal text-accent-text">
          같은 포인트일 땐 먼저 작성한 사연이 낙찰됩니다
        </p>
      </div>
    </section>
  );
}
