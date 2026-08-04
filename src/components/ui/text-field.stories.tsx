import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TextAreaField, TextField } from "./text-field";

/**
 * 라벨 + 입력 + 도움말. 에러가 있으면 도움말 자리를 대신 차지하고
 * 테두리가 경고색이 된다. 글자 수 제한은 카운터로 실시간 안내한다 (F1 4.2).
 */
const meta = {
  title: "공통 UI/TextField",
  component: TextField,
  args: {
    label: "경매 제목",
    placeholder: "무엇을 나누시나요?",
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 기본: Story = {};

export const 필수와카운터: Story = {
  args: { required: true, counter: "12 / 50", defaultValue: "필름 카메라 나눔" },
};

export const 도움말: Story = {
  args: { helper: "50자까지 쓸 수 있어요" },
};

export const 에러: Story = {
  args: {
    error: "제목을 입력해주세요",
    defaultValue: "",
  },
};

export const 비활성: Story = {
  args: { disabled: true, defaultValue: "마감된 경매는 수정할 수 없어요" },
};

/** 사연 내용처럼 여러 줄을 받는 자리 */
export const 여러줄: Story = {
  render: () => (
    <TextAreaField
      label="사연 내용"
      required
      counter="86 / 500"
      defaultValue={
        "저희 집 첫째가 곧 태어나서 아기 사진을 필름으로 남기고 싶어요.\n" +
        "소중히 쓰겠습니다."
      }
      helper="물건이 왜 나에게 필요한지 들려주세요"
    />
  ),
};
