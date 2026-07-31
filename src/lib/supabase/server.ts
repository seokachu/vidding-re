import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * 서버용 Supabase 클라이언트 — 서버 컴포넌트 · 서버 액션 · 라우트 핸들러.
 *
 * Next 16 에서 `cookies()` 는 비동기다. 그래서 이 함수도 비동기다.
 *
 * 서버 컴포넌트에서는 쿠키를 쓸 수 없으므로 `setAll` 이 던진다. 세션 갱신은
 * 프록시(`src/proxy.ts`)가 매 요청마다 대신 해주므로 무시해도 안전하다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출된 경우다. 프록시가 갱신을 맡는다
        }
      },
    },
  });
}
