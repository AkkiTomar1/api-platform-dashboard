import type { ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-hairline bg-surface-card", className)}
    >
      {title || action ? (
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-ink-strong">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}