"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthUser } from "@/lib/auth";
import { formatPhoneInput } from "@/lib/format";
import { ROUTES, resolveReturnTo } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * 배송지 서버 액션 (F12).
 *
 * 서버 함수는 화면을 거치지 않고 POST 로도 호출된다. 프록시가 진입을 막아도
 * 여기서 다시 인증을 확인한다 (`requireAuthUser`). 최종 판정은 RLS 가 한다 —
 * `addresses` 는 전부 본인 행만 열려 있으므로 타인 배송지에 닿을 수 없다 (§6).
 */

export type AddressFormState = {
  /** 항목별 안내. 필수 누락은 제출을 막고 누락 항목을 표시한다 (F12 4) */
  errors?: {
    recipient?: string;
    phone?: string;
    address?: string;
  };
  /** 저장 자체가 실패했을 때. 입력값은 화면이 그대로 들고 있는다 (F12 5-8) */
  message?: string;
};

const MAX_NAME = 50;
const MAX_DETAIL = 100;

/**
 * 등록·수정 하나로 처리한다.
 *
 * 배송지는 사용자당 1개이므로(`UNIQUE (user_id)`) 화면도 하나다.
 * 이미 있으면 수정하고, 없으면 만든다. **추가 등록 진입점을 두지 않는다** (F12 3.3).
 */
export async function saveAddress(
  _prev: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireAuthUser(ROUTES.address);

  const recipient = String(formData.get("recipient") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();

  const errors: NonNullable<AddressFormState["errors"]> = {};

  if (!recipient) errors.recipient = "받는 사람을 입력해주세요";
  else if (recipient.length > MAX_NAME) {
    errors.recipient = `${MAX_NAME}자까지 쓸 수 있어요`;
  }

  // 화면이 숫자만 걸러 하이픈을 끼우지만, 서버 함수는 화면 없이도 호출되므로
  // 여기서 다시 검사한다. 잘못된 번호는 배송 연락 실패로 이어진다 (F12 4)
  const phoneDigits = phone.replace(/\D/g, "");

  // 휴대폰에 배정된 번호대(010·011·016·017·018·019)의 11자리만 받는다.
  // 배송 기사가 걸 번호라, 존재할 수 없는 번호를 받아주면 전달이 실패한다
  if (!phone) errors.phone = "연락처를 입력해주세요";
  else if (!/^01[016789]\d{8}$/.test(phoneDigits)) {
    errors.phone = "휴대폰 번호를 010-0000-0000 형식으로 입력해주세요";
  }

  // 우편번호·기본 주소는 주소 검색 결과로만 채워진다. 비어 있다는 것은
  // 검색을 하지 않았다는 뜻이므로 직접 입력을 권하지 않고 검색으로 안내한다 (F12 4)
  if (!zipcode || !address1) errors.address = "주소 검색으로 주소를 선택해주세요";

  if (address2.length > MAX_DETAIL) {
    errors.address = `상세 주소는 ${MAX_DETAIL}자까지 쓸 수 있어요`;
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("addresses")
    .select("id")
    .maybeSingle();

  if (readError) {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해주세요" };
  }

  const values = {
    recipient,
    // 어떤 모양으로 들어왔든 `010-1234-5678` 로 통일해 저장한다
    phone: formatPhoneInput(phoneDigits),
    zipcode,
    address1,
    address2: address2 || null,
  };

  const { error } = existing
    ? await supabase.from("addresses").update(values).eq("id", existing.id)
    : await supabase.from("addresses").insert({ ...values, user_id: user.id });

  if (error) {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해주세요" };
  }

  revalidatePath(ROUTES.address);
  revalidatePath(ROUTES.mypage);

  // 배송지를 채우려고 다른 화면에서 넘어왔을 수 있다. 그 자리로 되돌린다.
  // 값이 수상하면 홈으로 보낸다 (`resolveReturnTo`). 경매 등록은 더 이상
  // 이 경로로 오지 않지만, 복귀 규격 자체는 남겨 둔다 (F12 3.4)
  const next = formData.get("next");
  redirect(
    typeof next === "string" && next ? resolveReturnTo(next) : ROUTES.mypage,
  );
}

/**
 * 삭제.
 *
 * **경매가 물고 있어도 지울 수 있다** (F12 3.3 개정). 배송지가 등록 요건이던
 * 시절에는 `auctions.address_id` 가 NOT NULL 이라 한 번이라도 경매를 연
 * 배송지는 지워지지 않았다. 이제 그 값은 발송지 스냅샷일 뿐이라
 * `on delete set null` 로 참조만 끊고 경매는 그대로 둔다
 * (`20260802000001_address_optional.sql`).
 */
export async function deleteAddress(): Promise<AddressFormState> {
  const user = await requireAuthUser(ROUTES.address);

  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return { message: "삭제하지 못했어요. 잠시 후 다시 시도해주세요" };
  }

  revalidatePath(ROUTES.address);
  revalidatePath(ROUTES.mypage);
  redirect(ROUTES.mypage);
}
