import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * service_role 키를 쓰는 관리자 클라이언트. **RLS 를 통째로 우회한다.**
 *
 * 브라우저로 새어나가면 서비스 전체가 열린다. `server-only` 를 import 해
 * 클라이언트 번들에 섞이면 빌드가 깨지도록 막아 두었다.
 *
 * 쓰는 곳은 시드 스크립트뿐이다. 화면 코드에서는 절대 부르지 않는다 —
 * 화면의 권한 판정은 RLS 가 최종이다 (P6, 00-관계-판정 4).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "환경 변수 SUPABASE_SERVICE_ROLE_KEY 가 없습니다. 시드·운영 작업에만 필요합니다.",
    );
  }

  return createClient<Database>(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
