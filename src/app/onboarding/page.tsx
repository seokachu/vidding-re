import { OnboardingSlides } from "@/features/notify/onboarding-slides";

export const metadata = {
  title: "Vidding 소개",
  description: "사연으로 입찰하는 경매가 어떻게 돌아가는지 3장으로 안내합니다.",
};

/**
 * S12 — 온보딩 (F11).
 *
 * **로그인 전에 보는 화면이다** (F11 3.3). 서비스 입구(`/`)가 로그아웃 상태인
 * 사람을 여기로 보내고, 다 보거나 건너뛰면 로그인 화면으로 이어진다.
 *
 * 로그인이 필요 없다 (F11 3.3 · 완료 조건 8). 이미 로그인한 사용자가 주소로
 * 직접 들어와도 그대로 보여준다 (F11 4).
 */
export default function OnboardingPage() {
  return <OnboardingSlides />;
}
