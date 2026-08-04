import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { LikeButton } from "./like-button";

/**
 * 공감 버튼. 가중치(주최자 50 / 그 외 10)는 화면에서 계산하지 않는다 —
 * 서버 RPC 가 정하고 여기 `count` 는 표시용이다 (F4).
 */
const meta = {
  title: "공통 UI/LikeButton",
  component: LikeButton,
} satisfies Meta<typeof LikeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 안누름: Story = {
  args: { count: 120, liked: false },
};

export const 누름: Story = {
  args: { count: 130, liked: true },
};

/** 마감된 경매·자기 사연·비회원이면 누를 수 없다 (00-관계-판정 3.5) */
export const 비활성: Story = {
  args: { count: 120, liked: false, disabled: true },
};

export const 눌러보기: Story = {
  args: { count: 120, liked: false },
  render: function Render() {
    const [liked, setLiked] = useState(false);
    return (
      <LikeButton
        count={liked ? 130 : 120}
        liked={liked}
        onToggle={() => setLiked((prev) => !prev)}
      />
    );
  },
};
