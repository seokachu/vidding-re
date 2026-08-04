import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DOCS, findDoc, renderDoc } from "@/lib/docs";

/** 목록에 없는 slug 는 404 — 전부 빌드 시점에 정적으로 굽는다 */
export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findDoc(slug);
  return {
    title: doc ? `${doc.title} · Vidding 문서` : "문서 · Vidding",
    description: doc?.description,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();

  const html = await renderDoc(doc);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-13 items-center gap-1 border-b border-border bg-bg px-2">
        <Link
          href="/docs"
          aria-label="문서 목록으로"
          className="flex size-10 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="min-w-0 truncate text-body font-bold text-text-primary">
          {doc.title}
        </h1>
      </header>

      {/*
        저장소의 마크다운을 우리 렌더러(lib/markdown)로 빌드 시점에 변환한 것이다.
        입력이 저장소 문서뿐이라 innerHTML 이어도 안전하다 — 사용자 입력이 아니다.
      */}
      <article
        className="docs-prose px-gutter pt-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
