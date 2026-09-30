import type { ReactNode } from "react";
import { cn } from "./cn";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  lastHeaderAlign?: "left" | "right";
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  lastHeaderAlign,
  className,
}: TableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-hairline", className)}>
      <table className="w-full min-w-full divide-y divide-hairline text-left text-sm">
        <thead>
          <tr className="bg-surface-muted">
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-soft",
                  i === columns.length - 1 && lastHeaderAlign === "right" && "text-right",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-surface-card">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8">
                {empty ?? (
                  <div className="text-center text-sm text-ink-faint">
                    No results
                  </div>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  onRowClick
                    ? "cursor-pointer transition-colors hover:bg-surface-muted/70"
                    : "transition-colors hover:bg-surface-muted/40",
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink">
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}