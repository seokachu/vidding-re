"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { ROUTES, resolveReturnTo } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { GoogleMark, KakaoMark } from "./provider-marks";

/**
 * 소셜 로그인 버튼. 가입과 로그인은 구분되지 않는다 (F10 3.2).
 *
 * `redirectTo` 를 **반드시 넘긴다.** Supabase 의 Site URL 이 프로덕션을 가리키고
 * 있어서, 넘기지 않으면 로컬에서 로그인해도 프로덕션으로 튕긴다
 * (supabase/README.md 인증 절).
 *
 * `next` 는 콜백까지 들고 가야 로그인 후 원래 화면으로 돌아온다 (F10 3.5).
 */
export function SigninButtons({ next }: { next?: string }) {
  const [pending, setPending] = useState<"kakao" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "kakao" | "google") {
    setPending(provider);
    setError(null);

    const callback = new URL(ROUTES.callback, window.location.origin);
    callback.searchParams.set("next", resolveReturnTo(next));

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback.toString(),
        // 이메일이 없으면 가입이 중단된다. 그래서 이메일 스코프를 함께 요청한다 (F10 4)
        scopes:
          provider === "kakao"
            ? "account_email profile_nickname profile_image"
            : undefined,
      },
    });

    if (error) {
      setPending(null);
      setError("로그인에 실패했습니다. 다시 시도해주세요");
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => signIn("kakao")}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md px-5 py-4",
          "bg-[#FEE500] text-body font-semibold text-[#191600] disabled:opacity-60",
        )}
      >
        <KakaoMark />
        {pending === "kakao" ? "카카오로 이동 중…" : "카카오로 시작하기"}
      </button>

      <button
        type="button"
        disabled={pending !== null}
        onClick={() => signIn("google")}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md px-5 py-4",
          "border border-border-strong bg-bg text-body font-semibold text-text-primary disabled:opacity-60",
        )}
      >
        <GoogleMark />
        {pending === "google" ? "Google로 이동 중…" : "Google로 시작하기"}
      </button>

      {error && (
        <p role="alert" className="pt-1 text-center text-caption text-warning-text">
          {error}
        </p>
      )}
    </div>
  );
}
