export const styles = {
  table: "w-full border-collapse text-sm",
  headerRow: "border-b border-slate-200 bg-slate-50",
  headerCell: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
  bodyRow: "border-b border-slate-100 align-top",
  fieldCell: "px-3 py-2 font-mono text-xs font-medium text-slate-800",
  addedCell: "px-3 py-2 font-mono text-xs text-emerald-700",
  removedCell: "px-3 py-2 font-mono text-xs text-red-700 line-through",
  updatedBefore: "px-3 py-2 font-mono text-xs text-red-700 line-through",
  updatedAfter: "px-3 py-2 font-mono text-xs text-emerald-700",
  unchanged: "px-3 py-2 font-mono text-xs text-slate-500",
  valueBlock: "rounded bg-slate-100 px-2 py-1 whitespace-pre-wrap break-all",
} as const;

export type Styles = typeof styles;