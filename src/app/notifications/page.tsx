import { BellOff } from "lucide-react";

import { TabShell } from "@/components/layout/tab-shell";
import { ButtonLink, EmptyState } from "@/components/ui";
import { NotificationList } from "@/features/notify/notification-list";
import { RetryState } from "@/features/notify/retry-state";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "알림 · Vidding" };

/**
 * S08 · S08b — 알림 목록 (F9).
 *
 * 비회원에게는 알림 기능을 노출하지 않는다 (F9 4). 프록시가 먼저 거르지만,
 * 서버 컴포넌트에서도 직접 확인한다 — 판정은 서버가 최종이다.
 *
 * **0건과 조회 실패를 다른 화면으로 구분한다** (F9 5-7).
 * 실패를 빈 목록으로 위장하면 사용자는 알림이 없다고 믿는다.
 */
export default async function NotificationsPage() {
  const user = await requireAuthUser(ROUTES.notifications);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TabShell title="알림">
      {error ? (
        <RetryState description={"알림을 불러오지 못했어요.\n잠시 후 다시 시도해주세요"} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="아직 받은 알림이 없어요"
          description={"경매에 참여하면 마감과 낙찰 소식을\n여기로 알려드려요"}
          action={
            <ButtonLink href={ROUTES.auctions} variant="secondary">
              경매 둘러보기
            </ButtonLink>
          }
        />
      ) : (
        <NotificationList items={data} />
      )}
    </TabShell>
  );
}
