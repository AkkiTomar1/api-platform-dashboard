export const styles = {
  table: "w-full border-collapse text-sm",
  headerRow: "border-b border-hairline bg-surface-muted",
  headerCell: "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft",
  bodyRow: "border-b border-hairline align-top",
  fieldCell: "px-3 py-2 font-mono text-xs font-medium text-ink-strong",
  addedCell: "px-3 py-2 font-mono text-xs text-emerald-600 dark:text-emerald-400",
  removedCell: "px-3 py-2 font-mono text-xs text-red-600 dark:text-red-400 line-through",
  updatedBefore: "px-3 py-2 font-mono text-xs text-red-600 dark:text-red-400 line-through",
  updatedAfter: "px-3 py-2 font-mono text-xs text-emerald-600 dark:text-emerald-400",
  unchanged: "px-3 py-2 font-mono text-xs text-ink-faint",
  valueBlock: "rounded bg-surface-muted px-2 py-1 whitespace-pre-wrap break-all",
} as const;

export type Styles = typeof styles;