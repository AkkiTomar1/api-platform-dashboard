import type { ReactNode } from "react";
import { cn } from "./cn";

export type SummaryCardVariant = "default" | "success" | "error";

const variants: Record<SummaryCardVariant, { border: string; icon: string }> = {
  default: {
    border: "border-l-brand-500",
    icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  },
  success: {
    border: "border-l-emerald-500",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  error: {
    border: "border-l-red-500",
    icon: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  },
};

export interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  variant?: SummaryCardVariant;
  className?: string;
}

export function SummaryCard({
  icon,
  label,
  value,
  variant = "default",
  className,
}: SummaryCardProps) {
  const v = variants[variant];
  return (
    <div
      className={cn(
        "rounded-xl border border-hairline border-l-4 bg-surface-card p-4 shadow-sm shadow-slate-950/5",
        v.border,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            v.icon,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-ink-soft">
            {label}
          </p>
          <p className="text-2xl font-bold text-ink-strong">{value}</p>
        </div>
      </div>
    </div>
  );
}