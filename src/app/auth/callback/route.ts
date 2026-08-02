import { NextResponse, type NextRequest } from "next/server";

import { ROUTES, resolveReturnTo } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * 소셜 인증 콜백 (F10 3.2 4~5).
 *
 * 결과는 셋 중 하나다.
 *   성공        → 원래 보던 화면으로 복귀 (없으면 홈)
 *   사용자 취소 → **조용히** 진입 화면으로. 오류로 표시하지 않는다 (F10 4)
 *   실패        → 진입 화면 + 사유. 인증 중간 상태로 방치하지 않는다
 *
 * **첫 로그인이면 온보딩을 한 번 거친다** (F11 3.3). 판정은 `users.onboarded_at`
 * 이다 — 기기가 아니라 계정에 남으므로 폰에서 보고 노트북에서 또 보는 일이 없다.
 * 원래 가려던 곳(`next`)은 온보딩에 넘겨 이어지게 한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const next = resolveReturnTo(searchParams.get("next"));
  const oauthError = searchParams.get("error");
  const description = searchParams.get("error_description") ?? "";

  // 제공자 화면에서 사용자가 취소했다. 되돌리기만 하고 아무것도 알리지 않는다
  if (oauthError === "access_denied") {
    return NextResponse.redirect(new URL(ROUTES.entry, origin));
  }

  if (oauthError) {
    return NextResponse.redirect(failure(origin, reasonOf(description)));
  }

  // 콜백 파라미터 이상 — 진입 화면으로 보내고 재시도를 안내한다
  if (!code) {
    return NextResponse.redirect(failure(origin, "invalid"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(failure(origin, reasonOf(error.message)));
  }

  /**
   * 온보딩 판정이 실패해도 로그인은 성공한 것이다. 조회가 안 되면 그냥 보낸다 —
   * **소개 화면 때문에 로그인을 막지 않는다.**
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();

    if (row && row.onboarded_at === null) {
      const url = new URL(ROUTES.onboarding, origin);
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}

/**
 * 이메일 없이 들어오면 `handle_new_user()` 가 `EMAIL_REQUIRED` 로 가입을 중단시킨다.
 * Supabase 는 그것을 "Database error saving new user" 로 감싸 내보내므로,
 * 두 문구를 모두 본다 (migration 07).
 */
function reasonOf(message: string): "email_required" | "failed" {
  const lowered = message.toLowerCase();
  if (
    lowered.includes("email_required") ||
    lowered.includes("database error saving new user")
  ) {
    return "email_required";
  }
  return "failed";
}

function failure(origin: string, reason: string) {
  const url = new URL(ROUTES.entry, origin);
  url.searchParams.set("error", reason);
  return url;
}
