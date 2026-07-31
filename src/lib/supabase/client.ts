import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * 브라우저용 Supabase 클라이언트.
 *
 * 클라이언트 컴포넌트에서만 쓴다. 서버에서는 `lib/supabase/server.ts` 를 쓴다.
 * 매 호출마다 새로 만들지 말고 모듈 수준에서 한 번만 만들어 쓴다 —
 * Realtime 구독이 인스턴스마다 따로 열리기 때문이다.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  browserClient ??= createBrowserClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
  );
  return browserClient;
}
