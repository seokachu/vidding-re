import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 병렬 작업용 git worktree 가 레포 안에 산다. 각자 .next 와 node_modules 를
    // 들고 있어서, 빼지 않으면 lint 가 남의 빌드 산출물을 검사한다
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
