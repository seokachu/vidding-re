import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Realtime 채널을 열기 전에 **반드시** 이걸 먼저 부른다.
 *
 * `postgres_changes` 의 RLS 판정은 **채널에 join 하는 순간 한 번**만 이뤄진다.
 * supabase-js 가 저장된 세션을 읽어 토큰을 싣는 것은 비동기라, 그냥 구독하면
 * 익명으로 join 해 **모든 행이 걸러진다.**
 *
 * 이때 증상이 고약하다 — 채널 상태는 `SUBSCRIBED` 로 정상이고 에러도 없는데
 * **이벤트만 하나도 오지 않는다.** 코드를 아무리 봐도 틀린 곳이 없어 보인다.
 *
 * ```ts
 * const supabase = createClient();
 * await authorizeRealtime(supabase);
 * const channel = supabase.channel(`room:${id}`).on("postgres_changes", …).subscribe();
 * ```
 *
 * 세션이 없으면 아무것도 하지 않고 `false` 를 돌려준다. 비회원은 어차피
 * 구독할 것이 없다 (messages·notifications 모두 본인 것만 보인다).
 */
export async function authorizeRealtime(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return false;

  await supabase.realtime.setAuth(session.access_token);
  return true;
}
