import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "디자인 시안 · Vidding 문서",
  description:
    "Pencil .pen 시안 — 화면 29장을 서비스 여정 순서로, 디자인 시스템 4장과 함께",
};

/** 화면 시안은 전부 390px 기준을 2배로 내보낸 것이라 폭이 같다 */
const SCREEN_WIDTH = 780;

type Shot = {
  file: string;
  /** 내보낸 이미지의 실제 픽셀 높이 — 로딩 중 레이아웃이 밀리지 않게 한다 */
  height: number;
  code: string;
  title: string;
};

/** 서비스 여정 순서. 화면 코드는 기능명세서 §4 화면 목록과 같다 */
const FLOWS: { title: string; note: string; shots: Shot[] }[] = [
  {
    title: "0. 설치 · 스플래시",
    note: "웹을 홈 화면에 설치하도록 배너로 이끌고, 설치된 앱은 스플래시로 뜬다",
    shots: [
      { file: "s01b-home-install-banner", height: 1966, code: "S01b", title: "홈 · 설치 배너" },
      { file: "s00-splash", height: 1688, code: "S00", title: "스플래시" },
    ],
  },
  {
    title: "1. 온보딩 · 로그인",
    note: "로그인 전 3장으로 규칙을 익히고, 구글 · 카카오로 들어온다",
    shots: [
      { file: "s12-1-onboarding", height: 1468, code: "S12-1", title: "온보딩 · 사연으로 입찰" },
      { file: "s12-2-onboarding", height: 1696, code: "S12-2", title: "온보딩 · 참여 방식" },
      { file: "s12-3-onboarding", height: 1872, code: "S12-3", title: "온보딩 · 낙찰 규칙" },
      { file: "s13-login", height: 1338, code: "S13", title: "로그인" },
    ],
  },
  {
    title: "2. 홈 · 탐색",
    note: "홈은 최신 경매를, 목록은 검색과 정렬(최신 · 마감 임박 · 사연 많은 순)을 담는다",
    shots: [
      { file: "s01-home", height: 1966, code: "S01", title: "홈" },
      { file: "s02-explore", height: 1816, code: "S02", title: "경매 탐색" },
    ],
  },
  {
    title: "3. 경매 상세 — 관계별",
    note: "같은 라우트가 나와 경매의 관계에 따라 셋으로 갈린다. 마감 후에는 유찰 화면이 있다",
    shots: [
      { file: "s03-detail-visitor", height: 2570, code: "S03", title: "경매 상세 · 방문자" },
      { file: "s03b-detail-participant", height: 3330, code: "S03b", title: "경매 상세 · 참여자" },
      { file: "s04-detail-host", height: 2756, code: "S04", title: "경매 상세 · 주최자" },
      { file: "s03c-detail-failed", height: 2104, code: "S03c", title: "경매 상세 · 유찰" },
    ],
  },
  {
    title: "4. 사연 작성 · 경매 등록",
    note: "사연과 포인트로 입찰하고, 주최자는 사진 · 제목 · 기간으로 경매를 연다",
    shots: [
      { file: "s05-story-bid", height: 1972, code: "S05", title: "사연 작성 · 입찰" },
      { file: "s06-auction-write", height: 1670, code: "S06", title: "경매 등록" },
      { file: "s06b-auction-edit", height: 1418, code: "S06b", title: "경매 수정" },
    ],
  },
  {
    title: "5. 낙찰 · 채팅",
    note: "낙찰이 확정되면 주최자와 낙찰자의 1:1 채팅이 열린다",
    shots: [
      { file: "s09-winner", height: 2178, code: "S09", title: "낙찰 결과" },
      { file: "s10-chat", height: 1600, code: "S10", title: "채팅" },
      { file: "s10b-chat-failed", height: 1450, code: "S10b", title: "채팅 · 전송 실패" },
      { file: "s16-chat-list", height: 748, code: "S16", title: "채팅 목록" },
      { file: "s16b-chat-list-empty", height: 948, code: "S16b", title: "채팅 목록 · 빈 상태" },
    ],
  },
  {
    title: "6. 마이페이지 · 포인트 · 배송지",
    note: "프로필과 탭 3개(내 경매 · 내 사연 · 찜), 포인트 원장과 배송지 1건",
    shots: [
      { file: "s07-mypage", height: 1506, code: "S07", title: "마이페이지" },
      { file: "s07b-mypage-logout", height: 1506, code: "S07b", title: "로그아웃 확인" },
      { file: "s07c-mypage-stories", height: 1762, code: "S07c", title: "내 사연" },
      { file: "s14-mypage-empty", height: 1612, code: "S14", title: "마이페이지 · 빈 상태" },
      { file: "s14b-mypage-stories-empty", height: 1612, code: "S14b", title: "내 사연 · 빈 상태" },
      { file: "s15-points", height: 1060, code: "S15", title: "포인트 내역" },
      { file: "s11-address", height: 1362, code: "S11", title: "배송지 관리" },
    ],
  },
  {
    title: "7. 알림",
    note: "마감 임박 · 새 사연 · 낙찰 결과 · 새 메시지. 목록을 열면 읽음이 된다",
    shots: [
      { file: "s08-notifications", height: 1654, code: "S08", title: "알림" },
      { file: "s08b-notifications-empty", height: 1156, code: "S08b", title: "알림 · 빈 상태" },
    ],
  },
];

/** 디자인 시스템 보드 — 시안과 같은 .pen 안에 있다. 폭 1040px 기준 2배 */
const SYSTEM: { file: string; height: number; title: string; note: string }[] = [
  {
    file: "ds-00-overview",
    height: 2354,
    title: "00 개요",
    note: "디자인 원칙 — 관계로 판단한다 · 시각 언어는 한 벌 · 레드는 경고에만 — 과 화면 지도",
  },
  {
    file: "ds-01-color",
    height: 3504,
    title: "01 컬러 파운데이션",
    note: "잉크 블루 · 레드 · 남색 틴트 회색 스케일과 시맨틱 토큰",
  },
  {
    file: "ds-02-typography",
    height: 3350,
    title: "02 타이포그래피",
    note: "Pretendard 한 서체 · 타입 스케일 7단 · 숫자 표기 규칙",
  },
  {
    file: "ds-03-components",
    height: 6570,
    title: "03 공통 UI 컴포넌트",
    note: "버튼 · 배지 · 입력 · 스테퍼 · 카드 · 다이얼로그 등 9묶음의 상태별 정의",
  },
];

/**
 * 디자인 시안 갤러리. 다른 문서와 달리 마크다운이 아니라 이미지가 본문이라
 * 전용 페이지로 그린다. 원본은 `design/design.pen` 하나고, 여기 실린 이미지는
 * 그 파일에서 2배로 내보낸 것이다 (`public/design/`).
 */
export default function DesignPreviewPage() {
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
          디자인 시안
        </h1>
      </header>

      <div className="flex flex-col gap-10 px-gutter pt-5">
        <p className="text-caption leading-relaxed text-text-secondary">
          Pencil <code className="rounded-sm bg-surface-sunken px-1">.pen</code>{" "}
          단일 파일로 그린 시안 — 잉크 블루{" "}
          <code className="rounded-sm bg-surface-sunken px-1">#1D48B0</code> ·
          Pretendard · 390px 기준. 화면 29장을 서비스 여정 순서로 싣고, 뒤에
          디자인 시스템 4장을 붙인다. 이미지를 누르면 원본 크기로 열린다.
        </p>

        <section className="flex flex-col gap-8">
          <h2 className="border-b border-border pb-2 text-title font-bold text-text-primary">
            화면 플로우
          </h2>
          {FLOWS.map((flow) => (
            <section key={flow.title} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-subtitle font-bold text-text-primary">
                  {flow.title}
                </h3>
                <p className="text-caption text-text-secondary">{flow.note}</p>
              </div>
              <div className="grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:grid-cols-3">
                {flow.shots.map((shot) => {
                  const src = `/design/${shot.file}.webp`;
                  return (
                    <figure key={shot.file} className="flex min-w-0 flex-col gap-2">
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener"
                        className="overflow-hidden rounded-md border border-border"
                      >
                        <Image
                          src={src}
                          alt={`${shot.code} ${shot.title}`}
                          width={SCREEN_WIDTH}
                          height={shot.height}
                          sizes="(min-width: 640px) 270px, 45vw"
                          className="h-auto w-full"
                        />
                      </a>
                      <figcaption className="text-label leading-normal text-text-secondary">
                        <span className="font-semibold text-text-primary">
                          {shot.code}
                        </span>{" "}
                        {shot.title}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ))}
        </section>

        <section className="flex flex-col gap-8">
          <h2 className="border-b border-border pb-2 text-title font-bold text-text-primary">
            디자인 시스템
          </h2>
          {SYSTEM.map((board) => {
            const src = `/design/${board.file}.webp`;
            return (
              <section key={board.file} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-subtitle font-bold text-text-primary">
                    {board.title}
                  </h3>
                  <p className="text-caption text-text-secondary">{board.note}</p>
                </div>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener"
                  className="overflow-hidden rounded-md border border-border"
                >
                  <Image
                    src={src}
                    alt={board.title}
                    width={2080}
                    height={board.height}
                    sizes="(min-width: 940px) 820px, 100vw"
                    className="h-auto w-full"
                  />
                </a>
              </section>
            );
          })}
        </section>

        <footer className="border-t border-border pt-4 text-label text-text-tertiary">
          디자인 · Seoyoung Park — 원본은 저장소의{" "}
          <code className="rounded-sm bg-surface-sunken px-1">
            design/design.pen
          </code>{" "}
          하나다.
        </footer>
      </div>
    </>
  );
}
