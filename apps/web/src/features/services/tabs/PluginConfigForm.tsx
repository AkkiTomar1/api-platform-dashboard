import { Input, Select } from "@ui";
import type { PluginDraft, PluginField } from "./pluginSchemas";

interface PluginConfigFormProps {
  fields: PluginField[];
  draft: PluginDraft;
  onFieldChange: (field: string, value: unknown) => void;
}

export function PluginConfigForm({ fields, draft, onFieldChange }: PluginConfigFormProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <div
          key={field.field}
          className={
            field.type === "boolean" ||
            field.type === "stringList" ||
            field.type === "keyValue"
              ? "col-span-2"
              : ""
          }
        >
          <PluginFieldControl
            field={field}
            value={draft[field.field]}
            onChange={(value) => onFieldChange(field.field, value)}
          />
        </div>
      ))}
    </div>
  );
}

function PluginFieldControl({
  field,
  value,
  onChange,
}: {
  field: PluginField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "boolean":
      return (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={Boolean(value ?? field.default ?? false)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm font-medium text-ink">{field.label}</span>
          </label>
          {field.hint ? <p className="mt-1 text-xs text-ink-soft">{field.hint}</p> : null}
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          label={field.label}
          hint={field.hint}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "enum":
      return (
        <div>
          <Select
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            options={[
              { value: "", label: "…" },
              ...(field.options ?? []).map((opt) => ({ value: opt, label: opt })),
            ]}
          />
          {field.hint ? <p className="mt-1 text-xs text-ink-soft">{field.hint}</p> : null}
        </div>
      );
    case "stringList":
    case "keyValue":
      return (
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            {field.label}
          </label>
          <textarea
            rows={3}
            spellCheck={false}
            placeholder={field.placeholder ?? (field.type === "keyValue" ? "key=value" : "one per line")}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-inset p-3 font-mono text-xs text-ink-strong placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-600/30"
          />
          {field.hint ? <p className="mt-1 text-xs text-ink-soft">{field.hint}</p> : null}
        </div>
      );
    default:
      return (
        <Input
          label={field.label}
          hint={field.hint}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}