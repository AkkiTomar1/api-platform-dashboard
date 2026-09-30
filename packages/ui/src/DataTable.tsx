import type { ReactNode } from "react";
import { cn } from "./cn";
import { Table, type Column } from "./Table";

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  lastHeaderAlign?: "left" | "right";
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  lastHeaderAlign,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-hairline bg-surface-card shadow-sm shadow-slate-950/5",
        className,
      )}
    >
      <Table
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        empty={empty}
        onRowClick={onRowClick}
        lastHeaderAlign={lastHeaderAlign}
        className="rounded-none border-0"
      />
    </div>
  );
}