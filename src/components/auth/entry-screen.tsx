import { Gift } from "lucide-react";
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
