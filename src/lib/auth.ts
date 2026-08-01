import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ROUTES, signinWithReturn } from "./routes";
import { createClient } from "./supabase/server";
import type { User } from "./supabase/database.types";

/**
 * 로그인한 사용자의 인증 정보. 없으면 `null` (= 비회원).
 *
 * `getSession()` 이 아니라 `getUser()` 를 쓴다. 세션은 쿠키를 그대로 믿지만
 * `getUser()` 는 인증 서버에 검증을 요청한다. 서버 판정이 최종이어야 한다.
 *
 * **그래서 `cache()` 로 감싼다.** 검증이 네트워크 왕복이라, 한 페이지가 이걸
 * 서너 번 부르면 그만큼 왕복이 쌓인다. `cache()` 는 **요청 하나 안에서만**
 * 결과를 나눠 쓰므로 "서버 판정이 최종"이라는 원칙은 그대로다 — 요청이 바뀌면
 * 다시 검증한다. 직접 `supabase.auth.getUser()` 를 부르지 말고 이걸 쓴다.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * `public.users` 의 내 행. 닉네임·아바타·잔액이 여기 있다.
 *
 * 인증은 됐는데 행이 아직 없을 수 있다. 가입 트리거가 도는 사이의 짧은 틈이다 (F10 4).
 * 그때는 `null` 을 돌려주므로, 호출한 쪽에서 스켈레톤을 띄우고 다시 조회한다.
 */
export async function getCurrentUser(): Promise<User | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

/**
 * 로그인이 반드시 필요한 화면에서 쓴다. 미로그인이면 로그인 화면으로 보낸다.
 *
 * 프록시가 이미 한 번 걸러내지만, 프록시는 화면 진입만 본다.
 * **서버 액션은 프록시를 거치지 않을 수 있으므로** 액션 안에서도 직접 확인한다.
 */
export async function requireAuthUser(returnTo?: string) {
  const user = await getAuthUser();
  if (!user) {
    redirect(returnTo ? signinWithReturn(returnTo) : ROUTES.signin);
  }
  return user;
}

/** 읽지 않은 알림 수. 헤더·하단 네비 배지가 쓴다 (F9 3.2) */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getAuthUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  // 배지 갱신이 실패해도 알림 목록 자체는 정상 동작해야 한다 (F9 4)
  if (error) return 0;
  return count ?? 0;
}
