import type { ReactNode } from "react";
import { cn } from "./cn";

export interface PageCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageCard({
  title,
  description,
  actions,
  children,
  className,
}: PageCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-sm shadow-slate-950/5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative">
        {title || actions ? (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div>
              {title ? (
                <h3 className="text-sm font-semibold text-ink-strong">{title}</h3>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}