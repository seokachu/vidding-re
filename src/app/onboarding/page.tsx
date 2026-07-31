import { OnboardingSlides } from "@/features/notify/onboarding-slides";

export const metadata = {
  title: "Vidding 소개",
  description: "사연으로 입찰하는 경매가 어떻게 돌아가는지 3장으로 안내합니다.",
};

/**
 * S12 — 온보딩 (F11).
 *
 * **로그인이 필요 없다** (F11 3.3 · 완료 조건 8). `routes.ts` 의 공개 경로에 들어 있어
 * 프록시도 막지 않는다. 이미 로그인한 사용자가 들어와도 그대로 보여준다 (F11 4).
 */
export default function OnboardingPage() {
  return <OnboardingSlides />;
}
