export type PluginFieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "stringList"
  | "keyValue";

export interface PluginField {
  field: string;
  label: string;
  type: PluginFieldType;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  commaSeparated?: boolean;
}

export type PluginDraft = Record<string, unknown>;

export const PLUGIN_SCHEMAS: Record<string, PluginField[]> = {
  "key-auth": [
    {
      field: "key_names",
      label: "Key names",
      type: "stringList",
      required: true,
      default: ["apikey"],
      hint: "Header or query parameter names that contain the API key. One per line.",
    },
    {
      field: "key_in_header",
      label: "Key in header",
      type: "boolean",
      default: true,
    },
    {
      field: "key_in_query",
      label: "Key in query string",
      type: "boolean",
      default: true,
    },
    {
      field: "key_in_body",
      label: "Key in POST body",
      type: "boolean",
      default: true,
    },
    {
      field: "hide_credentials",
      label: "Hide credentials",
      type: "boolean",
      default: false,
      hint: "Remove the key from the upstream request.",
    },
    {
      field: "run_on_preflight",
      label: "Run on preflight",
      type: "boolean",
      default: true,
    },
    {
      field: "anonymous",
      label: "Anonymous consumer",
      type: "string",
      hint: "Consumer id or username used as fallback when authentication fails.",
    },
  ],
  "rate-limiting": [
    {
      field: "second",
      label: "Requests per second",
      type: "number",
      min: 0,
      hint: "Leave empty to use another period instead.",
    },
    {
      field: "minute",
      label: "Requests per minute",
      type: "number",
      min: 0,
    },
    {
      field: "hour",
      label: "Requests per hour",
      type: "number",
      min: 0,
    },
    {
      field: "day",
      label: "Requests per day",
      type: "number",
      min: 0,
    },
    {
      field: "limit_by",
      label: "Limit by",
      type: "enum",
      default: "consumer",
      options: [
        "consumer",
        "credential",
        "ip",
        "service",
        "header",
        "path",
        "consumer-group",
      ],
    },
    {
      field: "policy",
      label: "Policy",
      type: "enum",
      default: "local",
      options: ["local", "cluster", "redis"],
    },
    {
      field: "error_message",
      label: "Error message",
      type: "string",
    },
    {
      field: "hide_client_headers",
      label: "Hide client headers",
      type: "boolean",
      default: false,
    },
  ],
  cors: [
    {
      field: "origins",
      label: "Allowed origins",
      type: "stringList",
      default: ["*"],
      hint: "One origin per line.",
    },
    {
      field: "methods",
      label: "Allowed methods",
      type: "stringList",
      default: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      commaSeparated: true,
      hint: "Comma or newline separated.",
    },
    {
      field: "headers",
      label: "Allowed headers",
      type: "stringList",
      commaSeparated: true,
      hint: "Comma or newline separated.",
    },
    {
      field: "exposed_headers",
      label: "Exposed headers",
      type: "stringList",
      commaSeparated: true,
      hint: "Comma or newline separated.",
    },
    {
      field: "credentials",
      label: "Allow credentials",
      type: "boolean",
      default: false,
    },
    {
      field: "preflight_continue",
      label: "Skip preflight handling",
      type: "boolean",
      default: false,
    },
    {
      field: "private_network",
      label: "Allow private network",
      type: "boolean",
      default: false,
    },
    {
      field: "max_age",
      label: "Max age (seconds)",
      type: "number",
      min: 0,
    },
  ],
  acl: [
    {
      field: "allow",
      label: "Allow groups",
      type: "stringList",
      hint: "Groups that are permitted. One per line.",
    },
    {
      field: "deny",
      label: "Deny groups",
      type: "stringList",
      hint: "Groups that are rejected. One per line.",
    },
    {
      field: "hide_groups_header",
      label: "Hide groups header",
      type: "boolean",
      default: false,
    },
  ],
  jwt: [
    {
      field: "key_names",
      label: "Key names",
      type: "stringList",
      default: ["Authorization"],
      hint: "Header or query parameter names that contain the token. One per line.",
    },
    {
      field: "key_claim_name",
      label: "Key claim name",
      type: "string",
      default: "iss",
      hint: "Name of the claim from which the key is retrieved.",
    },
    {
      field: "secret_is_base64",
      label: "Secret is base64",
      type: "boolean",
      default: false,
    },
    {
      field: "run_on_preflight",
      label: "Run on preflight",
      type: "boolean",
      default: true,
    },
    {
      field: "claims_to_verify",
      label: "Claims to verify",
      type: "stringList",
      commaSeparated: true,
      hint: "Comma or newline separated (e.g. exp, nbf).",
    },
    {
      field: "maximum_expiration",
      label: "Maximum expiration (seconds)",
      type: "number",
      min: 0,
    },
    {
      field: "anonymous",
      label: "Anonymous consumer",
      type: "string",
      hint: "Consumer id or username used as fallback when authentication fails.",
    },
  ],
  "basic-auth": [
    {
      field: "hide_credentials",
      label: "Hide credentials",
      type: "boolean",
      default: false,
      hint: "Remove the Authorization header from the upstream request.",
    },
    {
      field: "realm",
      label: "Realm",
      type: "string",
      hint: "Realm shown in the WWW-Authenticate response header.",
    },
    {
      field: "auth_header_name",
      label: "Auth header name",
      type: "string",
      default: "authorization",
    },
    {
      field: "anonymous",
      label: "Anonymous consumer",
      type: "string",
      hint: "Consumer id or username used as fallback when authentication fails.",
    },
  ],
  "ip-restriction": [
    {
      field: "allow",
      label: "Allowed IPs / CIDRs",
      type: "stringList",
      hint: "Requests from anything else are denied. One per line.",
    },
    {
      field: "deny",
      label: "Denied IPs / CIDRs",
      type: "stringList",
      hint: "Requests from these are denied. One per line.",
    },
    {
      field: "status",
      label: "Denied status code",
      type: "number",
      min: 100,
      max: 599,
      default: 403,
    },
    {
      field: "message",
      label: "Denied message",
      type: "string",
      default: "Your IP address is not allowed",
    },
  ],
  "request-termination": [
    {
      field: "status_code",
      label: "Status code",
      type: "number",
      min: 100,
      max: 599,
      default: 503,
    },
    {
      field: "message",
      label: "Message",
      type: "string",
      hint: "Termination message returned to the client.",
    },
    {
      field: "body",
      label: "Body",
      type: "string",
      hint: "Raw response body (overrides message).",
    },
    {
      field: "content_type",
      label: "Content type",
      type: "string",
    },
    {
      field: "echo",
      label: "Echo request body as response",
      type: "boolean",
      default: false,
    },
  ],
};

export function getPluginSchema(name: string): PluginField[] | undefined {
  return PLUGIN_SCHEMAS[name];
}

export function fromConfig(fields: PluginField[], config: Record<string, unknown>): PluginDraft {
  const draft: PluginDraft = {};
  for (const field of fields) {
    const value = config[field.field];
    if (value === undefined || value === null) {
      draft[field.field] = defaultDisplayValue(field);
      continue;
    }
    switch (field.type) {
      case "boolean":
        draft[field.field] = Boolean(value);
        break;
      case "number":
        draft[field.field] =
          typeof value === "number" || typeof value === "string" ? String(value) : "";
        break;
      case "stringList":
        draft[field.field] = Array.isArray(value)
          ? value.filter((v): v is string => typeof v === "string").join("\n")
          : typeof value === "string"
            ? value
            : "";
        break;
      case "keyValue":
        draft[field.field] = toKeyValueLines(value);
        break;
      default:
        draft[field.field] = typeof value === "string" ? value : "";
    }
  }
  return draft;
}

export function defaultDraft(fields: PluginField[]): PluginDraft {
  const draft: PluginDraft = {};
  for (const field of fields) draft[field.field] = defaultDisplayValue(field);
  return draft;
}

export interface ToConfigResult {
  config: Record<string, unknown>;
  errors: PluginField[];
}

export function toConfig(
  fields: PluginField[],
  draft: PluginDraft,
  base: Record<string, unknown> = {},
): ToConfigResult {
  const errors: PluginField[] = [];
  const config: Record<string, unknown> = { ...base };

  for (const field of fields) {
    const value = draft[field.field];
    switch (field.type) {
      case "string": {
        const v = typeof value === "string" ? value.trim() : "";
        if (!v) {
          if (field.required) errors.push(field);
        } else {
          config[field.field] = v;
        }
        break;
      }
      case "number": {
        const raw = typeof value === "string" ? value.trim() : value;
        if (raw === "" || raw === undefined || raw === null) {
          if (field.required) errors.push(field);
          break;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          errors.push(field);
          break;
        }
        if ((field.min !== undefined && num < field.min) ||
            (field.max !== undefined && num > field.max)) {
          errors.push(field);
          break;
        }
        config[field.field] = num;
        break;
      }
      case "boolean":
        config[field.field] = Boolean(value);
        break;
      case "enum": {
        const v = typeof value === "string" ? value.trim() : "";
        if (!v) {
          if (field.required) errors.push(field);
        } else if (field.options && !field.options.includes(v)) {
          errors.push(field);
        } else {
          config[field.field] = v;
        }
        break;
      }
      case "stringList": {
        const items = splitList(value, field.commaSeparated);
        if (items.length === 0) {
          if (field.required) errors.push(field);
        } else {
          config[field.field] = items;
        }
        break;
      }
      case "keyValue": {
        const parsed = parseKeyValue((typeof value === "string" ? value : "").split("\n"));
        if (parsed === null) {
          errors.push(field);
        } else if (Object.keys(parsed).length > 0 || field.required) {
          config[field.field] = parsed;
        }
        break;
      }
    }
  }
  return { config, errors };
}

function defaultDisplayValue(field: PluginField): unknown {
  const fallback = field.default;
  switch (field.type) {
    case "boolean":
      return Boolean(fallback);
    case "number":
      return typeof fallback === "number" || typeof fallback === "string" ? String(fallback) : "";
    case "stringList":
      return Array.isArray(fallback)
        ? fallback.filter((v): v is string => typeof v === "string").join("\n")
        : "";
    case "keyValue":
      return toKeyValueLines(fallback);
    default:
      return typeof fallback === "string" ? fallback : "";
  }
}

export function splitList(value: unknown, commaSeparated = false): string[] {
  if (typeof value !== "string") return [];
  const parts = value.split("\n").flatMap((line) =>
    commaSeparated ? line.split(",") : [line],
  );
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function toKeyValueLines(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
  }
  return "";
}

function parseKeyValue(lines: string[]): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) return null;
    const key = trimmed.slice(0, idx).trim();
    const raw = trimmed.slice(idx + 1).trim();
    if (!key) return null;
    result[key] = raw;
  }
  return result;
}