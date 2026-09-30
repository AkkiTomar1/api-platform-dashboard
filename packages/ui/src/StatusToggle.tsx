import { forwardRef } from "react";
import { cn } from "./cn";

export interface StatusToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const StatusToggle = forwardRef<HTMLButtonElement, StatusToggleProps>(
  function StatusToggle({ checked, onChange, disabled, className }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-emerald-500"
            : "bg-slate-200 ring-1 ring-inset ring-hairline dark:bg-slate-600",
          className,
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    );
  },
);