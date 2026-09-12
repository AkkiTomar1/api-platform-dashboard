import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Badge,
  EmptyState,
  Modal,
  Select,
  Spinner,
  toast,
  Plus,
  Pencil,
  Trash2,
} from "@ui";
import type { Column } from "@ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  listPlugins,
  createPlugin,
  updatePlugin,
  deletePlugin,
  PLUGIN_NAMES,
  type KongPlugin,
} from "@/api/plugins";
import type { ServiceDetail } from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";

const pluginFormSchema = z.object({
  name: z.string().min(1, "Plugin is required"),
  enabled: z.boolean().optional(),
  configJson: z
    .string()
    .optional()
    .default("{}")
    .refine(
      (value) => {
        try {
          JSON.parse(value ?? "{}");
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid JSON" },
    ),
});

type PluginFormValues = z.infer<typeof pluginFormSchema>;

export function PluginsTab({ service }: { service: ServiceDetail }) {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<KongPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KongPlugin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission(user, "plugins:create");
  const canUpdate = hasPermission(user, "plugins:update");
  const canDelete = hasPermission(user, "plugins:delete");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PluginFormValues>({
    resolver: zodResolver(pluginFormSchema),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlugins(await listPlugins(service.id));
    } catch {
      toast.error("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "key-auth", enabled: true, configJson: "{}" });
    setOpen(true);
  };

  const openEdit = (plugin: KongPlugin) => {
    setEditing(plugin);
    reset({
      name: plugin.name,
      enabled: plugin.enabled,
      configJson: JSON.stringify(plugin.config ?? {}, null, 2),
    });
    setOpen(true);
  };

  const onSubmit = async (values: PluginFormValues) => {
    setSubmitting(true);
    const config = JSON.parse(values.configJson ?? "{}") as Record<string, unknown>;
    try {
      if (editing) {
        await updatePlugin(service.id, editing.id, {
          config,
          enabled: values.enabled,
        });
        toast.success("Plugin updated");
      } else {
        await createPlugin(service.id, {
          name: values.name,
          config,
          enabled: values.enabled,
        });
        toast.success("Plugin created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pluginId: string) => {
    try {
      await deletePlugin(service.id, pluginId);
      toast.success("Plugin deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<KongPlugin>[] = [
    { key: "name", header: "Name", render: (p) => <Badge tone="violet">{p.name}</Badge> },
    {
      key: "enabled",
      header: "Enabled",
      render: (p) => <Badge tone={p.enabled ? "green" : "red"}>{p.enabled ? "on" : "off"}</Badge>,
    },
    {
      key: "config",
      header: "Config keys",
      render: (p) => (
        <span className="text-xs text-slate-500">
          {Object.keys(p.config ?? {}).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => openEdit(p)}
            >
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => void handleDelete(p.id)}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add plugin
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : plugins.length === 0 ? (
        <Card>
          <EmptyState title="No plugins" description="No plugins are enabled on this service." />
        </Card>
      ) : (
        <Table columns={columns} rows={plugins} rowKey={(p) => p.id} />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add plugin"}
        description="Plugins extend service behaviour (auth, rate limiting, CORS…)."
      >
        <form onSubmit={handleSubmit((v) => void onSubmit(v))} className="space-y-4">
          <Select
            label="Plugin"
            error={errors.name?.message}
            disabled={editing !== null}
            options={PLUGIN_NAMES.map((name) => ({ value: name, label: name }))}
            {...register("name")}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register("enabled")} className="h-4 w-4" />
            <label className="text-sm text-slate-700">Enabled</label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              JSON config
            </label>
            <textarea
              rows={8}
              spellCheck={false}
              {...register("configJson")}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            {errors.configJson ? (
              <p className="mt-1 text-xs text-red-600">{errors.configJson.message}</p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}