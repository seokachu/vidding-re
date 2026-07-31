import { cn } from "@/lib/cn";

/**
 * 상태 배지 5종. **레드는 마감 임박 하나에만 쓴다** (.pen 03 · F11 3.6).
 */
export type BadgeTone = "ongoing" | "endingSoon" | "closed" | "won" | "void";

const TONE: Record<BadgeTone, string> = {
  ongoing: "bg-accent-subtle text-accent-text",
  endingSoon: "bg-warning-subtle text-warning-text",
  closed: "bg-closed-subtle text-closed",
  won: "bg-accent text-text-on-accent",
  void: "bg-surface-sunken text-text-tertiary",
};

export function Badge({
  tone = "ongoing",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-full px-[11px] py-[5px] text-label font-semibold",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
