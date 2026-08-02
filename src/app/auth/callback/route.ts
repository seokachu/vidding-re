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
 * **온보딩은 여기서 다루지 않는다** (F11 3.3). 소개는 로그인 전에 보는 것이라
 * 진입 화면(`/`)이 갈림길을 잡는다.
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
