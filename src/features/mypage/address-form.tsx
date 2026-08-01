"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useActionState, useCallback, useState, useTransition } from "react";

import {
  Button,
  ConfirmDialog,
  FieldShell,
  TextField,
  TopAppBar,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Address } from "@/lib/supabase/database.types";
import { deleteAddress, saveAddress, type AddressFormState } from "./actions";
import { AddressSearch, type SelectedAddress } from "./address-search";

/**
 * 배송지 등록·수정 (S11 · F12).
 *
 * **등록과 수정이 같은 화면이다.** 사용자당 배송지가 1개라 목록도 기본 배송지도
 * 없고, 이미 있으면 수정만 된다 (F12 3.3).
 *
 * 입력값을 전부 이 컴포넌트가 들고 있는다. 서버 액션이 실패하면 React 가
 * 폼을 초기화하는데, 그러면 "실패 시 입력값을 유지한다"(F12 5-8)가 깨진다.
 */
const READONLY_BOX =
  "w-full rounded-md bg-surface px-[15px] py-[14px] text-body text-text-primary " +
  "placeholder:text-text-tertiary focus:outline-none";

export function AddressForm({
  address,
  next,
}: {
  address: Address | null;
  /** 배송지가 없어 끊긴 흐름으로 되돌아갈 자리 (F12 3.4) */
  next?: string;
}) {
  const [state, formAction, saving] = useActionState<AddressFormState, FormData>(
    saveAddress,
    {},
  );

  const [recipient, setRecipient] = useState(address?.recipient ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [address2, setAddress2] = useState(address?.address2 ?? "");
  const [picked, setPicked] = useState<SelectedAddress>({
    zipcode: address?.zipcode ?? "",
    address1: address?.address1 ?? "",
  });

  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteMessage, setDeleteMessage] = useState<string>();

  // 검색창이 스스로 다시 그려지지 않도록 참조를 고정한다.
  // 부모가 (글자를 칠 때마다) 다시 그려져도 검색 결과 목록이 날아가면 안 된다
  const closeSearch = useCallback(() => setSearching(false), []);

  const notice = deleteMessage ?? state.message;

  function remove() {
    setConfirming(false);
    setDeleteMessage(undefined);

    startDelete(async () => {
      // 성공하면 서버 액션이 마이페이지로 보낸다. 여기로 돌아오면 실패한 것이다
      const result = await deleteAddress();
      setDeleteMessage(result?.message);
    });
  }

  return (
    <>
      <TopAppBar
        title="배송지"
        action={
          address && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={deleting}
              aria-label="배송지 삭제"
              aria-haspopup="dialog"
              className="flex size-10 items-center justify-center rounded-sm text-text-secondary hover:bg-surface disabled:text-text-tertiary"
            >
              <Trash2 size={20} />
            </button>
          )
        }
      />

      <form action={formAction} className="flex flex-1 flex-col">
        <input type="hidden" name="next" value={next ?? ""} />

        <div className="flex flex-1 flex-col gap-5 px-gutter pt-5">
          {notice && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-[10px] text-caption text-warning-text"
            >
              <TriangleAlert size={16} className="mt-[3px] shrink-0" />
              {notice}
            </p>
          )}

          <TextField
            id="recipient"
            name="recipient"
            label="받는 사람"
            required
            maxLength={50}
            autoComplete="name"
            placeholder="받는 분의 이름"
            helper="50자까지 쓸 수 있어요"
            error={state.errors?.recipient}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />

          <TextField
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            label="연락처"
            required
            maxLength={50}
            autoComplete="tel"
            placeholder="010-0000-0000"
            helper="배송 때 연락할 번호예요"
            error={state.errors?.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <FieldShell
            label="주소"
            required
            error={state.errors?.address}
            helper="우편번호와 기본 주소는 주소 검색으로만 입력돼요. 전달 실패를 막기 위한 규칙이에요"
          >
            <div className="flex w-full flex-col gap-[9px]">
              <div className="flex w-full items-stretch gap-[9px]">
                <input
                  name="zipcode"
                  readOnly
                  value={picked.zipcode}
                  placeholder="우편번호"
                  aria-label="우편번호"
                  className={cn(
                    READONLY_BOX,
                    "min-w-0 flex-1",
                    state.errors?.address && "ring-1 ring-warning",
                  )}
                />

                <Button
                  variant="primary"
                  onClick={() => setSearching(true)}
                  className="shrink-0 px-4 py-[14px] text-caption"
                >
                  주소 검색
                </Button>
              </div>

              <input
                name="address1"
                readOnly
                value={picked.address1}
                placeholder="기본 주소"
                aria-label="기본 주소"
                className={cn(
                  READONLY_BOX,
                  state.errors?.address && "ring-1 ring-warning",
                )}
              />

              <input
                id="address2"
                name="address2"
                maxLength={100}
                placeholder="상세 주소를 입력하세요"
                aria-label="상세 주소"
                autoComplete="address-line2"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-bg px-[15px] py-[14px] text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </FieldShell>
        </div>

        <div className="sticky bottom-0 mt-7 border-t border-border bg-bg px-gutter pb-[22px] pt-[14px]">
          <Button
            type="submit"
            block
            // 처리 중에는 다시 누를 수 없다 (F12 4 중복 제출)
            disabled={saving || deleting}
          >
            {saving ? "저장 중…" : "저장하기"}
          </Button>
        </div>
      </form>

      {searching && (
        <AddressSearch onSelect={setPicked} onClose={closeSearch} />
      )}

      <ConfirmDialog
        open={confirming}
        busy={deleting}
        title="배송지를 삭제할까요?"
        description="다음에 경매를 열 때 다시 등록해야 해요."
        onCancel={() => setConfirming(false)}
        confirm={
          <Button className="flex-1" disabled={deleting} onClick={remove}>
            {deleting ? "삭제 중…" : "삭제"}
          </Button>
        }
      />
    </>
  );
}
