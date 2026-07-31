import Image from "next/image";

import { cn } from "@/lib/cn";
import { initialOf } from "@/lib/format";

/**
 * 프로필 이미지. 없거나 로드에 실패하면 **닉네임 첫 글자**로 대체한다 (F8 4).
 *
 * `next/image` 의 `onError` 는 클라이언트 훅이 필요하다. 서버에서 그리는 목록에
 * 그만한 값은 없으므로, URL 이 없을 때만 글자로 떨어뜨린다.
 */
export function Avatar({
  src,
  nickName,
  size = 40,
  className,
}: {
  src?: string | null;
  nickName?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="font-semibold text-text-secondary"
          style={{ fontSize: Math.round(size * 0.375) }}
        >
          {initialOf(nickName)}
        </span>
      )}
    </span>
  );
}
