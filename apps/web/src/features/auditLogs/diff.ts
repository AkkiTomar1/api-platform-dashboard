export type DiffChangeType = "added" | "removed" | "updated";

export interface DiffChange {
  field: string;
  type: DiffChangeType;
  before?: unknown;
  after?: unknown;
}

export interface DiffResult {
  additions: DiffChange[];
  removals: DiffChange[];
  updates: DiffChange[];
  all: DiffChange[];
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function computeDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): DiffResult {
  const beforeRecord = before ?? {};
  const afterRecord = after ?? {};
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);

  const additions: DiffChange[] = [];
  const removals: DiffChange[] = [];
  const updates: DiffChange[] = [];

  for (const key of keys) {
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeRecord, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterRecord, key);
    const b = beforeRecord[key];
    const a = afterRecord[key];

    if (!hasBefore && hasAfter) {
      additions.push({ field: key, type: "added", after: a });
    } else if (hasBefore && !hasAfter) {
      removals.push({ field: key, type: "removed", before: b });
    } else if (JSON.stringify(b) !== JSON.stringify(a)) {
      updates.push({ field: key, type: "updated", before: b, after: a });
    }
  }

  const all = [...additions, ...removals, ...updates];
  return { additions, removals, updates, all };
}

export function countChanges(diff: DiffResult): number {
  return diff.all.length;
}

export function hasChanges(diff: DiffResult): boolean {
  return diff.all.length > 0;
}