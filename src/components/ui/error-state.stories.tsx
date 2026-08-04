import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorState, InlineRetry } from "./error-state";

/**
 * 조회 실패. **빈 상태로 위장하지 않는다** (F8 4 · F9 4).
 * "내역 없음"과 "조회 실패"는 서로 다른 화면이어야 한다.
 */
const meta = {
  title: "공통 UI/ErrorState",
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {
  args: {
    description: "목록을 불러오지 못했어요.\n잠시 후 다시 시도해주세요",
  },
};

/** 화면을 다 차지하면 안 되는 자리 — 프로필 한 영역의 실패 등 (F8 4) */
export const 한줄실패: Story = {
  render: () => (
    <InlineRetry message="포인트를 불러오지 못했어요" onRetry={() => {}} />
  ),
};
