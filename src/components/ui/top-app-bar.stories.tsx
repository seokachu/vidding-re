import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Share } from "lucide-react";

import { TopAppBar } from "./top-app-bar";

/**
 * 상세·작성 화면의 상단 바. 뒤로가기 + 제목 + 우측 액션.
 * 탭 4개(홈·탐색·알림·마이)는 이 바 대신 `AppHeader` 를 쓴다.
 */
const meta = {
  title: "공통 UI/TopAppBar",
  component: TopAppBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopAppBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {
  args: { title: "경매 등록" },
};

export const 긴제목: Story = {
  args: { title: "이사 가면서 정리하는 원목 스툴 2개와 방석 세트" },
};

export const 우측액션: Story = {
  args: {
    title: "필름 카메라 나눔",
    action: (
      <button
        type="button"
        aria-label="공유"
        className="flex size-10 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
      >
        <Share size={20} />
      </button>
    ),
  },
};
