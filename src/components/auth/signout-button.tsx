import { ROUTES } from "@/lib/routes";

/**
 * 로그아웃 (F10 3.7). 폼 POST 라 자바스크립트 없이도 동작한다.
 *
 * 마이페이지 하단에 둔다 (F8). 서버 컴포넌트에서 그대로 쓸 수 있다.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className={
          className ??
          "w-full py-4 text-left text-body text-text-secondary hover:text-text-primary"
        }
      >
        로그아웃
      </button>
      <input type="hidden" name="next" value={ROUTES.entry} />
    </form>
  );
}
