import { ErrorState, TopAppBar } from "@/components/ui";

/**
 * 조회 실패 화면. 상단 바 + 실패 안내로 화면 하나를 채운다.
 *
 * **어떤 액션 버튼도 노출하지 않는다** (00-관계-판정 4). 경매를 읽지 못하면
 * 관계를 판정할 수 없고, 관계를 모르면 무엇을 허용할지도 알 수 없다.
 *
 * 재시도는 `ErrorState` 의 기본 동작(화면 새로고침)에 맡긴다.
 */
export function ErrorScreen({
  title = "",
  description = "경매 정보를 불러오지 못했어요.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <>
      <TopAppBar title={title} />
      <main className="flex flex-1 items-center">
        <ErrorState description={description} />
      </main>
    </>
  );
}
