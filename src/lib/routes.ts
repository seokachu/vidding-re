/**
 * 경로 정의와 접근 정책.
 *
 * F10 3.4 — 로그인이 필요 없는 화면은 진입·온보딩·로그인·콜백 넷이고,
 * 여기에 **경매 열람(F2)** 이 더해진다. 그 외는 로그인이 필요하며
 * 미로그인 시 진입 화면으로 보낸다.
 */

import knownRoutes from "./known-routes.json";

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

  /** 채팅 목록 — 탭 4곳 헤더의 채팅 아이콘으로 들어온다 */
  chatList: "/chat",
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
  // 오프라인 폴백 화면 — 워커가 설치 시점에 받아 두는 파일이다.
  // 여기서 로그인으로 리다이렉트되면 캐시에 담기는 것이 로그인 화면이 된다
  "/offline.html",
  // APK 다운로드 — QR 로 처음 들어오는 사람이 로그인에 막히면 안 된다
  "/download",
]);

/** 로그인 없이 열리는 경로 (접두어) */
// /docs — 기획 문서 아카이브. 과제·포트폴리오 열람용이라 로그인을 요구하지 않는다
const PUBLIC_PREFIX = ["/auth/", "/docs"];

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

/**
 * **실제로 있는 경로.** `:id` 는 아무 세그먼트나 받는다.
 *
 * 접근 판정은 "있는 화면"에만 한다. 없는 주소까지 판정에 넣으면 오타 하나가
 * 로그인 화면으로 이어지는데, **로그인해도 그 주소는 여전히 없다** — 사용자를
 * 두 번 헛걸음시키고 404(S17)는 비회원에게 영영 보이지 않는다.
 *
 * **새 화면을 만들면 `known-routes.json` 에 함께 적는다.** 빠뜨리면 그 화면이
 * 비회원에게 404 로 보인다 — 조용히 뚫리는 것이 아니라 눈에 띄게 막히는 쪽으로
 * 실패한다. 목록 안에서는 지금처럼 deny-by-default 가 그대로 적용된다.
 *
 * 손으로 관리하는 목록이지만 어긋난 채로 오래 가지는 않는다 —
 * `pnpm check:routes` 가 `src/app` 의 실제 라우트와 대조하고 CI 가 이걸 돌린다.
 * TS 밖(플레인 Node)에서도 읽어야 해서 목록만 JSON 으로 빼 두었다.
 */
const KNOWN_ROUTES = [
  ...knownRoutes.routes,
  // 라우트는 아니지만 프록시를 지나가는 정적 파일들 (matcher 가 안 걸러낸다)
  ...knownRoutes.staticFiles,
];

/** 위 목록에 있는 주소인가. 없으면 접근 판정을 하지 않고 404 로 흘려보낸다 */
function isKnownRoute(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const segments = path.split("/");

  return KNOWN_ROUTES.some((route) => {
    const pattern = route.split("/");
    if (pattern.length !== segments.length) return false;
    return pattern.every((part, index) =>
      part.startsWith(":") ? segments[index].length > 0 : part === segments[index],
    );
  });
}

/** 이 경로에 미로그인으로 들어오면 진입 화면으로 보낸다 */
export function requiresAuth(pathname: string): boolean {
  // 없는 주소는 막을 것도 없다 — 그대로 통과시켜 404 를 띄운다
  if (!isKnownRoute(pathname)) return false;

  if (PROTECTED_EXACT.has(pathname)) return true;
  if (PROTECTED_PREFIX.some((p) => pathname.startsWith(p))) return true;

  // 경매 하위의 쓰기 화면 — 열람은 열려 있고 작성·수정만 막는다
  if (pathname.startsWith("/auctions/")) {
    return pathname.endsWith("/edit") || pathname.includes("/episodes/");
  }

  if (PUBLIC_EXACT.has(pathname)) return false;
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) return false;

  // 있는 화면인데 위 어디에도 안 걸렸다면 막는 쪽으로 판단한다 —
  // 불확실하면 열지 않는다 (00-관계-판정 4)
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
