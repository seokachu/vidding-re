import "./docs.css";

/**
 * `/docs` — 기획 문서 아카이브 (기능명세서 · PRD · 데이터 모델 · 기능 스펙).
 *
 * **로그인 없이 열린다** (`routes.ts` PUBLIC). 과제 · 포트폴리오 열람용이라
 * 서비스 셸(하단 탭)을 쓰지 않고 문서만 담백하게 그린다.
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // data-docs-shell — docs.css 가 이 표식으로 앱 셸(390px)을 문서 폭으로 넓힌다
  return (
    <div data-docs-shell className="flex-1 pb-16">
      {children}
    </div>
  );
}
