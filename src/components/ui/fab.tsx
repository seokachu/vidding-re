import { Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * 경매 등록 FAB. 목록 화면 우측 하단에 뜬다 (S02).
 *
 * 로그인은 필요하지만 **여기서 막지 않는다.** 누르면 로그인 화면으로 보내고
 * 로그인 후 원래 자리로 돌려보낸다 (F10 3.5) — 프록시가 처리한다.
 */
export function Fab({
  href,
  label = "경매 등록",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-[7px] rounded-full bg-accent px-5 py-[15px]",
        "text-caption font-semibold text-text-on-accent",
        "shadow-[0_6px_18px_-3px_#0C1C4045] hover:bg-accent-pressed",
        className,
      )}
    >
      <Plus size={19} />
      {label}
    </Link>
  );
}
