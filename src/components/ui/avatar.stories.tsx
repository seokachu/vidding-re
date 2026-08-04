import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "./avatar";

/** 원형 프로필 이미지 예시 (외부 요청 없이 렌더된다) */
const SAMPLE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
      '<rect width="80" height="80" fill="#9DB0E9"/>' +
      '<circle cx="40" cy="32" r="14" fill="#F2F5FD"/>' +
      '<ellipse cx="40" cy="66" rx="24" ry="16" fill="#F2F5FD"/>' +
      "</svg>",
  );

/**
 * 프로필 이미지. 없거나 로드에 실패하면 **닉네임 첫 글자**로 대체한다 (F8 4).
 */
const meta = {
  title: "공통 UI/Avatar",
  component: Avatar,
  args: { nickName: "서카츄" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 이미지: Story = {
  args: { src: SAMPLE },
};

export const 이니셜대체: Story = {
  args: { src: null },
};

export const 크기: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar {...args} size={28} />
      <Avatar {...args} size={40} />
      <Avatar {...args} size={64} />
    </div>
  ),
  args: { src: SAMPLE },
};
