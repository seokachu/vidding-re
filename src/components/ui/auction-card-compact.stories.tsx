import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuctionCardCompact } from "./auction-card-compact";

const HOUR = 3_600_000;

/**
 * 세로형 좁은 카드. 홈의 **마감 임박 가로 스크롤**에 쓴다 (F2 3.1).
 * 남은 시간에 사용자가 반응해야 하는 카드라 시간이 강조된다.
 */
const meta = {
  title: "공통 UI/AuctionCardCompact",
  component: AuctionCardCompact,
} satisfies Meta<typeof AuctionCardCompact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 마감임박: Story = {
  args: {
    auction: {
      auction_id: "sb-auction",
      title: "필름 카메라 나눔",
      thumbnail: null,
      end_at: new Date(Date.now() + 2 * HOUR).toISOString(),
      episode_count: 3,
    },
  },
};

export const 긴제목: Story = {
  args: {
    auction: {
      auction_id: "sb-auction",
      title: "이사 가면서 정리하는 원목 스툴 2개와 방석 세트",
      thumbnail: null,
      end_at: new Date(Date.now() + 30 * HOUR).toISOString(),
      episode_count: 6,
    },
  },
};
