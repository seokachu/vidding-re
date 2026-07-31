import { Avatar, InlineRetry, ListRow } from "@/components/ui";
import { formatPoint } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { Address } from "@/lib/supabase/database.types";
import type { MyProfile, Result } from "./types";

/**
 * 프로필 영역 (F8 3.1 · 3.2) — 별도 메뉴 페이지가 없으므로 여기가 전부다 (F8 5-5).
 *
 * 담는 것: 아바타 · 닉네임 · 활동 한 줄 · 보유 포인트 · 배송지.
 *
 * 담지 않는 것:
 * - **이메일** — 화면에서 하는 일이 없다 (F8 3.2)
 * - **역할 뱃지** — 사용자 유형 개념이 존재하지 않는다 (F8 5-4)
 */
export function ProfileSection({
  profile,
  address,
  auctionCount,
  episodeCount,
}: {
  profile: Result<MyProfile>;
  address: Result<Address | null>;
  /** 조회에 실패했으면 `null`. 실패한 수를 0 으로 적지 않는다 */
  auctionCount: number | null;
  episodeCount: number | null;
}) {
  return (
    <section>
      <div className="flex items-center gap-[14px] px-gutter pb-5 pt-[14px]">
        {profile.ok ? (
          <>
            <Avatar
              src={profile.data.avatarUrl}
              nickName={profile.data.nickName}
              size={56}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="truncate text-title font-bold text-text-primary">
                {profile.data.nickName}
              </p>

              {auctionCount !== null && episodeCount !== null && (
                <p className="tabular text-caption text-text-secondary">
                  경매 {auctionCount} · 사연 {episodeCount}
                </p>
              )}
            </div>
          </>
        ) : (
          // 프로필만 실패했다. 아래 탭은 그대로 동작한다 (F8 4)
          <InlineRetry message="프로필을 불러오지 못했어요" />
        )}
      </div>

      <div className="px-gutter">
        <ListRow
          label="보유 포인트"
          href={ROUTES.points}
          // 실패를 0 P 로 적지 않는다. 잔액을 잘못 알리는 것이 모르는 것보다 나쁘다 (F8 4)
          tone={profile.ok ? "default" : "muted"}
          value={
            profile.ok ? formatPoint(profile.data.pointBalance) : "불러오지 못했어요"
          }
        />

        <ListRow
          label="배송지"
          href={ROUTES.address}
          // 미등록은 오류가 아니라 상태다. 조회 실패와 서로 다른 문구를 쓴다 (F8 4)
          tone={address.ok && address.data ? "default" : "muted"}
          value={
            !address.ok
              ? "불러오지 못했어요"
              : address.data
                ? "등록됨"
                : "미등록"
          }
        />
      </div>
    </section>
  );
}
