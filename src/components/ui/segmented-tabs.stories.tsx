import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { SegmentedTabs } from "./segmented-tabs";

const SORT_TABS = [
  { value: "ending", label: "마감 임박" },
  { value: "episodes", label: "사연 많은순" },
  { value: "latest", label: "최신순" },
] as const;

const MY_TABS = [
  { value: "auctions", label: "내 경매" },
  { value: "episodes", label: "내 사연" },
  { value: "likes", label: "찜" },
] as const;

type SortValue = (typeof SORT_TABS)[number]["value"];

/**
 * 정렬 탭과 마이페이지 탭에 쓴다. `href` 를 주면 링크로 그린다 —
 * 정렬은 주소에 남아야 뒤로가기·공유가 동작한다.
 */
const meta = {
  title: "공통 UI/SegmentedTabs",
  component: SegmentedTabs,
} satisfies Meta<typeof SegmentedTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 정렬탭: Story = {
  args: { tabs: SORT_TABS, value: "ending", ariaLabel: "정렬" },
  render: function Render() {
    const [value, setValue] = useState<SortValue>("ending");
    return (
      <SegmentedTabs
        tabs={SORT_TABS}
        value={value}
        onChange={setValue}
        ariaLabel="정렬"
      />
    );
  },
};

export const 마이페이지탭: Story = {
  args: { tabs: MY_TABS, value: "auctions", ariaLabel: "내 활동" },
};
