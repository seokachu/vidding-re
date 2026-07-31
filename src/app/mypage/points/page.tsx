import type { Metadata } from "next";
import { Coins } from "lucide-react";

import { EmptyState, TopAppBar } from "@/components/ui";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { PointList } from "@/features/mypage/point-list";
import { getMyPoints } from "@/features/mypage/queries";
import { RetryErrorState } from "@/features/mypage/retry";

export const metadata: Metadata = { title: "포인트 내역 · Vidding" };

/**
 * 포인트 내역 (F8 3.6).
 *
 * 프로필의 보유 포인트를 눌러 들어온다. **시간순 목록 하나뿐이다** —
 * 필터도 검색도 기간 선택도 없다.
 *
 * 탭 화면이 아니므로 `TabShell` 이 아니라 `TopAppBar` 를 쓴다.
 */
export default async function PointsPage() {
  await requireAuthUser(ROUTES.points);

  const points = await getMyPoints();

  return (
    <>
      <TopAppBar title="포인트 내역" />

      <main className="flex-1 px-gutter pb-10">
        {!points.ok ? (
          <RetryErrorState description="포인트 내역을 불러오지 못했어요" />
        ) : points.data.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="포인트 내역이 없어요"
            description={"사연에 포인트를 걸거나 낙찰되면\n여기에 쌓입니다"}
          />
        ) : (
          <PointList items={points.data} />
        )}
      </main>
    </>
  );
}
