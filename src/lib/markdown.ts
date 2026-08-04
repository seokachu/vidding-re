/**
 * 기획 문서(`docs/*.md`) 전용 마크다운 렌더러.
 *
 * 라이브러리를 쓰지 않는 이유는 **의존성 트리가 이미 ERESOLVE 로 앓고 있어서다**
 * (eslint-plugin-prettier peer 충돌). 문서는 전부 우리가 쓴 것이라 문법의
 * 범위가 좁고 고정돼 있다 — 제목 · 굵게 · 표 · 인용 · 목록 · 코드 · 링크.
 * 그 밖의 문법은 지원하지 않으며, 필요해지면 여기에 추가한다.
 *
 * 신뢰 경계: **입력은 저장소 안의 문서뿐이다.** 사용자 입력을 넣지 않는다.
 * 그래도 텍스트는 전부 이스케이프한다.
 */

/** 문서 간 상대 링크(`./F5-낙찰.md`)를 `/docs/<slug>` 로 바꾸는 표 */
export type SlugMap = Record<string, string>;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** `인라인 코드` → 자리표시자로 빼두고 마지막에 복원한다. 코드 안은 서식이 없다 */
function renderInline(text: string, slugMap: SlugMap): string {
  const codes: string[] = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
    const rewritten = rewriteHref(href, slugMap);
    const external = /^https?:\/\//.test(rewritten);
    const attrs = external ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${rewritten}"${attrs}>${label}</a>`;
  });

  // 자동 링크 — 문서에 맨몸 URL 이 종종 있다 (배포 주소 등)
  out = out.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_, pre: string, url: string) =>
      `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`,
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]);
}

/** `./specs/F5-낙찰.md#3-2` → `/docs/f5`. 모르는 상대 경로는 그대로 둔다 */
function rewriteHref(href: string, slugMap: SlugMap): string {
  if (/^https?:\/\//.test(href) || href.startsWith("#") || href.startsWith("/")) {
    return href;
  }
  const base = href.split("#")[0].split("/").pop() ?? "";
  const slug = slugMap[base];
  return slug ? `/docs/${slug}` : href;
}

/** `|:---:|` 구분줄에서 열 정렬을 읽는다 */
function tableAligns(sep: string): ("left" | "center" | "right")[] {
  return splitRow(sep).map((cell) => {
    const c = cell.trim();
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
}

function splitRow(row: string): string[] {
  return row.replace(/^\|/, "").replace(/\|\s*$/, "").split("|");
}

export function renderMarkdown(source: string, slugMap: SlugMap = {}): string {
  const lines = source.split("\n");
  const html: string[] = [];
  let i = 0;

  const paragraph: string[] = [];
  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInline(paragraph.join(" "), slugMap)}</p>`);
    paragraph.length = 0;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      flushParagraph();
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // 닫는 펜스
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      // GitHub 방식의 id — 문서 안 `[§6](#6-설계에서-달라진-것)` 앵커가 이어진다
      const id = heading[2]
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-");
      html.push(
        `<h${level} id="${id}">${renderInline(heading[2], slugMap)}</h${level}>`,
      );
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      html.push("<hr />");
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(
        `<blockquote>${renderMarkdown(quote.join("\n"), slugMap)}</blockquote>`,
      );
      continue;
    }

    // 표 — 다음 줄이 구분줄(`|---|`)일 때만. 아니면 그냥 문단이다
    if (line.trimStart().startsWith("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      flushParagraph();
      const aligns = tableAligns(lines[i + 1]);
      const align = (k: number) =>
        aligns[k] && aligns[k] !== "left" ? ` style="text-align:${aligns[k]}"` : "";

      const head = splitRow(line)
        .map((c, k) => `<th${align(k)}>${renderInline(c.trim(), slugMap)}</th>`)
        .join("");
      i += 2;

      const rows: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        const cells = splitRow(lines[i])
          .map((c, k) => `<td${align(k)}>${renderInline(c.trim(), slugMap)}</td>`)
          .join("");
        rows.push(`<tr>${cells}</tr>`);
        i++;
      }
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`,
      );
      continue;
    }

    const bullet = line.match(/^(\s*)-\s+(.*)$/);
    const ordered = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      const pattern = bullet ? /^(\s*)-\s+(.*)$/ : /^(\s*)\d+\.\s+(.*)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(pattern);
        if (m) {
          items.push(renderInline(m[2], slugMap));
          i++;
          continue;
        }
        // 들여쓴 이어지는 줄은 앞 항목에 붙는다
        if (items.length > 0 && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1] += ` ${renderInline(lines[i].trim(), slugMap)}`;
          i++;
          continue;
        }
        break;
      }
      html.push(
        `<${tag}>${items.map((it) => `<li>${it}</li>`).join("")}</${tag}>`,
      );
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }

  flushParagraph();
  return html.join("\n");
}
