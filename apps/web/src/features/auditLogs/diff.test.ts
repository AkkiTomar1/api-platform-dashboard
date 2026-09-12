import { describe, expect, it } from "vitest";
import {
  computeDiff,
  formatValue,
  countChanges,
  hasChanges,
  type DiffChange,
} from "./diff";

describe("formatValue", () => {
  it("returns placeholder for null/undefined", () => {
    expect(formatValue(null)).toBe("—");
    expect(formatValue(undefined)).toBe("—");
  });

  it("returns strings verbatim", () => {
    expect(formatValue("hello")).toBe("hello");
  });

  it("returns primitive numbers and booleans as strings", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(true)).toBe("true");
  });

  it("falls back to JSON.stringify for objects", () => {
    expect(formatValue({ a: 1 })).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it("falls back to String for un-serializable values", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(typeof formatValue(cyclic)).toBe("string");
  });
});

describe("computeDiff", () => {
  it("returns empty when nothing changed", () => {
    const diff = computeDiff({ a: 1 }, { a: 1 });
    expect(diff.all).toHaveLength(0);
    expect(diff.additions).toHaveLength(0);
    expect(diff.removals).toHaveLength(0);
  });

  it("detects additions", () => {
    const diff = computeDiff({ a: 1 }, { a: 1, b: 2 });
    const added = diff.additions.map((c) => c.field);
    expect(added).toContain("b");
    expect(diff.additions[0]?.type).toBe("added");
  });

  it("detects removals", () => {
    const diff = computeDiff({ a: 1, b: 2 }, { a: 1 });
    expect(diff.removals.map((c) => c.field)).toContain("b");
    expect(diff.removals[0]?.type).toBe("removed");
  });

  it("detects updates with before/after", () => {
    const diff = computeDiff({ a: 1, enabled: true }, { a: 1, enabled: false });
    const update = diff.updates.find((c) => c.field === "enabled");
    expect(update).toBeDefined();
    expect(update?.type).toBe("updated");
    expect(update?.before).toBe(true);
    expect(update?.after).toBe(false);
  });

  it("handles null before or after", () => {
    const diff = computeDiff(null, { a: 1 });
    expect(diff.additions).toHaveLength(1);
    const empty = computeDiff({ a: 1 }, null);
    expect(empty.removals).toHaveLength(1);
  });

  it("treats nested objects with same JSON as equal", () => {
    const diff = computeDiff({ conf: { x: 1 } }, { conf: { x: 1 } });
    expect(diff.all).toHaveLength(0);
  });

  it("records nested object differences as updates", () => {
    const diff = computeDiff({ conf: { x: 1 } }, { conf: { x: 2 } });
    expect(diff.updates).toHaveLength(1);
    expect(diff.updates[0]?.field).toBe("conf");
  });

  it("includes typed change records in all", () => {
    const diff = computeDiff({ a: 1 }, { a: 1, b: 2 });
    expect(diff.all).toHaveLength(1);
    const change: DiffChange | undefined = diff.all[0];
    expect(change?.type).toBe("added");
  });
});

describe("countChanges / hasChanges", () => {
  it("counts all changes", () => {
    const diff = computeDiff({ a: 1 }, { b: 2, c: 3 });
    expect(countChanges(diff)).toBe(3);
  });

  it("hasChanges is false when identical", () => {
    expect(hasChanges(computeDiff({ a: 1 }, { a: 1 }))).toBe(false);
  });

  it("hasChanges is true when different", () => {
    expect(hasChanges(computeDiff({ a: 1 }, { a: 2 }))).toBe(true);
  });
});