import type { Preview } from "@storybook/nextjs-vite";
import React from "react";

import "../src/app/globals.css";

/**
 * 앱과 같은 조건으로 그린다.
 *
 * - `globals.css` 를 그대로 불러온다 — 디자인 토큰의 단일 출처는 `.pen` 이고,
 *   코드 쪽 사본이 `globals.css` 다. 스토리북용 토큰 사본을 만들지 않는다.
 * - 기본 폭 350px — 390px 화면에서 좌우 거터 20px 을 뺀 콘텐츠 폭이다.
 *   전체 폭이 필요한 스토리는 `parameters.layout: "fullscreen"` 으로 푼다.
 */
const preview: Preview = {
  parameters: {
    // 이 앱은 App Router 다 — next/navigation 의 useRouter 목이 여기에 달려 있다
    nextjs: { appDirectory: true },
    layout: "centered",
    backgrounds: {
      options: {
        bg: { name: "bg", value: "#ffffff" },
        surface: { name: "surface", value: "#f6f7fb" },
      },
    },
  },
  decorators: [
    (Story, { parameters }) =>
      parameters.layout === "fullscreen" ? (
        <Story />
      ) : (
        <div style={{ width: 350 }}>
          <Story />
        </div>
      ),
  ],
};

export default preview;
