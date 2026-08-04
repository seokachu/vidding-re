import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ListRow } from "./list-row";

/**
 * 라벨 + 값 + 화살표 한 줄. 마이페이지 프로필 영역이 이걸로 이뤄진다 (F8 3.1).
 */
const meta = {
  title: "공통 UI/ListRow",
  component: ListRow,
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 정보한줄: Story = {
  args: { label: "보유 포인트", value: "10,000 P" },
};

export const 링크: Story = {
  args: { label: "보유 포인트", value: "10,000 P", href: "/mypage/points" },
};

/** 값에 주의를 주고 싶을 때 (`미등록` 같은 것). 오류가 아니다 (F8 4) */
export const 미등록: Story = {
  args: { label: "배송지", value: "미등록", tone: "muted", href: "/mypage/address" },
};
