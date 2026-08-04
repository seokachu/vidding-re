import { readFile } from "node:fs/promises";
import path from "node:path";

import { renderMarkdown, type SlugMap } from "./markdown";

/**
 * `/docs` 에 공개하는 기획 문서의 목록.
 *
 * 원본은 저장소의 `docs/*.md` 그대로다 — 문서를 위해 내용을 복사하지 않는다.
 * 빌드 시점에 읽어 정적으로 굽기 때문에 (`generateStaticParams` +
 * `dynamicParams=false`) 런타임에는 파일 시스템을 건드리지 않는다.
 *
 * v1.0(설계)과 v2.0(현행)을 **둘 다 보존한다.** 설계 문서를 고쳐 쓰지 않고,
 * 달라진 것은 기능명세서 §6 이 기록한다.
 */
export type DocEntry = {
  slug: string;
  file: string;
  title: string;
  description: string;
  /** current: 현행 명세 · plan: 설계 문서 · feature: 기능별 상세 스펙 */
  group: "current" | "plan" | "feature";
};

export const DOCS: DocEntry[] = [
  {
    slug: "spec",
    file: "기능명세서.md",
    title: "기능명세서",
    description: "v2.0 · As-Built — 배포된 서비스 기준의 현행 명세",
    group: "current",
  },
  {
    slug: "prd",
    file: "PRD.md",
    title: "PRD",
    description: "배경 · 문제 · 목표 · 사용자 · 시나리오 · MVP 범위",
    group: "plan",
  },
  {
    slug: "data-model",
    file: "데이터-모델-명세.md",
    title: "데이터 모델 명세",
    description: "테이블 · RLS · 고정 상수",
    group: "plan",
  },
  {
    slug: "relations",
    file: "specs/00-관계-판정.md",
    title: "관계 판정",
    description: "모든 기능의 권한을 결정하는 공통 기반",
    group: "plan",
  },
  {
    slug: "features",
    file: "specs/README.md",
    title: "기능 스펙 개요",
    description: "기능 문서 13건의 목차와 확정된 정책",
    group: "plan",
  },
  { slug: "f1", file: "specs/F1-경매-등록.md", title: "F1. 경매 등록", description: "경매 등록 · 수정 · 삭제", group: "feature" },
  { slug: "f2", file: "specs/F2-경매-탐색.md", title: "F2. 경매 탐색", description: "홈 · 목록 · 검색 · 정렬", group: "feature" },
  { slug: "f3", file: "specs/F3-사연-작성-입찰.md", title: "F3. 사연 작성·입찰", description: "사연 작성 + 포인트 입찰", group: "feature" },
  { slug: "f4", file: "specs/F4-공감.md", title: "F4. 공감", description: "사연 공감 및 가중치 반영", group: "feature" },
  { slug: "f5", file: "specs/F5-낙찰.md", title: "F5. 낙찰", description: "마감 처리 및 낙찰자 확정", group: "feature" },
  { slug: "f6", file: "specs/F6-채팅.md", title: "F6. 1:1 채팅", description: "주최자–낙찰자 대화", group: "feature" },
  { slug: "f7", file: "specs/F7-찜하기.md", title: "F7. 찜하기", description: "경매 저장", group: "feature" },
  { slug: "f8", file: "specs/F8-마이페이지.md", title: "F8. 마이페이지", description: "프로필 + 탭 3개", group: "feature" },
  { slug: "f9", file: "specs/F9-알림.md", title: "F9. 알림", description: "서비스 내 알림", group: "feature" },
  { slug: "f10", file: "specs/F10-인증.md", title: "F10. 인증", description: "소셜 로그인 · 가입 · 로그아웃", group: "feature" },
  { slug: "f11", file: "specs/F11-온보딩.md", title: "F11. 온보딩", description: "첫 방문자 안내", group: "feature" },
  { slug: "f12", file: "specs/F12-배송지-관리.md", title: "F12. 배송지 관리", description: "배송지 등록 · 수정 (1개)", group: "feature" },
];

/** 문서 안 상대 링크(`./F5-낙찰.md`)가 배포 경로(`/docs/f5`)로 이어지게 한다 */
const SLUG_MAP: SlugMap = Object.fromEntries(
  DOCS.map((d) => [path.basename(d.file), d.slug]),
);

export function findDoc(slug: string): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** 빌드 시점에 원본을 읽어 HTML 로 바꾼다 */
export async function renderDoc(entry: DocEntry): Promise<string> {
  const source = await readFile(
    path.join(process.cwd(), "docs", entry.file),
    "utf-8",
  );
  return renderMarkdown(source, SLUG_MAP);
}
