import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
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
import { listServices, type GatewayServiceSummary } from "@/api/services";
import { listPlugins, createPlugin, updatePlugin, deletePlugin, PLUGIN_NAMES, type KongPlugin } from "@/api/plugins";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";

const pluginFormSchema = z.object({
  name: z.string().min(1, "Plugin is required"),
  configJson: z
    .string()
    .default("{}")
    .refine((v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "Invalid JSON"),
});

type PluginFormValues = z.infer<typeof pluginFormSchema>;

export function PluginsPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<GatewayServiceSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
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

  const loadServices = useCallback(async () => {
    try {
      const res = await listServices({ pageSize: 100 });
      setServices(res.data);
      if (!selectedId && res.data.length > 0) {
        setSelectedId(res.data[0]?.id ?? "");
      }
    } catch {
      toast.error("Failed to load services");
    }
  }, [selectedId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const selected = useMemo(
    () => services.find((s) => s.id === selectedId),
    [services, selectedId],
  );

  const loadPlugins = useCallback(async () => {
    if (!selectedId) {
      setPlugins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPlugins(await listPlugins(selectedId));
    } catch {
      toast.error("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadPlugins();
  }, [loadPlugins]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "key-auth", configJson: "{}" });
    setOpen(true);
  };

  const openEdit = (plugin: KongPlugin) => {
    setEditing(plugin);
    reset({
      name: plugin.name,
      configJson: JSON.stringify(plugin.config ?? {}, null, 2),
    });
    setOpen(true);
  };

  const onSubmit = async (values: PluginFormValues) => {
    if (!selectedId) return;
    setSubmitting(true);
    const config = JSON.parse(values.configJson) as Record<string, unknown>;
    try {
      if (editing) {
        await updatePlugin(selectedId, editing.id, { config });
        toast.success("Plugin updated");
      } else {
        await createPlugin(selectedId, { name: values.name, config });
        toast.success("Plugin created");
      }
      setOpen(false);
      await loadPlugins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pluginId: string) => {
    if (!selectedId) return;
    try {
      await deletePlugin(selectedId, pluginId);
      toast.success("Plugin deleted");
      await loadPlugins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<KongPlugin>[] = [
    {
      key: "name",
      header: "Plugin",
      render: (p) => <Badge tone="violet">{p.name}</Badge>,
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (p) => <Badge tone={p.enabled ? "green" : "red"}>{p.enabled ? "on" : "off"}</Badge>,
    },
    {
      key: "config",
      header: "Config",
      render: (p) => (
        <span className="text-xs text-slate-500">
          {Object.keys(p.config ?? {}).length} key{Object.keys(p.config ?? {}).length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(p)}>
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
      <PageHeader
        title="Plugins"
        description="Gateway plugins are configured per service"
        actions={
          selected && canCreate ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add plugin
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Service"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          options={services.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      {!selected ? (
        <Card>
          <EmptyState title="No services" description="Create a service to manage plugins." />
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : plugins.length === 0 ? (
        <Card>
          <EmptyState
            title="No plugins"
            description={`${selected.name} has no plugins enabled.`}
          />
        </Card>
      ) : (
        <Table columns={columns} rows={plugins} rowKey={(p) => p.id} />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add plugin"}
      >
        <form onSubmit={handleSubmit((v) => void onSubmit(v))} className="space-y-4">
          <Select
            label="Plugin"
            disabled={editing !== null}
            options={PLUGIN_NAMES.map((n) => ({ value: n, label: n }))}
            {...register("name")}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">JSON config</label>
            <textarea
              rows={8}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              {...register("configJson")}
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