import { OnboardingSlides } from "@/features/notify/onboarding-slides";
import { isSafeReturnTo, ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Vidding 소개",
  description: "사연으로 입찰하는 경매가 어떻게 돌아가는지 3장으로 안내합니다.",
};

/**
 * S12 — 온보딩 (F11).
 *
 * **로그인이 필요 없다** (F11 3.3 · 완료 조건 8). `routes.ts` 의 공개 경로에 들어 있어
 * 프록시도 막지 않는다. 이미 로그인한 사용자가 들어와도 그대로 보여준다 (F11 4).
 *
 * **첫 로그인 뒤 인증 콜백이 여기로 보낸다** (F11 3.3). 그때 원래 가려던 곳이
 * `?next=` 로 따라오므로 다 보거나 건너뛰면 그 자리로 이어 준다 — 경매를 열려다
 * 로그인한 사람이 소개 3장 때문에 하던 일을 잃으면 안 된다.
 */
export default async function OnboardingPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <OnboardingSlides nextHref={isSafeReturnTo(next) ? next : ROUTES.home} />
  );
}
