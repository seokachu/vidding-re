import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button, ButtonLink } from "./button";

/**
 * 버튼 3종 (.pen 03). **기본 동작은 Primary 하나다.**
 * Secondary 는 소유자 전용 수정·삭제, Ghost 는 보조 액션에 쓴다.
 */
const meta = {
  title: "공통 UI/Button",
  component: Button,
  args: { children: "사연으로 입찰하기" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "수정" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "전체 보기" },
};

export const 비활성: Story = {
  args: { disabled: true, children: "마감된 경매예요" },
};

/** 화면 하단 CTA — 가로를 꽉 채운다 */
export const 블록: Story = {
  args: { block: true },
};

/** 이동이 목적이면 링크로 그린다 — 새 탭·복사가 동작해야 한다 */
export const 링크: Story = {
  render: () => (
    <ButtonLink href="/auctions/write" block>
      경매 등록
    </ButtonLink>
  ),
};
