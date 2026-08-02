import { Gift, Info } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { SIGNUP_BONUS } from "@/lib/constants";
import { formatPoint } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { SigninButtons } from "./signin-buttons";

const ERROR_MESSAGE: Record<string, string> = {
  // 이메일이 없으면 사용자 정보를 만들 수 없다. 가입이 중단된 상태다 (F10 4)
  email_required: "이메일 제공에 동의해야 가입할 수 있어요",
  failed: "로그인에 실패했습니다. 다시 시도해주세요",
  invalid: "로그인을 완료하지 못했어요. 다시 시도해주세요",
};

/**
 * 어디에서 튕겨 왔는지 (F10 3.5).
 *
 * 둘러보다 알림·마이를 누른 사람은 **아무 설명 없이** 로그인 화면을 만난다.
 * 잘못 눌렀나 싶은 자리라, 무엇 때문에 여기로 왔는지 한 줄로 알려준다.
 *
 * 프록시가 이미 원래 위치를 `next` 로 넘겨 주므로(`proxy.ts`) 따로 사유를
 * 실어 보낼 필요가 없다 — 목적지가 곧 이유다.
 */
const DESTINATION: [test: RegExp, label: string][] = [
  [/^\/notifications/, "알림"],
  [/^\/mypage\/address/, "배송지"],
  [/^\/mypage\/points/, "포인트 내역"],
  [/^\/mypage/, "마이페이지"],
  [/^\/auctions\/write/, "경매 등록"],
  [/^\/auctions\/[^/]+\/edit/, "경매 수정"],
  [/^\/auctions\/[^/]+\/episodes/, "사연 작성"],
  [/^\/chat/, "채팅"],
];

function destinationOf(next: string | undefined): string | undefined {
  if (!next) return undefined;
  const path = next.split("?")[0];
  return DESTINATION.find(([test]) => test.test(path))?.[1];
}

/** 받침이 있으면 `은`, 없으면 `는`. `알림은` · `마이페이지는` */
function withTopic(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = hangul && (code - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? "은" : "는"}`;
}

/**
 * 진입 화면 (`.pen` S13). `/` 와 `/auth/signup` 이 같은 화면을 쓴다.
 *
 * 가입과 로그인을 구분하지 않는다. 유형을 고르는 단계도 없다 (F10 3.2 · 5-2).
 */
export function EntryScreen({
  next,
  error,
}: {
  next?: string;
  error?: string;
}) {
  const message = error ? ERROR_MESSAGE[error] : undefined;

  // 오류가 있으면 그것부터 알린다. 둘을 겹쳐 세우면 무엇이 급한지 흐려진다
  const destination = message ? undefined : destinationOf(next);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col gap-[14px] px-8 pt-24">
        <Logo width={87} />
        <p className="text-subtitle leading-snug text-text-primary">
          사연으로 입찰하는 경매
        </p>
        <p className="whitespace-pre-line text-caption leading-relaxed text-text-secondary">
          {"사연으로 입찰하는 새로운 경매\n가장 공감받는 이야기를 쓴 사람이 낙찰받아요"}
        </p>
      </div>

      <div className="px-8 pt-7">
        <div className="flex items-center gap-[9px] rounded-md bg-accent-subtle px-4 py-[14px]">
          <Gift size={17} className="shrink-0 text-accent-text" />
          <p className="text-caption font-semibold text-accent-text">
            가입하면 {formatPoint(SIGNUP_BONUS)}를 드려요
          </p>
        </div>
      </div>

      {message && (
        <div className="px-8 pt-5">
          <p
            role="alert"
            className="rounded-md bg-warning-subtle px-4 py-3 text-caption font-semibold text-warning-text"
          >
            {message}
          </p>
        </div>
      )}

      {/*
        경고색을 쓰지 않는다. 사용자가 잘못한 것이 없고 **원래 그런 화면**일 뿐이다.
        레드는 마감 임박·오류·필수 입력 전용이다 (PRD B3).
      */}
      {destination && (
        <div className="px-8 pt-5">
          <p
            role="status"
            className="flex items-start gap-2 rounded-md bg-surface px-4 py-3 text-caption leading-normal text-text-secondary"
          >
            <Info size={15} className="mt-[3px] shrink-0" />
            <span>
              <b className="font-semibold text-text-primary">
                {withTopic(destination)}
              </b>{" "}
              로그인해야 볼 수 있어요. 로그인하면 바로 이어집니다
            </span>
          </p>
        </div>
      )}

      <div className="px-8 pt-10">
        <SigninButtons next={next} />
      </div>

      {/* 비회원도 경매를 열람할 수 있다 (F2 · F10 3.4 · 5-8) */}
      <div className="flex justify-center pt-5">
        <Link
          href={ROUTES.home}
          className="text-caption font-semibold text-text-secondary hover:text-text-primary"
        >
          먼저 둘러보기
        </Link>
      </div>

      <div className="mt-auto px-8 pb-10 pt-9">
        <p className="text-center text-micro leading-normal text-text-tertiary">
          로그인하면 이용약관과 개인정보 처리방침에 동의하게 됩니다
        </p>
      </div>
    </main>
  );
}
