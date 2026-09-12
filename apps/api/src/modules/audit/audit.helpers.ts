import { SENSITIVE_KEYS } from "@shared";

const REDACTED = "[REDACTED]";

export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = sanitize(val, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function resolveIdsToNames(
  entries: Array<{
    resourceType: string;
    userId: string;
    resourceName: string;
    beforeJson?: unknown;
    afterJson?: unknown;
  }>,
  context: {
    services?: Record<string, string>;
    consumers?: Record<string, string>;
  } = {},
): Array<{
  resourceType: string;
  userId: string;
  resourceName: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
}> {
  return entries.map((e) => {
    let name = e.resourceName;
    if (context.services && context.services[e.resourceName]) {
      name = context.services[e.resourceName];
    } else if (context.consumers && context.consumers[e.resourceName]) {
      name = context.consumers[e.resourceName];
    }
    const before = asRecord(e.beforeJson);
    const after = asRecord(e.afterJson);
    if (before && typeof before.service_name === "string" && context.services) {
      const resolved = context.services[before.service_name];
      if (resolved) {
        before.service_name = resolved;
      }
    }
    if (after && typeof after.service_name === "string" && context.services) {
      const resolved = context.services[after.service_name];
      if (resolved) {
        after.service_name = resolved;
      }
    }
    return {
      resourceType: e.resourceType,
      userId: e.userId,
      resourceName: name,
      beforeJson: before,
      afterJson: after,
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export interface FieldDiffResult {
  field: string;
  before?: unknown;
  after?: unknown;
}

export function formatBeforeAfter(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): FieldDiffResult[] {
  const beforeRec = before ?? {};
  const afterRec = after ?? {};
  const keys = new Set([...Object.keys(beforeRec), ...Object.keys(afterRec)]);
  const diffs: FieldDiffResult[] = [];
  for (const key of keys) {
    const b = beforeRec[key];
    const a = afterRec[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diffs.push({ field: key, before: b, after: a });
    }
  }
  return diffs;
}

export function buildSimpleMessage(entry: {
  action: string;
  resourceType: string;
  resourceName: string;
}): string {
  return `${entry.action} ${entry.resourceType} "${entry.resourceName}"`;
}