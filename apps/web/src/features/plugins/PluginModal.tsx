import { useEffect, useState } from "react";
import { Button, Modal, Select } from "@ui";
import type { KongPlugin, PluginLevel } from "@/api/plugins";
import { PLUGIN_NAMES } from "@/api/plugins";
import type { KongRoute } from "@/api/routes";
import { PluginConfigForm } from "@/features/services/tabs/PluginConfigForm";
import {
  defaultDraft,
  fromConfig,
  getPluginSchema,
  toConfig,
  type PluginDraft,
} from "@/features/services/tabs/pluginSchemas";

export interface PluginModalSubmit {
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface PluginModalProps {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (values: PluginModalSubmit) => void;
  title: string;
  description?: string;
  editing?: KongPlugin | null;
  level: PluginLevel;
  onLevelChange?: (level: PluginLevel) => void;
  routes?: KongRoute[];
  routeId?: string;
  onRouteChange?: (routeId: string) => void;
}

export function PluginModal({
  open,
  onClose,
  submitting,
  onSubmit,
  title,
  description,
  editing,
  level,
  onLevelChange,
  routes,
  routeId,
  onRouteChange,
}: PluginModalProps) {
  const [name, setName] = useState("key-auth");
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState<PluginDraft>({});
  const [configJson, setConfigJson] = useState("{}");
  const [formError, setFormError] = useState<string | null>(null);

  const showLevelPicker = !editing && typeof onLevelChange === "function";
  const schema = getPluginSchema(name);

  useEffect(() => {
    if (!open) return;
    const pluginName = editing?.name ?? "key-auth";
    const fields = getPluginSchema(pluginName) ?? [];
    setName(pluginName);
    setEnabled(editing?.enabled ?? true);
    setDraft(
      editing ? fromConfig(fields, editing.config ?? {}) : defaultDraft(fields),
    );
    setConfigJson(JSON.stringify(editing?.config ?? {}, null, 2));
    setFormError(null);
  }, [open, editing]);

  const handleNameChange = (next: string) => {
    setName(next);
    setDraft(defaultDraft(getPluginSchema(next) ?? []));
    setFormError(null);
  };

  const handleSubmit = () => {
    let config: Record<string, unknown>;
    if (schema) {
      const result = toConfig(schema, draft, editing?.config ?? {});
      if (result.errors.length > 0) {
        setFormError(
          `Check config: ${result.errors.map((f) => f.label).join(", ")}`,
        );
        return;
      }
      config = result.config;
    } else {
      try {
        config = JSON.parse(configJson) as Record<string, unknown>;
      } catch {
        setFormError("Invalid JSON config");
        return;
      }
    }
    if (level === "route" && !routeId) {
      setFormError("Select a route");
      return;
    }
    setFormError(null);
    onSubmit({ name, enabled, config });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Plugin"
            disabled={editing !== null}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            options={PLUGIN_NAMES.map((n) => ({ value: n, label: n }))}
          />
          <div className="flex items-center gap-2 pt-7">
            <input
              type="checkbox"
              className="h-4 w-4 accent-violet-600"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label className="text-sm text-slate-700">Enabled</label>
          </div>
        </div>

        {showLevelPicker ? (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Level"
              value={level}
              onChange={(e) => onLevelChange?.(e.target.value as PluginLevel)}
              options={[
                { value: "service", label: "Service" },
                { value: "route", label: "Route" },
              ]}
            />
            {level === "route" ? (
              <Select
                label="Route"
                value={routeId ?? ""}
                onChange={(e) => onRouteChange?.(e.target.value)}
                options={[
                  { value: "", label: "Select a route…" },
                  ...(routes ?? []).map((r) => ({
                    value: r.id,
                    label: r.name ?? r.id,
                  })),
                ]}
              />
            ) : null}
          </div>
        ) : null}

        {schema ? (
          <PluginConfigForm
            fields={schema}
            draft={draft}
            onFieldChange={(field, value) =>
              setDraft((prev) => ({ ...prev, [field]: value }))
            }
          />
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              JSON config (advanced — no form available for this plugin)
            </label>
            <textarea
              rows={8}
              spellCheck={false}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
        )}

        {formError ? (
          <p className="text-sm text-red-600">{formError}</p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            {editing ? "Save" : "Add plugin"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}