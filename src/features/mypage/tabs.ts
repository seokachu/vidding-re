/**
 * 탭 값과 주소 파싱.
 *
 * `mypage-tabs.tsx` 가 아니라 여기 있는 이유는, **서버가 `parseTab` 을 부르기**
 * 때문이다. `"use client"` 파일의 export 는 서버에서 호출할 수 없다 —
 * 컴포넌트로 그리거나 props 로만 넘길 수 있다. 빌드는 통과하고 요청 때 터진다.
 */

export const MYPAGE_TABS = ["auctions", "episodes", "favorites"] as const;

export type MypageTab = (typeof MYPAGE_TABS)[number];

/** 모르는 값이면 첫 탭으로 떨어뜨린다. 주소를 손으로 고쳐도 화면이 깨지지 않는다 */
export function parseTab(value: string | string[] | undefined): MypageTab {
  return MYPAGE_TABS.includes(value as MypageTab)
    ? (value as MypageTab)
    : "auctions";
}
