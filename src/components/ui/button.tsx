import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * 버튼 3종.
 *
 * **기본 동작은 Primary 하나다.** Secondary 는 소유자 전용 수정·삭제에만 쓴다 (.pen 03).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "rounded-md px-5 py-[15px] text-body bg-accent text-text-on-accent hover:bg-accent-pressed " +
    "disabled:bg-neutral-300 disabled:text-neutral-500 disabled:hover:bg-neutral-300",
  secondary:
    "rounded-md px-5 py-[15px] text-body bg-bg text-text-primary border border-border-strong hover:bg-surface " +
    "disabled:text-text-tertiary disabled:hover:bg-bg",
  ghost:
    "rounded-sm px-[14px] py-[10px] gap-[6px] text-caption text-accent hover:bg-accent-subtle " +
    "disabled:text-text-tertiary disabled:hover:bg-transparent",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** 가로를 꽉 채운다. 화면 하단 CTA 는 대부분 이 쪽이다 */
  block?: boolean;
};

export function Button({
  variant = "primary",
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANT[variant], block && "w-full", className)}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  block?: boolean;
};

/** 이동이 목적이면 버튼이 아니라 링크로 그린다 — 새 탭·복사가 동작해야 한다 */
export function ButtonLink({
  variant = "primary",
  block,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANT[variant], block && "w-full", className)}
      {...props}
    />
  );
}
