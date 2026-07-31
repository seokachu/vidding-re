import { redirect } from "next/navigation";

import { EntryScreen } from "@/components/auth/entry-screen";
import { getAuthUser } from "@/lib/auth";
import { ROUTES, resolveReturnTo } from "@/lib/routes";

export const metadata = { title: "로그인 — Vidding" };

/**
 * 로그인 화면. 진입 화면과 같은 내용이다 —
 * **가입과 로그인은 구분되지 않는다** (F10 3.2).
 *
 * 액션 도중 로그인이 필요해지면 프록시가 여기로 보내며 `next` 를 함께 넘긴다.
 * 로그인이 끝나면 그 자리로 되돌린다 (F10 3.5).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // 이미 로그인한 상태에서 로그인 화면에 들어오면 홈으로 보낸다 (F10 4)
  const user = await getAuthUser();
  if (user) redirect(resolveReturnTo(next) || ROUTES.home);

  return <EntryScreen next={next} error={error} />;
}
