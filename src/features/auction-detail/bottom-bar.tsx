/**
 * 하단 고정 바의 껍데기.
 *
 * 상세(관계별 액션) · 사연 작성이 같은 자리를 쓴다. 화면마다 여백이 달라지면
 * 화면을 옮겨 다닐 때 버튼이 흔들린다.
 *
 * 서버·클라이언트 양쪽에서 쓰므로 여기에는 지시어도 서버 전용 import 도 두지 않는다.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-bg px-gutter pt-[14px] pb-[22px]">
      {children}
    </div>
  );
}
