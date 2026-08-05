import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "./button";
import { ConfirmDialog } from "./dialog";

/**
 * 확인 다이얼로그. 되돌리는 데 품이 드는 행동 앞에서만 세운다.
 * 취소가 왼쪽, 실행이 오른쪽 — 실행 버튼은 폼 제출일 수 있어 밖에서 받는다.
 */
const meta = {
  title: "공통 UI/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    layout: "fullscreen",
    // 다이얼로그는 position:fixed — "전체" 페이지를 덮지 않게 iframe 에 가둔다
    docs: { story: { inline: false, iframeHeight: 380 } },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 열어보기: Story = {
  args: {
    open: false,
    title: "경매를 삭제할까요?",
    onCancel: () => {},
    confirm: null,
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          삭제
        </Button>
        <ConfirmDialog
          open={open}
          title="경매를 삭제할까요?"
          description="모인 사연도 함께 사라져요. 되돌릴 수 없어요"
          onCancel={() => setOpen(false)}
          confirm={
            <Button className="flex-1" onClick={() => setOpen(false)}>
              삭제
            </Button>
          }
        />
      </div>
    );
  },
};

export const 처리중: Story = {
  args: {
    open: true,
    busy: true,
    title: "이 정보를 보낼까요?",
    description: "보내면 상대가 대화에서 계속 볼 수 있어요",
    onCancel: () => {},
    confirm: (
      <Button className="flex-1" disabled>
        보내는 중…
      </Button>
    ),
  },
};
