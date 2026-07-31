import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * 로그아웃 (F10 3.7).
 *
 * 요청이 실패해도 **로그인 상태로 남겨두지 않는다.** 서버 세션 종료가 실패하면
 * 쿠키만이라도 지우고 진입 화면으로 보낸다 (F10 4).
 *
 * GET 이 아니라 POST 다. 링크 프리페치나 이미지 태그로 남의 세션을 끊을 수 없어야 한다.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(
    new URL(ROUTES.entry, request.nextUrl.origin),
    { status: 303 },
  );

  // signOut 이 실패했더라도 남은 인증 쿠키를 직접 걷어낸다
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
