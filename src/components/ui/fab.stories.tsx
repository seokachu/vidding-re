import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Fab } from "./fab";

/** 경매 등록 FAB. 목록 화면 우측 하단에 뜬다 (S02) */
const meta = {
  title: "공통 UI/Fab",
  component: Fab,
  args: { href: "/auctions/write" },
} satisfies Meta<typeof Fab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {};
