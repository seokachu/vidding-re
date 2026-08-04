import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bell, Heart } from "lucide-react";

import { ButtonLink } from "./button";
import { EmptyState } from "./empty-state";

/**
 * 빈 상태. **서비스가 데이터 0건에서 시작하므로 이게 첫 화면이다** (F10 3.3.1).
 * 조회 실패는 이 컴포넌트로 그리지 않는다 — 그건 `ErrorState` 다.
 */
const meta = {
  title: "공통 UI/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {
  args: {
    title: "아직 진행 중인 경매가 없어요",
    description: "첫 경매를 열어보세요",
  },
};

/** 빈 목록에는 갈 곳을 함께 준다 (F8 3.7) */
export const 다음행동포함: Story = {
  args: {
    icon: Heart,
    title: "찜한 경매가 없어요",
    description: "마음에 드는 경매를 찜해두면\n여기에 모여요",
    action: <ButtonLink href="/auctions">경매 둘러보기</ButtonLink>,
  },
};

export const 알림없음: Story = {
  args: {
    icon: Bell,
    title: "새로운 알림이 없어요",
  },
};
