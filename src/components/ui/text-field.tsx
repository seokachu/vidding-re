import { cn } from "@/lib/cn";

/**
 * 라벨 + 입력 + 도움말. 라벨·도움말은 없으면 그리지 않는다.
 *
 * 글자 수 제한은 도움말로 안내한다 (`50자까지 쓸 수 있어요`).
 */
type FieldShellProps = {
  label?: string;
  required?: boolean;
  helper?: string;
  /** 에러가 있으면 도움말 자리를 대신 차지하고 테두리가 경고색이 된다 */
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export function FieldShell({
  label,
  required,
  helper,
  error,
  htmlFor,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex w-full flex-col gap-[7px]", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-[3px] text-label font-semibold text-text-secondary"
        >
          {label}
          {required && <span className="text-warning">*</span>}
        </label>
      )}

      {children}

      {(error ?? helper) && (
        <p
          className={cn(
            "text-label",
            error ? "text-warning-text" : "text-text-secondary",
          )}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

const INPUT =
  "w-full rounded-md border border-border-strong bg-bg px-[15px] py-[14px] text-body " +
  "text-text-primary placeholder:text-text-tertiary " +
  "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent " +
  "disabled:bg-surface disabled:text-text-tertiary";

type TextFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className"
> &
  Omit<FieldShellProps, "children" | "htmlFor">;

export function TextField({
  label,
  required,
  helper,
  error,
  className,
  id,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell
      label={label}
      required={required}
      helper={helper}
      error={error}
      htmlFor={id}
      className={className}
    >
      <input
        id={id}
        className={cn(INPUT, error && "border-warning")}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> &
  Omit<FieldShellProps, "children" | "htmlFor">;

/** 사연 내용처럼 여러 줄을 받는 자리 */
export function TextAreaField({
  label,
  required,
  helper,
  error,
  className,
  id,
  rows = 6,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell
      label={label}
      required={required}
      helper={helper}
      error={error}
      htmlFor={id}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        className={cn(INPUT, "resize-none leading-relaxed", error && "border-warning")}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FieldShell>
  );
}
