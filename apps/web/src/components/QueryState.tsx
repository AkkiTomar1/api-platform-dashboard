import { AlertTriangle, RotateCcw, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@ui";
import { cn } from "@ui";

interface QueryStateProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={cn(
                "h-6 animate-pulse rounded bg-surface-muted",
                j === 0 ? "w-1/3" : "w-1/4",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function QueryState({
  loading,
  error,
  onRetry,
  children,
  className,
}: QueryStateProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-hairline bg-surface-card px-6 py-12 text-center",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-strong">Something went wrong</p>
          <p className="mt-1 max-w-md text-sm text-ink-soft">{error}</p>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}

export function InlineEmpty({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-ink-soft">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-medium text-ink-strong">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-soft">{description}</p> : null}
    </div>
  );
}