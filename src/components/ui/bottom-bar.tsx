import { cn } from "@/lib/cn";

/**
 * 하단 고정 바의 껍데기. 탭이 붙지 않는 화면의 액션 자리다.
 *
 * 경매 상세(관계별 액션) · 사연 작성 · 경매 등록 · 배송지가 같은 자리를 쓴다.
 * 화면마다 여백이 달라지면 옮겨 다닐 때 버튼이 흔들린다.
 *
 * 서버·클라이언트 양쪽에서 쓰므로 지시어도 서버 전용 import 도 두지 않는다.
 */
export function BottomBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 mt-6 border-t border-border bg-bg px-gutter pt-[14px] pb-[22px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
