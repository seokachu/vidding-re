import { SearchX } from "lucide-react";

import { ButtonLink, EmptyState, TopAppBar } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 없는 경매 (F3 4.1).
 * 안내만 하고 끝내지 않는다 — **갈 곳을 함께 준다.**
 */
export default function AuctionNotFound() {
  return (
    <>
      <TopAppBar title="" />
      <main className="flex flex-1 items-center">
        <EmptyState
          icon={SearchX}
          title="경매를 찾을 수 없습니다"
          description={"이미 지워졌거나 주소가 잘못됐어요."}
          action={
            <ButtonLink variant="secondary" href={ROUTES.auctions}>
              경매 둘러보기
            </ButtonLink>
          }
        />
      </main>
    </>
  );
}
