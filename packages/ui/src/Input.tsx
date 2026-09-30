import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";
import { FormField } from "./FormField";

export const formInputClass =
  "h-10 w-full rounded-lg border border-hairline bg-surface-card px-3 text-sm text-ink-strong placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, error, hint, id, className, type = "text", ...props },
  ref,
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <FormField label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={cn(
          formInputClass,
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500/25" : "",
          className,
        )}
        {...props}
      />
    </FormField>
  );
});