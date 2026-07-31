/**
 * 클래스 문자열을 합친다. `false` · `null` · `undefined` 는 버린다.
 *
 * 병합 규칙(뒤에 온 `p-4` 가 앞의 `p-2` 를 이긴다)은 없다. 필요하면 조건식으로
 * 한쪽만 넘긴다 — 규칙을 넣으려고 의존성을 하나 더 들이지는 않는다.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
