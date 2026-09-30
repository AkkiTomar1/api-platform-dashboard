import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, error, className, disabled, ...props }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          className={cn(
            "inline-flex items-center gap-2",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            className,
          )}
        >
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              ref={ref}
              type="checkbox"
              disabled={disabled}
              className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              {...props}
            />
            <span
              className={cn(
                "absolute inset-0 rounded-md border border-hairline bg-surface-card transition-colors",
                "peer-checked:border-brand-600 peer-checked:bg-brand-600",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40",
              )}
            />
            <Check className="relative h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </span>
          {label ? <span className="text-sm text-ink">{label}</span> : null}
        </label>
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>
    );
  },
);