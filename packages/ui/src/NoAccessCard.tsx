import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "./cn";

export interface NoAccessCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function NoAccessCard({
  title = "No access",
  description,
  action,
  className,
}: NoAccessCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface-card px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <ShieldAlert className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink-strong">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}