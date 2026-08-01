"use client";

import { LogOut } from "lucide-react";
import { useId, useState } from "react";

import { Button, ConfirmDialog } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * 로그아웃 (F10 3.7). **마이페이지 헤더 우측 액션 자리**에 둔다 (.pen S07).
 *
 * 프로필 행과 탭 사이에 두었다가 옮겼다. 그 자리는 어느 묶음에도 속하지 않아
 * 홀로 떠 보였고, 자주 쓰지도 않는 행동이 화면 한가운데 줄 하나를 차지했다.
 * 헤더 우측은 화면당 하나뿐인 부수 행동의 자리이고, 탭을 옮겨도 자리가
 * 흔들리지 않는다.
 *
 * **아이콘만 남기되 색은 한 단계 죽인다.** 되돌리는 데 품이 드는 행동이라
 * 알림 배지처럼 눈에 먼저 들어오면 안 된다.
 *
 * **폼 POST 라 자바스크립트 없이도 동작한다.** 자바스크립트가 있으면 첫 제출을
 * 가로채 확인을 먼저 묻고 (.pen S07b), 확인 버튼이 같은 폼을 다시 제출한다.
 * 확인을 콜백으로 처리하지 않는 이유가 이것이다 — 스크립트가 죽어도 로그아웃은
 * 되어야 하고, 그 경우엔 묻지 않고 바로 나간다.
 */
export function SignOutButton() {
  const [asking, setAsking] = useState(false);
  const formId = useId();

  return (
    <form
      id={formId}
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
        aria-label="로그아웃"
        className="flex size-10 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <LogOut size={22} />
      </button>

      <ConfirmDialog
        open={asking}
        title="로그아웃할까요?"
        description="다시 로그인하면 그대로 이어집니다"
        onCancel={() => setAsking(false)}
        confirm={
          // 다이얼로그는 `body` 로 옮겨 그려지므로 이 폼 안에 있지 않다.
          // `form` 으로 다시 이어 붙인다 — 없으면 눌러도 아무것도 제출되지 않는다
          <Button type="submit" form={formId} className="flex-1">
            로그아웃
          </Button>
        }
      />
    </form>
  );
}
