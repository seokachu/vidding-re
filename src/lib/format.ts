/**
 * 표시 형식. 화면 네 갈래가 같은 문구를 쓰도록 여기 모아 둔다.
 */

import { ENDING_SOON_MS } from "./constants";

/** `5,000 P` */
export function formatPoint(amount: number): string {
  return `${amount.toLocaleString("ko-KR")} P`;
}

/** 포인트 내역의 부호. 차감은 `−`(빼기 기호), 적립은 `+` (F8 3.6) */
export function formatSignedPoint(amount: number): string {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${Math.abs(amount).toLocaleString("ko-KR")} P`;
}

/**
 * 남은 시간. `6일 4시간 남음` · `2시간 41분` · `마감됨`
 *
 * 마감 처리(크론)가 아직 돌지 않았어도 `end_at` 이 지났으면 마감으로 표시한다
 * (데이터 모델 §9).
 */
export function formatTimeLeft(endAt: string | Date, now: Date = new Date()) {
  const ms = new Date(endAt).getTime() - now.getTime();

  if (ms <= 0) {
    return { text: "마감됨", endingSoon: false, closed: true } as const;
  }

  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text: string;
  if (days > 0) {
    const restHours = hours - days * 24;
    text = restHours > 0 ? `${days}일 ${restHours}시간 남음` : `${days}일 남음`;
  } else if (hours > 0) {
    const restMinutes = minutes - hours * 60;
    text = restMinutes > 0 ? `${hours}시간 ${restMinutes}분` : `${hours}시간`;
  } else {
    text = `${Math.max(minutes, 1)}분`;
  }

  return { text, endingSoon: ms <= ENDING_SOON_MS, closed: false } as const;
}

/** `방금` · `3분 전` · `어제` · `2026. 7. 15.` */
export function formatRelativeTime(at: string | Date, now: Date = new Date()) {
  const then = new Date(at);
  const ms = now.getTime() - then.getTime();
  const minutes = Math.floor(ms / 60_000);

  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;

  return then.toLocaleDateString("ko-KR");
}

/** 닉네임 첫 글자. 아바타 이미지가 없을 때 쓴다 (F8 4) */
export function initialOf(nickName: string | null | undefined): string {
  return nickName?.trim().charAt(0) || "?";
}

/**
 * 배송 정보 한 덩어리. 낙찰자가 채팅으로 보낼 때와 미리보기에 같은 것을 쓴다 (F6 3.6).
 *
 * **줄 나눔이 곧 카드의 행이다.** 이름·연락처 / 주소 / 상세 주소 순서로 세 줄까지
 * 나온다. 카드가 그려지지 않는 경로에서 그냥 텍스트로 읽어도 말이 되어야 하므로,
 * 별도의 직렬화 형식(JSON 등)을 쓰지 않는다.
 */
export function formatShippingInfo(address: {
  recipient: string;
  phone: string;
  zipcode: string;
  address1: string;
  address2?: string | null;
}): string {
  return [
    `${address.recipient} · ${address.phone}`,
    `(${address.zipcode}) ${address.address1}`,
    address.address2?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}
