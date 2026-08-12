import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requiresAuth, signinWithReturn } from "@/lib/routes";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Next 16 에서 `middleware` 는 `proxy` 로 이름이 바뀌었다.
 * (파일명·함수명 모두. edge 런타임은 지원하지 않고 항상 nodejs 다)
 *
 * 하는 일은 둘이다.
 *
 *   1. **세션 갱신** — 만료가 임박한 토큰을 매 요청마다 새로 받아 쿠키에 심는다.
 *      서버 컴포넌트는 쿠키를 쓸 수 없으므로 이 자리가 유일한 갱신 지점이다.
 *   2. **접근 판정** — 로그인이 필요한 경로에 미로그인으로 들어오면 로그인 화면으로
 *      보내되, **원래 위치를 `next` 로 넘겨 로그인 후 되돌린다** (F10 3.5).
 *
 * 여기서 막는 것은 화면 진입까지다. 데이터 권한의 최종 판정은 RLS 가 한다 (P6).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // createServerClient 와 getUser 사이에 아무것도 넣지 않는다.
  // 사이에 코드가 끼면 세션이 갱신되기 전에 읽혀 로그아웃이 무작위로 발생한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && requiresAuth(pathname)) {
    const url = new URL(
      signinWithReturn(`${pathname}${search}`),
      request.nextUrl.origin,
    );

    // 리디렉션 응답에도 갱신된 쿠키를 실어 보낸다.
    // 빠뜨리면 방금 새로 받은 토큰이 버려져 다음 요청에서 또 튕긴다.
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 실행한다.
     * - _next/static, _next/image  정적 자산
     * - favicon.ico, 이미지 파일    자산
     * - manifest.webmanifest       PWA 매니페스트 — 크롬이 쿠키 없이 받아가므로
     *                              인증 판정에 걸리면 설치 자체가 안 된다
     * matcher 를 두지 않으면 정적 파일까지 인증 판정을 거쳐 CSS·JS 가 막힌다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|webmanifest)$).*)",
  ],
};
