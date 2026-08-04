import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Logo } from "./logo";

/** `.pen` `Logo / VID` 를 그대로 옮긴 패스. 잉크 블루가 기본이다 */
const meta = {
  title: "공통 UI/Logo",
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 크게: Story = {
  args: { width: 90 },
};
