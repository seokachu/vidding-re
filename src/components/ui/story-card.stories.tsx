import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LikeButton } from "./like-button";
import { StoryCard } from "./story-card";

const LONG_CONTENT =
  "저희 집 첫째가 곧 태어나서 아기 사진을 필름으로 남기고 싶어요. " +
  "디지털로 찍은 사진은 많은데, 인화해서 앨범에 꽂아 둔 사진이 한 장도 없더라고요. " +
  "부모님이 저를 필름 카메라로 찍어 주셨던 것처럼, 저도 아이의 첫 해를 " +
  "필름으로 남겨 주고 싶습니다. 소중히 쓰겠습니다.";

/**
 * 사연 카드. **목록이 곧 랭킹이다** (F3 3.6).
 * 담는 것은 순위 · 닉네임 · 최종 입찰 포인트 · 공감 · 제목·내용 다섯이다.
 */
const meta = {
  title: "공통 UI/StoryCard",
  component: StoryCard,
  args: {
    rank: 1,
    nickName: "서카츄",
    score: 2500,
    title: "아이의 첫 해를 필름으로 남기고 싶어요",
    content: LONG_CONTENT,
  },
} satisfies Meta<typeof StoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 내용이 두 줄을 넘으면 `더보기`가 나온다 — 넘칠 때만 */
export const 기본: Story = {};

export const 짧은내용: Story = {
  args: {
    rank: 2,
    nickName: "정원",
    score: 1500,
    title: "출사 다니고 싶어요",
    content: "주말마다 출사를 다니는데 필름 카메라로도 찍어 보고 싶습니다.",
  },
};

/** 낙찰 사연이면 강조한다 (F5) */
export const 낙찰사연: Story = {
  args: { highlighted: true },
};

export const 공감버튼포함: Story = {
  args: { like: <LikeButton count={120} liked={false} /> },
};
