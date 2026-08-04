import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SearchField } from "./search-field";

/** 목록 상단에 고정되는 검색 입력창. **제목만 검색한다** (F2 3.2) */
const meta = {
  title: "공통 UI/SearchField",
  component: SearchField,
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 입력됨: Story = {
  args: { defaultValue: "카메라" },
};
