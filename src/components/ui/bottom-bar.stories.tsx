import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BottomBar } from "./bottom-bar";
import { Button } from "./button";

/**
 * 하단 고정 바의 껍데기. 탭이 붙지 않는 화면의 액션 자리다 —
 * 경매 상세 · 사연 작성 · 경매 등록 · 배송지가 같은 자리를 쓴다.
 */
const meta = {
  title: "공통 UI/BottomBar",
  component: BottomBar,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 단일액션: Story = {
  args: {
    children: <Button block>사연으로 입찰하기</Button>,
  },
};

export const 소유자액션: Story = {
  args: {
    children: (
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" className="flex-1">
          수정
        </Button>
        <Button variant="secondary" className="flex-1">
          삭제
        </Button>
      </div>
    ),
  },
};
