import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-sm shadow-violet-600/25 hover:opacity-95 focus-visible:ring-brand-500",
  secondary:
    "bg-surface-muted text-ink hover:bg-slate-200 hover:text-ink-strong dark:hover:bg-white/10 focus-visible:ring-ink-faint",
  ghost:
    "bg-transparent text-ink-soft hover:bg-surface-muted hover:text-ink-strong focus-visible:ring-ink-faint",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  outline:
    "border border-hairline bg-surface-card text-ink hover:bg-surface-muted focus-visible:ring-ink-faint",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
      </button>
    );
  },
);