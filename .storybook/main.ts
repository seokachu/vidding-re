import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * 공통 UI 컴포넌트의 스토리북 (.pen `03 공통 UI 컴포넌트`).
 *
 * 스토리는 컴포넌트 옆에 둔다 — `src/components/ui/*.stories.tsx`.
 * 화면(features)은 스토리로 만들지 않는다. 화면의 단일 출처는 `.pen` 과
 * 배포본이고, 스토리북은 공통 컴포넌트의 상태 카탈로그다.
 */
const config: StorybookConfig = {
  stories: ["../src/components/ui/**/*.stories.@(ts|tsx)"],
  // autodocs("전체" 페이지)는 이 애드온이 있어야 만들어진다
  addons: ["@storybook/addon-docs"],
  docs: { defaultName: "전체" },
  framework: { name: "@storybook/nextjs-vite", options: {} },
  // Pretendard 를 프리뷰에서도 쓴다 (preview-head.html 의 @font-face 가 참조)
  staticDirs: [{ from: "../src/app/fonts", to: "/fonts" }],
};

export default config;
