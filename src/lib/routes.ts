/**
 * 경로 정의와 접근 정책.
 *
 * F10 3.4 — 로그인이 필요 없는 화면은 진입·온보딩·로그인·콜백 넷이고,
 * 여기에 **경매 열람(F2)** 이 더해진다. 그 외는 로그인이 필요하며
 * 미로그인 시 진입 화면으로 보낸다.
 */

export const ROUTES = {
  /** 진입 화면 (비회원) */
  entry: "/",
  onboarding: "/onboarding",
  signin: "/auth/signup",
  callback: "/auth/callback",

  /** 홈 — 하단 네비 1번 */
  home: "/main",
  /** 경매 목록 — 하단 네비 2번 */
  auctions: "/auctions",
  auctionWrite: "/auctions/write",
  auction: (id: string) => `/auctions/${id}`,
  auctionEdit: (id: string) => `/auctions/${id}/edit`,
  episodeWrite: (auctionId: string) => `/auctions/${auctionId}/episodes/write`,

  /** 알림 — 하단 네비 3번 */
  notifications: "/notifications",

  /** 마이페이지 — 하단 네비 4번 */
  mypage: "/mypage",
  points: "/mypage/points",
  address: "/mypage/address",

  chat: (id: string) => `/chat/${id}`,
} as const;

/** 로그인 없이 열리는 경로 (정확히 일치) */
const PUBLIC_EXACT = new Set<string>([
  ROUTES.entry,
  ROUTES.onboarding,
  ROUTES.home,
  ROUTES.auctions,
  // 푸시 발송 웹훅 — 세션이 아니라 시크릿 헤더로 인증한다 (api/push/route.ts)
  "/api/push",
  // 서비스 워커 — 브라우저의 갱신 요청이 로그인 리다이렉트를 받으면 안 된다
  "/sw.js",
]);

/** 로그인 없이 열리는 경로 (접두어) */
const PUBLIC_PREFIX = ["/auth/"];

/**
 * 접두어는 공개지만 **하위 일부는 로그인이 필요한** 경로.
 * `/auctions/:id` 는 열려 있고 `/auctions/write` 는 막혀 있다.
 */
const PROTECTED_EXACT = new Set<string>([
  ROUTES.auctionWrite,
  ROUTES.notifications,
  ROUTES.mypage,
]);

const PROTECTED_PREFIX = ["/mypage/", "/chat"];

/** 이 경로에 미로그인으로 들어오면 진입 화면으로 보낸다 */
export function requiresAuth(pathname: string): boolean {
  if (PROTECTED_EXACT.has(pathname)) return true;
  if (PROTECTED_PREFIX.some((p) => pathname.startsWith(p))) return true;

  // 경매 하위의 쓰기 화면 — 열람은 열려 있고 작성·수정만 막는다
  if (pathname.startsWith("/auctions/")) {
    return pathname.endsWith("/edit") || pathname.includes("/episodes/");
  }

  if (PUBLIC_EXACT.has(pathname)) return false;
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) return false;

  // 알 수 없는 경로는 막는 쪽으로 판단한다 — 불확실하면 열지 않는다 (00-관계-판정 4)
  return true;
}

/**
 * 로그인 후 돌아올 위치를 담은 로그인 경로.
 * 로그인 때문에 사용자가 하던 일을 잃지 않아야 한다 (F10 3.5).
 */
export function signinWithReturn(returnTo: string): string {
  if (!isSafeReturnTo(returnTo)) return ROUTES.signin;
  return `${ROUTES.signin}?next=${encodeURIComponent(returnTo)}`;
}

/**
 * 돌아갈 위치로 써도 되는 값인가.
 *
 * 외부 주소로 돌려보내면 열린 리디렉션이 된다. **같은 사이트 안의 경로만** 허용한다.
 * `//evil.com` 과 `/\evil.com` 은 브라우저가 프로토콜 상대 주소로 읽으므로 함께 막는다.
 */
export function isSafeReturnTo(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  return true;
}

/** 복귀 위치를 잃었으면 홈으로 보낸다. 오류 화면을 띄우지 않는다 (F10 4) */
export function resolveReturnTo(value: string | null | undefined): string {
  return isSafeReturnTo(value) ? value : ROUTES.home;
}
