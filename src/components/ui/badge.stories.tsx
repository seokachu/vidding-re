import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";

/**
 * 상태 배지 5종 (.pen 03). **레드는 마감 임박 하나에만 쓴다** (F11 3.6).
 */
const meta = {
  title: "공통 UI/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 진행중: Story = {
  args: { tone: "ongoing", children: "진행중" },
};

export const 마감임박: Story = {
  args: { tone: "endingSoon", children: "마감 임박" },
};

export const 마감됨: Story = {
  args: { tone: "closed", children: "마감됨" },
};

export const 낙찰됨: Story = {
  args: { tone: "won", children: "낙찰됨" },
};

export const 유찰: Story = {
  args: { tone: "void", children: "유찰" },
};

/** 다섯 톤을 한눈에 */
export const 전체: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge tone="ongoing">진행중</Badge>
      <Badge tone="endingSoon">마감 임박</Badge>
      <Badge tone="closed">마감됨</Badge>
      <Badge tone="won">낙찰됨</Badge>
      <Badge tone="void">유찰</Badge>
    </div>
  ),
};
