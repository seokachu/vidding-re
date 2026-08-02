import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { ROUTES, resolveReturnTo } from "@/lib/routes";

export const metadata = { title: "Vidding — 사연으로 입찰하는 경매" };

/**
 * 서비스 입구 (`/`). **화면을 그리지 않고 갈림길만 잡는다** (F11 3.3).
 *
 * ```
 * 로그인함   → 홈
 * 로그아웃함 → 온보딩 → 로그인 화면
 * ```
 *
 * 온보딩이 하는 일은 "사연으로 입찰한다"는 낯선 개념을 이해시키는 것이므로
 * **가입을 결정하기 전에** 나와야 한다. 로그인 뒤에 보여주면 이미 결정한
 * 사람에게 설명하는 셈이다.
 *
 * **본 적 있는지를 따로 기록하지 않는다.** 로그아웃 상태로 여기 오는 일 자체가
 * 드물다 — 둘러보기를 누른 사람은 `/main` 에 있고, 하단 탭 어디도 `/` 로 가지
 * 않는다. 그 드문 재노출을 막으려고 쿠키·컬럼·콜백 분기를 두는 것은 값이 맞지
 * 않는다. 온보딩에는 건너뛰기가 있다.
 *
 * **온보딩의 출구는 `/` 가 아니라 로그인 화면이다.** 여기로 되돌리면
 * 로그아웃 상태에서 다시 온보딩으로 밀려 루프가 된다.
 *
 * 인증 콜백이 실패를 `/?error=` 로 실어 보낸다 (F10 4). 그때는 소개를 태우지
 * 않고 로그인 화면으로 넘긴다 — **로그인이 막힌 사람에게 필요한 것은 사유이지
 * 서비스 설명이 아니다.**
 */
export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const user = await getAuthUser();
  if (user) redirect(resolveReturnTo(next) || ROUTES.home);

  if (error) {
    const url = new URLSearchParams({ error });
    if (next) url.set("next", next);
    redirect(`${ROUTES.signin}?${url}`);
  }

  redirect(ROUTES.onboarding);
}
