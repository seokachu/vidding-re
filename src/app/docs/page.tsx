import { ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";

import { DOCS } from "@/lib/docs";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "문서 · Vidding",
  description: "Vidding 기능명세서 아카이브 — 설계(v1.0)와 현행(v2.0)을 모두 보존한다",
};

/** 서비스가 걸어온 길. 자세한 내용은 기능명세서 §7 이 원본이다 */
const VERSIONS = [
  { v: "v1.0", date: "07-31", status: "설계", note: "PRD · 데이터 모델 · 기능 스펙 13건 확정" },
  { v: "v1.1", date: "08-01", status: "구현", note: "전 화면 구현 · Vercel 배포 · 백엔드 검증" },
  { v: "v1.2", date: "08-02", status: "검증", note: "시안 21화면 배포본 1:1 대조" },
  { v: "v2.0", date: "08-03", status: "확장", note: "웹 푸시 (VAPID · Vault · 트리거)" },
  { v: "v2.1", date: "08-04", status: "확장", note: "하이브리드 앱 · 실시간 배지 · 채팅 목록" },
  { v: "v2.2", date: "08-05", status: "현행", note: "As-Built 기능명세서 · /docs 공개" },
] as const;

/**
 * 문서 아카이브 허브. **설계와 현행을 나란히 보존하는 것**이 목적이다 —
 * 설계 문서(v1.0)는 고쳐 쓰지 않고, 달라진 것은 기능명세서 §6 이 기록한다.
 */
export default function DocsPage() {
  const spec = DOCS.find((d) => d.group === "current")!;
  const plans = DOCS.filter((d) => d.group === "plan");
  const features = DOCS.filter((d) => d.group === "feature");

  return (
    <>
      <header className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-border bg-bg px-gutter">
        <h1 className="text-title font-bold text-text-primary">문서</h1>
        <Link
          href={ROUTES.home}
          className="text-caption font-semibold text-accent-text underline underline-offset-2"
        >
          서비스 열기
        </Link>
      </header>

      <div className="flex flex-col gap-8 px-gutter pt-5">
        <p className="text-caption leading-relaxed text-text-secondary">
          <strong className="font-semibold text-text-primary">
            사연으로 입찰하는 경매, Vidding
          </strong>
          의 기획 문서 아카이브입니다. 설계 시점 문서(v1.0)는 고쳐 쓰지 않고
          그대로 보존하며, 구현하면서 달라진 것은 현행 기능명세서가 기록합니다.
        </p>

        {/* 현행 명세 — 이 아카이브의 대표 문서라 accent 로 세운다 */}
        <Link
          href={`/docs/${spec.slug}`}
          className="flex items-start justify-between gap-3 rounded-md bg-accent p-[18px] text-text-on-accent"
        >
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-subtitle font-bold">
              <FileText size={18} />
              {spec.title}
            </span>
            <span className="text-caption leading-relaxed opacity-85">
              {spec.description}
            </span>
            <span className="mt-2 text-caption font-semibold">문서 보기 →</span>
          </span>
        </Link>

        <section className="flex flex-col gap-3">
          <h2 className="text-subtitle font-bold text-text-primary">
            설계 문서 <span className="font-medium text-text-tertiary">v1.0</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {plans.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={`/docs/${doc.slug}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-[14px] hover:bg-surface"
                >
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-caption font-semibold text-text-primary">
                      {doc.title}
                    </span>
                    <span className="text-label leading-normal text-text-secondary">
                      {doc.description}
                    </span>
                  </span>
                  <ArrowUpRight size={16} className="shrink-0 text-text-tertiary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-subtitle font-bold text-text-primary">
            기능별 스펙{" "}
            <span className="font-medium text-text-tertiary">13건</span>
          </h2>
          <ul className="overflow-hidden rounded-md border border-border">
            {features.map((doc) => (
              <li key={doc.slug} className="border-b border-border last:border-b-0">
                <Link
                  href={`/docs/${doc.slug}`}
                  className="flex items-center justify-between gap-3 px-[14px] py-3 hover:bg-surface"
                >
                  <span className="min-w-0 truncate text-caption font-medium text-text-primary">
                    {doc.title}
                  </span>
                  <span className="shrink-0 text-label text-text-tertiary">
                    {doc.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-subtitle font-bold text-text-primary">버전 기록</h2>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-label">
              <thead>
                <tr className="bg-surface text-left">
                  <th className="px-3 py-2 font-semibold">버전</th>
                  <th className="px-3 py-2 font-semibold">일자</th>
                  <th className="px-3 py-2 font-semibold">상태</th>
                  <th className="px-3 py-2 font-semibold">요약</th>
                </tr>
              </thead>
              <tbody>
                {VERSIONS.map((row) => (
                  <tr key={row.v} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-text-primary">
                      {row.v}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                      {row.date}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={
                          row.status === "현행"
                            ? "font-semibold text-accent-text"
                            : "text-text-secondary"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 leading-relaxed text-text-secondary">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-label text-text-tertiary">2026년 기준.</p>
        </section>

        <footer className="border-t border-border pt-4 text-label text-text-tertiary">
          Vidding · Seoyoung Park ·{" "}
          <a
            href="https://github.com/seokachu/vidding-re"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            GitHub
          </a>
        </footer>
      </div>
    </>
  );
}
