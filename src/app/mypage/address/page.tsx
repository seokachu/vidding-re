import type { Metadata } from "next";

import { ErrorState, TopAppBar } from "@/components/ui";
import { requireAuthUser } from "@/lib/auth";
import { isSafeReturnTo, ROUTES } from "@/lib/routes";
import { AddressForm } from "@/features/mypage/address-form";
import { getMyAddress } from "@/features/mypage/queries";

export const metadata: Metadata = { title: "배송지 · Vidding" };

/**
 * S11 — 배송지 등록·수정 (F12).
 *
 * 화면이 하나뿐이다. 사용자당 배송지가 1개라 목록도 기본 배송지 지정도 없고,
 * 이미 있으면 **수정 화면으로 열린다** (F12 3.3 · 4).
 *
 * `?next=` 는 배송지가 없어 끊긴 흐름의 복귀 지점이다. 경매를 열려다 여기로
 * 온 사용자를 저장 후 그 자리로 되돌린다 (F12 3.4).
 */
export default async function AddressPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAuthUser(ROUTES.address);

  const [{ next }, address] = await Promise.all([
    props.searchParams.then((params) => ({
      next: typeof params.next === "string" ? params.next : undefined,
    })),
    getMyAddress(),
  ]);

  // 조회 실패를 미등록으로 위장하지 않는다. 위장하면 사용자가 이미 있는 배송지
  // 위에 다시 쓰게 되고, 저장이 성공해도 이전 값이 사라진다 (F12 4)
  if (!address.ok) {
    return (
      <>
        <TopAppBar title="배송지" />
        <main className="flex-1">
          <ErrorState description="배송지를 불러오지 못했어요" />
        </main>
      </>
    );
  }

  return (
    <AddressForm
      address={address.data}
      next={isSafeReturnTo(next) ? next : undefined}
    />
  );
}
