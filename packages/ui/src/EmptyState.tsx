import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-600 shadow-sm dark:from-brand-500/20 dark:to-accent-500/20 dark:text-brand-300">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <p className="text-sm font-medium text-ink-strong">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}