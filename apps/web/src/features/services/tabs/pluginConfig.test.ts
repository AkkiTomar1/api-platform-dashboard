import { describe, expect, it } from "vitest";
import {
  defaultDraft,
  fromConfig,
  splitList,
  toConfig,
  type PluginField,
} from "./pluginSchemas";

const fields: PluginField[] = [
  { field: "key_names", label: "Key names", type: "stringList", required: true },
  { field: "hide_credentials", label: "Hide", type: "boolean", default: false },
  { field: "max_age", label: "Max age", type: "number", min: 0 },
  { field: "policy", label: "Policy", type: "enum", options: ["local", "cluster", "redis"] },
  { field: "realm", label: "Realm", type: "string" },
];

describe("defaultDraft", () => {
  it("mirrors declared defaults in display form", () => {
    const draft = defaultDraft(fields);
    expect(draft.key_names).toBe("");
    expect(draft.hide_credentials).toBe(false);
    expect(draft.max_age).toBe("");
    expect(draft.policy).toBe("");
  });
});

describe("fromConfig", () => {
  it("hydrates display draft from stored config", () => {
    const config = {
      key_names: ["apikey", "x-api-key"],
      hide_credentials: true,
      max_age: 3600,
    };
    const draft = fromConfig(fields, config);
    expect(draft.key_names).toBe("apikey\nx-api-key");
    expect(draft.hide_credentials).toBe(true);
    expect(draft.max_age).toBe("3600");
    expect(draft.realm).toBe("");
  });
});

describe("toConfig", () => {
  it("round-trips a key-auth style config", () => {
    const draft = {
      key_names: "apikey\nx-api-key",
      hide_credentials: true,
      max_age: "",
      policy: "",
      realm: "",
    };
    const { config, errors } = toConfig(fields, draft);
    expect(errors).toEqual([]);
    expect(config).toEqual({
      key_names: ["apikey", "x-api-key"],
      hide_credentials: true,
    });
  });

  it("preserves extra keys already present on the plugin", () => {
    const draft = { key_names: "apikey", hide_credentials: false, max_age: "", policy: "", realm: "" };
    const { config } = toConfig(fields, draft, { run_on_preflight: true });
    expect(config.run_on_preflight).toBe(true);
    expect(config.key_names).toEqual(["apikey"]);
  });

  it("reports missing required fields", () => {
    const { config, errors } = toConfig(fields, {
      key_names: "",
      hide_credentials: false,
      max_age: "",
      policy: "",
      realm: "",
    });
    expect(errors.map((f) => f.field)).toEqual(["key_names"]);
    expect(config.key_names).toBeUndefined();
  });

  it("coerces numbers and rejects NaN", () => {
    const good = toConfig(fields, { key_names: "k", max_age: "3600", hide_credentials: false, policy: "", realm: "" });
    expect(good.config.max_age).toBe(3600);
    expect(good.errors).toEqual([]);

    const bad = toConfig(fields, { key_names: "k", max_age: "abc", hide_credentials: false, policy: "", realm: "" });
    expect(bad.errors.map((f) => f.field)).toEqual(["max_age"]);
  });

  it("enforces number bounds", () => {
    const { errors } = toConfig(fields, { key_names: "k", max_age: "-5", hide_credentials: false, policy: "", realm: "" });
    expect(errors.map((f) => f.field)).toEqual(["max_age"]);
  });

  it("validates enum options", () => {
    const bad = toConfig(fields, { key_names: "k", max_age: "", hide_credentials: false, policy: "nope", realm: "" });
    expect(bad.errors.map((f) => f.field)).toEqual(["policy"]);

    const good = toConfig(fields, { key_names: "k", max_age: "", hide_credentials: false, policy: "redis", realm: "" });
    expect(good.errors).toEqual([]);
    expect(good.config.policy).toBe("redis");
  });

  it("omits empty optional strings", () => {
    const { config } = toConfig(fields, { key_names: "k", max_age: "", hide_credentials: false, policy: "", realm: "  " });
    expect(config.realm).toBeUndefined();
  });
});

describe("splitList", () => {
  it("splits newline-separated values", () => {
    expect(splitList("one\ntwo \n\n three")).toEqual(["one", "two", "three"]);
  });

  it("splits comma-separated values", () => {
    expect(splitList("GET, HEAD\nPATCH", true)).toEqual(["GET", "HEAD", "PATCH"]);
  });

  it("returns empty array for empty input", () => {
    expect(splitList("")).toEqual([]);
    expect(splitList("   \n  ")).toEqual([]);
  });
});