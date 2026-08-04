import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { BID_STEPS } from "@/lib/constants";
import { PointStepper } from "./point-stepper";

/**
 * 입찰 스테퍼. **＋/− 버튼으로만 조작한다** — 숫자를 직접 입력하지 않는다.
 * 단계는 전 서비스 공통 상수다 (1,000 → 1,500 → … → 3,000).
 */
const meta = {
  title: "공통 UI/PointStepper",
  component: PointStepper,
} satisfies Meta<typeof PointStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 조작해보기: Story = {
  args: { value: BID_STEPS[0], onChange: () => {} },
  render: function Render() {
    const [value, setValue] = useState<number>(BID_STEPS[0]);
    return <PointStepper value={value} onChange={setValue} />;
  },
};

/** 이미 2,000 P 를 건 사연 — 그 아래로는 내리지 못한다 (F3 4.3) */
export const 최소단계고정: Story = {
  args: { value: 2000, onChange: () => {} },
  render: function Render() {
    const [value, setValue] = useState(2000);
    return <PointStepper value={value} onChange={setValue} min={2000} />;
  },
};

export const 비활성: Story = {
  args: { value: 1500, onChange: () => {}, disabled: true },
};
