import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuctionCard } from "./auction-card";
import { LikeButton } from "./like-button";

const HOUR = 3_600_000;

/** 스토리는 실행 시점 기준으로 남은 시간을 만든다 — 마감 판정이 살아 있다 */
function mockAuction(
  overrides: Partial<Parameters<typeof AuctionCard>[0]["auction"]> = {},
) {
  return {
    auction_id: "sb-auction",
    title: "필름 카메라 나눔",
    thumbnail: null,
    end_at: new Date(Date.now() + 26 * HOUR).toISOString(),
    status: "OPEN" as const,
    winning_episode_id: null,
    episode_count: 3,
    ...overrides,
  };
}

/**
 * 가로형 경매 카드. 목록·마이페이지 탭이 쓴다 (F2 3.1).
 * 담는 것은 대표 이미지 · 제목 · 남은 시간 · 모인 사연 수뿐이다.
 */
const meta = {
  title: "공통 UI/AuctionCard",
  component: AuctionCard,
} satisfies Meta<typeof AuctionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 진행중: Story = {
  args: { auction: mockAuction() },
};

export const 마감임박: Story = {
  args: {
    auction: mockAuction({
      title: "캠핑 의자 2개",
      end_at: new Date(Date.now() + 2 * HOUR).toISOString(),
    }),
  },
};

export const 낙찰됨: Story = {
  args: {
    auction: mockAuction({
      title: "강아지 나눔",
      status: "CLOSED",
      winning_episode_id: "sb-episode",
      end_at: new Date(Date.now() - HOUR).toISOString(),
    }),
  },
};

export const 유찰: Story = {
  args: {
    auction: mockAuction({
      title: "원목 스툴 2개",
      status: "CLOSED",
      end_at: new Date(Date.now() - HOUR).toISOString(),
      episode_count: 0,
    }),
  },
};

/** 카드 우측에 붙일 것 — 찜 해제 버튼 등 (F8 3.5) */
export const 우측버튼: Story = {
  args: {
    auction: mockAuction(),
    trailing: <LikeButton count={12} liked />,
  },
};
