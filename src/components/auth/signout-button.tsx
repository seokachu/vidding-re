"use client";

import { useState } from "react";

import { Button, ConfirmDialog } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 로그아웃 (F10 3.7). 프로필 행 아래에 둔다 (.pen S07).
 *
 * **폼 POST 라 자바스크립트 없이도 동작한다.** 자바스크립트가 있으면 첫 제출을
 * 가로채 확인을 먼저 묻고 (.pen S07b), 확인 버튼이 같은 폼을 다시 제출한다.
 * 확인을 콜백으로 처리하지 않는 이유가 이것이다 — 스크립트가 죽어도 로그아웃은
 * 되어야 하고, 그 경우엔 묻지 않고 바로 나간다.
 */
export function SignOutButton() {
  const [asking, setAsking] = useState(false);

  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={(event) => {
        // 두 번째 제출은 확인을 거친 것이다. 그대로 보낸다
        if (asking) return;

        event.preventDefault();
        setAsking(true);
      }}
    >
      <input type="hidden" name="next" value={ROUTES.entry} />

      <button
        type="submit"
        className="w-full py-4 text-left text-body text-text-secondary hover:text-text-primary"
      >
        로그아웃
      </button>

      <ConfirmDialog
        open={asking}
        title="로그아웃할까요?"
        description="다시 로그인하면 그대로 이어집니다"
        onCancel={() => setAsking(false)}
        confirm={
          <Button type="submit" className="flex-1">
            로그아웃
          </Button>
        }
      />
    </form>
  );
}
