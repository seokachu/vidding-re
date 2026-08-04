"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { initialOf } from "@/lib/format";

/**
 * 프로필 이미지. 없거나 로드에 실패하면 **닉네임 첫 글자**로 대체한다 (F8 4).
 *
 * `onError` 는 함수 prop 이라 클라이언트 컴포넌트여야 한다. 실패를 src 째로
 * 기억해 두면 src 가 바뀌는 순간 자동으로 다시 시도하고, 새로고침이면
 * 상태가 통째로 리셋되므로 같은 URL 도 다시 시도한다.
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // 카카오 프로필처럼 http 로 저장된 URL 은 https 페이지 안에서 mixed
  // content 가 된다. 브라우저는 승격해 주지만 앱 웹뷰는 그냥 차단해
  // 엑박이 되므로, 여기서 승격한다 (프로필 CDN 은 모두 https 를 받는다).
  const safeSrc = src?.replace(/^http:\/\//, "https://");

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-sunken",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {safeSrc && safeSrc !== failedSrc ? (
        <Image
          src={safeSrc}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setFailedSrc(safeSrc)}
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
