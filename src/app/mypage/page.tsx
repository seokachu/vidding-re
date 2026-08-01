import type { Metadata } from "next";
import { FilePen, Heart, Package, Plus, Search } from "lucide-react";

import { SignOutButton } from "@/components/auth/signout-button";
import { TabShell } from "@/components/layout/tab-shell";
import { AuctionCard, ButtonLink, EmptyState, ErrorState } from "@/components/ui";
import { requireAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { FavoriteButton } from "@/features/explore";
import { MyEpisodeCard } from "@/features/mypage/my-episode-card";
import { MypageTabs } from "@/features/mypage/mypage-tabs";
import { parseTab } from "@/features/mypage/tabs";
import { ProfileSection } from "@/features/mypage/profile-section";
import {
  getMyAddress,
  getMyAuctions,
  getMyEpisodes,
  getMyFavorites,
  getMyProfile,
} from "@/features/mypage/queries";
import type { Result } from "@/features/mypage/types";

export const metadata: Metadata = { title: "마이페이지 · Vidding" };

/**
 * S07 / S14 / S14b — 마이페이지 (F8).
 *
 * 화면은 **프로필 영역 + 탭 3개**가 전부다. 별도 메뉴 목록 페이지를 두지 않는다 (F8 5-5).
 *
 * 다섯 영역(프로필 · 배송지 · 탭 3개)을 **따로 조회해 따로 실패시킨다.**
 * `Promise.all` 로 함께 기다리되 각 조회가 예외 대신 `Result` 를 돌려주므로,
 * 하나가 실패해도 나머지는 그대로 그려진다 (F8 5-9).
 */
export default async function MyPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 프록시가 이미 걸러내지만 서버에서도 확인한다. 세션이 만료됐다면
  // 만료된 정보를 화면에 남기지 않고 로그인으로 보낸다 (F8 4)
  const user = await requireAuthUser(ROUTES.mypage);

  const [{ tab }, profile, address, auctions, episodes, favorites] =
    await Promise.all([
      props.searchParams.then((params) => ({ tab: parseTab(params.tab) })),
      getMyProfile(user.id),
      getMyAddress(),
      getMyAuctions(user.id),
      getMyEpisodes(user.id),
      getMyFavorites(),
    ]);

  return (
    <TabShell title="마이페이지">
      <ProfileSection
        profile={profile}
        address={address}
        auctionCount={auctions.ok ? auctions.data.length : null}
        episodeCount={episodes.ok ? episodes.data.length : null}
      />

      {/* 프로필 행과 탭 사이. 탭 내용 아래에 두면 탭마다 자리가 달라진다 (.pen S07) */}
      <div className="px-gutter pt-5">
        <SignOutButton />
      </div>

      <MypageTabs
        initialTab={tab}
        auctions={
          <Panel
            result={auctions}
            empty={
              <EmptyState
                icon={Package}
                title="아직 연 경매가 없어요"
                description={"안 쓰는 물건을 올리면\n누군가의 사연이 도착합니다"}
                action={
                  <ButtonLink href={ROUTES.auctionWrite}>
                    <Plus size={18} />
                    경매 등록
                  </ButtonLink>
                }
              />
            }
            render={(items) => (
              <ul className="flex flex-col gap-3">
                {items.map((auction) => (
                  <li key={auction.auction_id}>
                    <AuctionCard auction={auction} />
                  </li>
                ))}
              </ul>
            )}
          />
        }
        episodes={
          <Panel
            result={episodes}
            empty={
              <EmptyState
                icon={FilePen}
                title="아직 쓴 사연이 없어요"
                description={"마음이 가는 물건에 사연을 쓰면\n여기에 모입니다"}
                action={
                  <ButtonLink href={ROUTES.auctions}>
                    <Search size={18} />
                    경매 둘러보기
                  </ButtonLink>
                }
              />
            }
            render={(items) => (
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.episodeId}>
                    <MyEpisodeCard item={item} />
                  </li>
                ))}
              </ul>
            )}
          />
        }
        favorites={
          <Panel
            result={favorites}
            empty={
              <EmptyState
                icon={Heart}
                title="찜한 경매가 없어요"
                description={"눈에 담아둔 물건을 찜해두면\n여기서 다시 찾습니다"}
                action={
                  <ButtonLink href={ROUTES.auctions}>
                    <Search size={18} />
                    경매 둘러보기
                  </ButtonLink>
                }
              />
            }
            render={(items) => (
              <ul className="flex flex-col gap-3">
                {items.map((auction) => (
                  <li key={auction.auction_id}>
                    <AuctionCard
                      auction={auction}
                      trailing={
                        <FavoriteButton auctionId={auction.auction_id} favorited />
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          />
        }
      />
    </TabShell>
  );
}

/**
 * 탭 하나의 내용. **내역 없음과 조회 실패를 서로 다른 화면으로** 가른다 (F8 5-8).
 *
 * 빈 상태에는 다음 행동 경로를 함께 준다. 실패에는 재시도를 준다.
 * 둘을 같은 화면으로 그리면 사용자가 "없는 것"과 "못 본 것"을 구분하지 못한다.
 */
function Panel<T>({
  result,
  empty,
  render,
}: {
  result: Result<T[]>;
  empty: React.ReactNode;
  render: (items: T[]) => React.ReactNode;
}) {
  if (!result.ok) {
    return (
      <ErrorState description="목록을 불러오지 못했어요. 다른 탭은 그대로 볼 수 있어요" />
    );
  }

  return result.data.length === 0 ? empty : render(result.data);
}
