/**
 * Supabase 접속 정보.
 *
 * 값이 없으면 조용히 실패하는 대신 **바로 던진다.** 키가 빠진 채로 뜬 앱은
 * 모든 조회가 401 로 돌아와, 원인이 화면 어디에도 드러나지 않는다.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `환경 변수 ${name} 가 없습니다. .env.example 을 참고해 .env.local 을 채워주세요.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
