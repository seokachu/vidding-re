"use client";

import { useState } from "react";

import { SegmentedTabs, type SegmentedTab } from "@/components/ui";
import type { MypageTab } from "./tabs";

/** 탭은 **항상 셋 모두** 그린다. 활동 이력에 따라 숨기지 않는다 (F8 5-1) */
const TABS: readonly SegmentedTab<MypageTab>[] = [
  { value: "auctions", label: "내 경매" },
  { value: "episodes", label: "내 사연" },
  { value: "favorites", label: "찜" },
];

/**
 * 마이페이지 탭 (F8 3.3~3.5).
 *
 * **페이지 이동이 없다** (F8 5-2). 세 목록은 서버에서 한 번에 그려져 이 컴포넌트에
 * 자식으로 들어오고, 전환은 어느 것을 보여줄지 고르는 일뿐이다. 그래서
 * 전환에 왕복이 없고, 한 목록의 조회 실패가 다른 탭을 막지도 않는다 (F8 5-9).
 *
 * 그래도 **주소에는 남긴다.** 새로고침·공유가 같은 탭으로 열려야 한다.
 * Next 16 은 `history.replaceState` 를 라우터와 이어 두었으므로,
 * 이 호출은 주소만 바꾸고 화면을 다시 불러오지 않는다.
 * `pushState` 가 아니라 `replaceState` 인 이유는, 탭을 몇 번 눌렀다고
 * 뒤로가기가 마이페이지 안에서 맴돌면 안 되기 때문이다.
 */
export function MypageTabs({
  initialTab,
  auctions,
  episodes,
  favorites,
}: {
  initialTab: MypageTab;
  auctions: React.ReactNode;
  episodes: React.ReactNode;
  favorites: React.ReactNode;
}) {
  const [tab, setTab] = useState<MypageTab>(initialTab);

  function select(next: MypageTab) {
    setTab(next);

    const params = new URLSearchParams(window.location.search);
    params.set("tab", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  const panels: Array<[MypageTab, React.ReactNode]> = [
    ["auctions", auctions],
    ["episodes", episodes],
    ["favorites", favorites],
  ];

  return (
    <>
      <div className="px-gutter pt-[22px]">
        <SegmentedTabs
          tabs={TABS}
          value={tab}
          onChange={select}
          ariaLabel="마이페이지 목록"
        />
      </div>

      {panels.map(([value, content]) => (
        <div
          key={value}
          role="tabpanel"
          // 감춘 탭도 DOM 에 남겨 둔다. 다시 눌렀을 때 조회가 일어나지 않는다
          hidden={value !== tab}
          className="px-gutter pt-4"
        >
          {content}
        </div>
      ))}
    </>
  );
}
