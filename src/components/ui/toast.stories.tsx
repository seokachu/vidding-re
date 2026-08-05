import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./button";
import { Toast, useToast } from "./toast";

/**
 * 실패 안내. 화면 아래에 잠깐 띄운다 (F3 4 · F4 4 · F6 4 · F7 4).
 * 서버 판정이 거절했을 때 화면을 통째로 바꾸지 않고 알리는 자리다.
 */
const meta = {
  title: "공통 UI/Toast",
  component: Toast,
  parameters: {
    layout: "fullscreen",
    // 토스트는 position:fixed — "전체" 페이지를 덮지 않게 iframe 에 가둔다
    docs: { story: { inline: false, iframeHeight: 360 } },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 띄워보기: Story = {
  args: { message: null, onDone: () => {} },
  render: function Render() {
    const { message, show, clear } = useToast();
    return (
      <div style={{ padding: 24, minHeight: 320 }}>
        <Button
          variant="secondary"
          onClick={() => show("포인트가 부족해요. 입찰을 낮춰보세요")}
        >
          실패 상황 만들기
        </Button>
        <Toast message={message} onDone={clear} />
      </div>
    );
  },
};
