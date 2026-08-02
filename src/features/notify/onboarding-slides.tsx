"use client";

import {
  ChevronLeft,
  Coins,
  FilePen,
  Gavel,
  Heart,
  HeartHandshake,
  RotateCcw,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { completeOnboarding } from "./actions";

/**
 * S12-1 ~ S12-3 — 첫 방문자 온보딩 (F11 · .pen S12).
 *
 * **의존성을 늘리지 않으려고 캐러셀을 직접 만들었다.** CSS scroll-snap 이면 충분하다 —
 * 좌우 스와이프는 브라우저가 처리하고, 버튼은 `scrollTo` 로 같은 자리를 가리킨다.
 * 스크롤 위치가 곧 상태이므로 둘이 어긋날 일이 없다.
 *
 * **진행 상태를 저장하지 않는다** (F11 4). localStorage 도 쿠키도 쓰지 않는다.
 * 다시 들어오면 처음부터다.
 *
 * 색은 **블루 단일 테마**다. 레드는 마감 임박·경고 의미로만 쓰므로 여기엔 없다 (F11 3.6 · 5-9).
 */

type Rule = { icon: LucideIcon; title: string; body: string };

const SLIDES: {
  id: string;
  icon: LucideIcon;
  caption: string;
  heading: string;
  lead: string;
  formula?: string;
  compare?: { label: string; value: string; highlight: boolean }[];
  rules?: Rule[];
}[] = [
  {
    id: "bid",
    icon: Gavel,
    caption: "이야기가 곧 입찰",
    heading: "사연으로 입찰하는 경매",
    lead: "가격을 부르지 않아요. 이 물건이 왜 나에게 필요한지 쓴 이야기가 곧 입찰이 됩니다.",
    compare: [
      { label: "일반 경매", value: "가장 높은 금액을\n부른 사람", highlight: false },
      { label: "Vidding", value: "가장 공감받은\n이야기를 쓴 사람", highlight: true },
    ],
  },
  {
    id: "join",
    icon: FilePen,
    caption: "쓰고 · 걸고 · 공감받고",
    heading: "사연을 쓰고 공감을 받아요",
    lead: "내 이야기에 포인트를 걸고, 다른 사람의 공감이 더해져 점수가 됩니다.",
    rules: [
      {
        icon: FilePen,
        title: "사연을 씁니다",
        body: "왜 이 물건이 필요한지 이야기해요",
      },
      {
        icon: Coins,
        title: "포인트를 겁니다",
        body: "1,000 P부터 500 P씩 올릴 수 있어요",
      },
      {
        icon: Heart,
        title: "공감을 받습니다",
        body: "다른 사람의 공감이 내 점수가 됩니다",
      },
    ],
  },
  {
    id: "win",
    icon: HeartHandshake,
    caption: "공감이 곧 점수입니다",
    heading: "가장 공감받은 사연이 가져갑니다",
    lead: "이야기가 가장 많은 마음을 얻은 사람이 낙찰받아요.",
    // F11 3.4 가 문구를 못 박는다. 사용자를 유형으로 나누는 표현을 쓰지 않는다
    formula: "참여자 공감 + 주최자 공감 = 총점",
    rules: [
      {
        icon: Heart,
        title: "공감이 점수가 됩니다",
        body: "주최자의 공감은 50 P, 그 외 공감은 10 P",
      },
      {
        icon: Timer,
        title: "같은 점수라면 먼저 쓴 사연",
        body: "동점일 땐 먼저 작성한 사연이 낙찰됩니다",
      },
      {
        icon: RotateCcw,
        title: "안 되면 그대로 돌려드려요",
        body: "낙찰되지 않으면 건 포인트를 전액 반환합니다",
      },
    ],
  },
];

const LAST = SLIDES.length - 1;

/** 스크롤은 되지만 막대는 감춘다 — 캐러셀에 막대가 보이면 화면이 지저분해진다 */
const NO_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function OnboardingSlides({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  /**
   * 다 봤거나 건너뛰었다. **둘 다 완료로 친다** — 건너뛰기는 "안 볼래"라는 뜻인데
   * 다음 로그인에 또 뜨면 무시당한 것이다 (F11 3.3).
   *
   * 표시를 기다렸다 이동한다. 먼저 옮기면 요청이 중간에 끊겨 다음 로그인에
   * 온보딩이 한 번 더 뜬다.
   */
  async function finish() {
    if (leaving) return;
    setLeaving(true);
    await completeOnboarding();
    router.push(nextHref);
  }

  function goTo(to: number) {
    const track = trackRef.current;
    if (!track) return;

    const clamped = Math.min(Math.max(to, 0), LAST);
    // 애니메이션을 끈 환경에서도 이동은 정상 동작해야 한다 (F11 4)
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
    setIndex(clamped);
  }

  /** 마지막에서 다음을 누르면 홈으로 보낸다. 빈 슬라이드를 보여주지 않는다 (F11 4) */
  function next() {
    if (index >= LAST) void finish();
    else goTo(index + 1);
  }

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between pl-2 pr-[14px]">
        {/* 첫 슬라이드에서는 이전 버튼을 노출하지 않는다 (F11 4) */}
        {index > 0 ? (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="이전"
            className="flex size-10 items-center justify-center rounded-sm text-text-secondary hover:bg-surface"
          >
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="size-10" />
        )}

        <button
          type="button"
          onClick={() => void finish()}
          className="px-1 text-caption font-medium text-text-tertiary hover:text-text-secondary"
        >
          건너뛰기
        </button>
      </div>

      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth === 0) return;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        /*
          가로 스크롤을 켠 순간 세로도 스크롤 컨테이너가 된다(`overflow-y` 가 `auto` 로
          계산된다). `clip` 으로 피할 수도 없다 — 옆이 `auto` 면 `hidden` 으로 계산된다.
          그래서 트랙 위에서 굴린 휠은 어차피 페이지로 넘어가지 않는다.
          **세로 넘침은 슬라이드 안에서 처리한다** — 아래 `section` 이 스크롤 영역이다.
        */
        className={cn(
          "flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden",
          NO_SCROLLBAR,
        )}
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.id}
            aria-hidden={i !== index}
            aria-label={`${i + 1}번째 안내: ${slide.heading}`}
            className={cn(
              "h-full w-full shrink-0 snap-center overflow-y-auto",
              NO_SCROLLBAR,
            )}
          >
            <Slide {...slide} />
          </section>
        ))}
      </div>

      {/* 진행 표시와 CTA 는 슬라이드가 길어도 늘 같은 자리에 있어야 한다 */}
      <div className="shrink-0 bg-bg">
        <div
          className="flex justify-center gap-1.5 py-7"
          role="status"
          aria-label={`${SLIDES.length}장 중 ${index + 1}번째`}
        >
          {SLIDES.map((slide, i) => (
            <span
              key={slide.id}
              className={cn(
                "h-1.5 rounded-[3px] transition-all",
                i === index ? "w-[18px] bg-accent" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>

        <div className="border-t border-border px-gutter pb-6 pt-[14px]">
          <Button block onClick={next}>
            {index === LAST ? "시작하기" : "다음"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Slide({
  icon: Icon,
  caption,
  heading,
  lead,
  formula,
  compare,
  rules,
}: (typeof SLIDES)[number]) {
  return (
    <div className="flex flex-col pb-6">
      {/* 이미지가 아니라 아이콘이다 — 로드에 실패해 레이아웃이 무너질 일이 없다 (F11 4) */}
      <div className="flex h-[212px] shrink-0 flex-col items-center justify-center gap-3 bg-accent-subtle">
        <Icon size={56} className="text-accent" strokeWidth={1.5} />
        <p className="text-caption font-semibold text-accent-text">{caption}</p>
      </div>

      <div className="flex flex-col gap-2.5 px-6 pt-8">
        <h2 className="text-display font-bold leading-tight text-text-primary">
          {heading}
        </h2>
        <p className="text-body leading-relaxed text-text-secondary">{lead}</p>
      </div>

      {formula && (
        <p className="mx-6 mt-5 rounded-md bg-accent-subtle px-4 py-3.5 text-center text-caption font-bold text-accent-text">
          {formula}
        </p>
      )}

      {compare && (
        <div className="flex gap-2.5 px-6 pt-6">
          {compare.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex flex-1 flex-col gap-2 rounded-md px-4 py-[18px]",
                item.highlight ? "bg-accent-subtle" : "bg-surface",
              )}
            >
              <p
                className={cn(
                  "text-label font-bold",
                  item.highlight ? "text-accent" : "text-text-tertiary",
                )}
              >
                {item.label}
              </p>
              <p
                className={cn(
                  "whitespace-pre-line text-caption font-semibold leading-relaxed",
                  item.highlight ? "text-accent-text" : "text-text-secondary",
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {rules && (
        <ul className="flex flex-col gap-2.5 px-6 pt-6">
          {rules.map(({ icon: RuleIcon, title, body }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-md bg-surface px-3.5 py-[13px]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg">
                <RuleIcon size={16} className="text-accent" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-caption font-semibold text-text-primary">
                  {title}
                </span>
                <span className="text-label leading-normal text-text-secondary">
                  {body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
