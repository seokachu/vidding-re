/**
 * `known-routes.json` 이 `src/app` 의 실제 라우트와 맞는지 대조한다.
 *
 * ## 왜 필요한가
 *
 * 프록시의 접근 판정은 **아는 경로에만** 적용된다 (`src/lib/routes.ts`).
 * 목록에 없는 주소는 판정을 건너뛰고 404 로 흘려보내므로, 새 화면을 만들고
 * 목록에 적지 않으면 **그 화면이 비회원에게 404 로 보인다.** 뚫리는 쪽이 아니라
 * 막히는 쪽으로 실패하니 위험하진 않지만, 조용히 며칠 갈 수는 있다. 그 며칠을
 * 없애는 게 이 스크립트다.
 *
 * 반대 방향도 잡는다 — 지운 화면이 목록에 남아 있으면 **없는 주소가 계속
 * 로그인으로 리다이렉트된다.** 그래서 양쪽 차이를 모두 실패로 본다.
 *
 * ## 왜 자동 생성하지 않는가
 *
 * 목록을 스캔해서 만들어 버리면 편하지만, 그 옆에 있는 공개/보호 규칙과 함께
 * **사람이 읽고 판단하는 값**이라는 성격이 사라진다. 목록은 손으로 적고,
 * 어긋남만 기계가 잡는다.
 *
 * 실행: pnpm check:routes
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = "src/app";
const LIST_PATH = "src/lib/known-routes.json";

/** 라우트를 만드는 파일 — 나머지(layout·error·not-found·이미지 규약)는 주소가 없다 */
const ROUTE_FILES = new Set(["page.tsx", "page.ts", "route.ts", "route.tsx"]);

/**
 * `src/app` 을 훑어 실제 주소를 모은다.
 *
 * - `[id]` → `:id` (known-routes.json 의 표기와 맞춘다)
 * - `[...slug]` 같은 catch-all 은 이 앱에 없다. 생기면 여기서 걸리게 둔다
 * - `_private` 은 라우팅에서 빠지고, `(group)` 은 주소에 안 들어간다
 */
function collectRoutes(dir, segments = []) {
  const found = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      if (entry.startsWith("_") || entry.startsWith("@")) continue;
      const isGroup = entry.startsWith("(") && entry.endsWith(")");
      const isDynamic = entry.startsWith("[") && entry.endsWith("]");

      if (isDynamic && entry.includes("...")) {
        throw new Error(`catch-all 세그먼트는 아직 지원하지 않는다: ${path}`);
      }

      found.push(
        ...collectRoutes(
          path,
          isGroup
            ? segments
            : [...segments, isDynamic ? `:${entry.slice(1, -1)}` : entry],
        ),
      );
      continue;
    }

    if (ROUTE_FILES.has(entry)) found.push(`/${segments.join("/")}`);
  }

  return found;
}

const actual = new Set(collectRoutes(APP_DIR));
const listed = new Set(JSON.parse(readFileSync(LIST_PATH, "utf8")).routes);

const missing = [...actual].filter((route) => !listed.has(route)).sort();
const stale = [...listed].filter((route) => !actual.has(route)).sort();

if (missing.length === 0 && stale.length === 0) {
  console.log(`✓ 라우트 ${actual.size}개가 ${LIST_PATH} 와 일치한다`);
  process.exit(0);
}

console.error(`✗ ${LIST_PATH} 가 ${APP_DIR} 와 어긋난다\n`);

if (missing.length > 0) {
  console.error("  목록에 없는 라우트 (비회원에게 404 로 보인다):");
  for (const route of missing) console.error(`    + ${route}`);
  console.error("");
}

if (stale.length > 0) {
  console.error("  라우트가 없는데 목록에 남은 항목 (없는 주소가 로그인으로 간다):");
  for (const route of stale) console.error(`    - ${route}`);
  console.error("");
}

console.error(`  ${LIST_PATH} 의 "routes" 를 고쳐라.`);
process.exit(1);
