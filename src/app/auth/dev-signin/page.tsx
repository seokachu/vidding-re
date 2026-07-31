import { notFound, redirect } from "next/navigation";

import { Button, TextField } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { formatPoint } from "@/lib/format";
import { ROUTES, resolveReturnTo } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "개발용 로그인" };

/**
 * ⚠️ **확인용 임시 화면이다. 확인이 끝나면 이 폴더를 통째로 지운다.**
 *
 * 서비스의 로그인 수단은 소셜 둘뿐이다 (F10 3.1). 그런데 시드 계정은
 * 이메일·비밀번호 계정이라 진입 화면으로는 들어갈 수 없다. 데이터가 찬
 * 마이페이지·알림·채팅을 확인하려면 세션을 만들 입구가 하나 필요하다.
 *
 * **프로덕션에서는 열리지 않는다.** 배포본에 섞여 들어가도 404 다.
 * 그래도 확인이 끝나면 지우는 것이 맞다 — 있으면 언젠가 켜진다.
 *
 * 쓰려면 Supabase 대시보드에서 **Email 제공자를 켜야 한다.**
 * Authentication → Sign In / Providers → Email → Enable
 */

/** `scripts/seed.mjs` 가 만드는 계정들 */
const SEED_PASSWORD = "vidding-seed-2026!";
const SEED_ACCOUNTS = [
  { email: "seed-seoyeon@vidding.test", nick: "서연", role: "주최자 — 경매 2건, 낙찰 1건" },
  { email: "seed-jihun@vidding.test", nick: "지훈", role: "주최자 1 + 참여자 2 (탈락)" },
  { email: "seed-minseo@vidding.test", nick: "민서", role: "주최자 1(유찰) + 참여자 3" },
  { email: "seed-doyun@vidding.test", nick: "도윤", role: "낙찰자 — 채팅방 있음" },
];

function assertDev() {
  if (process.env.NODE_ENV === "production") notFound();
}

async function signIn(formData: FormData) {
  "use server";
  assertDev();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = resolveReturnTo(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/auth/dev-signin?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}

export default async function DevSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  assertDev();

  const { next, error } = await searchParams;
  const target = resolveReturnTo(next);
  const current = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col gap-5 px-gutter py-8">
      <div className="rounded-md bg-warning-subtle px-4 py-3">
        <p className="text-caption font-semibold text-warning-text">
          개발용 임시 화면
        </p>
        <p className="pt-1 text-label leading-normal text-warning-text">
          확인이 끝나면 지웁니다. 프로덕션에서는 열리지 않습니다.
        </p>
      </div>

      {current ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <p className="text-caption text-text-secondary">지금 로그인한 계정</p>
          <p className="text-body font-semibold text-text-primary">
            {current.nick_name}{" "}
            <span className="tabular font-normal text-text-secondary">
              · {formatPoint(current.point_balance)}
            </span>
          </p>
          <p className="text-label text-text-tertiary">{current.email}</p>

          <form action="/auth/signout" method="post" className="pt-1">
            <Button type="submit" variant="secondary" block>
              로그아웃하고 다른 계정으로
            </Button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold text-text-secondary">
              시드 계정 — 누르면 바로 들어갑니다
            </p>

            {SEED_ACCOUNTS.map((account) => (
              <form key={account.email} action={signIn}>
                <input type="hidden" name="email" value={account.email} />
                <input type="hidden" name="password" value={SEED_PASSWORD} />
                <input type="hidden" name="next" value={target} />
                <button
                  type="submit"
                  className="flex w-full flex-col gap-0.5 rounded-md border border-border px-4 py-3 text-left hover:bg-surface"
                >
                  <span className="text-body font-semibold text-text-primary">
                    {account.nick}
                  </span>
                  <span className="text-label text-text-secondary">
                    {account.role}
                  </span>
                </button>
              </form>
            ))}
          </div>

          <form action={signIn} className="flex flex-col gap-4 border-t border-border pt-5">
            <p className="text-label font-semibold text-text-secondary">
              직접 입력
            </p>
            <TextField
              id="email"
              name="email"
              type="email"
              label="이메일"
              required
              defaultValue={SEED_ACCOUNTS[0].email}
            />
            <TextField
              id="password"
              name="password"
              type="password"
              label="비밀번호"
              required
              defaultValue={SEED_PASSWORD}
            />
            <input type="hidden" name="next" value={target} />
            <Button type="submit" block>
              로그인
            </Button>
          </form>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-warning-subtle px-4 py-3 text-caption text-warning-text"
        >
          {error.includes("Email logins are disabled")
            ? "Supabase 대시보드에서 Email 제공자를 켜야 합니다 (Authentication → Sign In / Providers → Email)."
            : error}
        </p>
      )}

      <p className="text-label leading-normal text-text-tertiary">
        로그인 후 <code className="text-text-secondary">{target}</code> 로 이동합니다.
        다른 곳으로 가려면 <code className="text-text-secondary">?next=/mypage</code> 처럼
        붙이세요. 확인이 끝나면 Email 제공자를 다시 꺼주세요 — F10 이 정한 범위 밖입니다.
      </p>

      <a
        href={ROUTES.home}
        className="text-caption font-semibold text-accent underline underline-offset-2"
      >
        홈으로
      </a>
    </main>
  );
}
