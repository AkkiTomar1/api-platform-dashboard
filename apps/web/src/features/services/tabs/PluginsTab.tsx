import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Badge,
  EmptyState,
  Spinner,
  toast,
  Plus,
  Pencil,
  Trash2,
} from "@ui";
import type { Column } from "@ui";
import {
  listPlugins,
  createPlugin,
  updatePlugin,
  deletePlugin,
  listRoutePlugins,
  createRoutePlugin,
  updateRoutePlugin,
  deleteRoutePlugin,
  type KongPlugin,
  type PluginLevel,
} from "@/api/plugins";
import { listRoutes, type KongRoute } from "@/api/routes";
import type { ServiceDetail } from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { PluginModal, type PluginModalSubmit } from "@/features/plugins/PluginModal";

interface PluginRow {
  plugin: KongPlugin;
  level: "service" | "route";
  routeId?: string;
  routeName?: string;
}

export function PluginsTab({ service }: { service: ServiceDetail }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PluginRow[]>([]);
  const [routes, setRoutes] = useState<KongRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KongPlugin | null>(null);
  const [editingLevel, setEditingLevel] = useState<"service" | "route">("service");
  const [editingRouteId, setEditingRouteId] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState<"service" | "route">("service");
  const [routeId, setRouteId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission(user, "plugins:create");
  const canUpdate = hasPermission(user, "plugins:update");
  const canDelete = hasPermission(user, "plugins:delete");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [servicePlugins, serviceRoutes] = await Promise.all([
        listPlugins(service.id),
        listRoutes(service.id),
      ]);
      setRoutes(serviceRoutes);
      const routeRows = await Promise.all(
        serviceRoutes.map(async (r) => {
          const plugins = await listRoutePlugins(r.id);
          return plugins.map((p) => ({
            plugin: p,
            level: "route" as const,
            routeId: r.id,
            routeName: r.name ?? r.id,
          }));
        }),
      );
      setRows([
        ...servicePlugins.map((p) => ({ plugin: p, level: "service" as const })),
        ...routeRows.flat(),
      ]);
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
    setLevel("service");
    setRouteId(undefined);
    setOpen(true);
  };

  const openEdit = (row: PluginRow) => {
    setEditing(row.plugin);
    setEditingLevel(row.level);
    setEditingRouteId(row.routeId);
    setOpen(true);
  };

  const onSubmit = async (values: PluginModalSubmit) => {
    setSubmitting(true);
    try {
      if (editing) {
        if (editingLevel === "route" && editingRouteId) {
          await updateRoutePlugin(editingRouteId, editing.id, {
            config: values.config,
            enabled: values.enabled,
          });
        } else {
          await updatePlugin(service.id, editing.id, {
            config: values.config,
            enabled: values.enabled,
          });
        }
        toast.success("Plugin updated");
      } else {
        if (level === "route") {
          if (!routeId) {
            toast.error("Select a route");
            setSubmitting(false);
            return;
          }
          await createRoutePlugin(routeId, {
            name: values.name,
            config: values.config,
            enabled: values.enabled,
            protocols: ["http", "https"],
          });
        } else {
          await createPlugin(service.id, {
            name: values.name,
            config: values.config,
            enabled: values.enabled,
            protocols: ["http", "https"],
          });
        }
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

  const handleDelete = async (row: PluginRow) => {
    try {
      if (row.level === "route" && row.routeId) {
        await deleteRoutePlugin(row.routeId, row.plugin.id);
      } else {
        await deletePlugin(service.id, row.plugin.id);
      }
      toast.success("Plugin deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const levelLabel = (row: PluginRow) =>
    row.level === "route"
      ? `route · ${row.routeName}`
      : "service";

  const columns: Column<PluginRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <Badge tone="violet">{row.plugin.name}</Badge>,
    },
    {
      key: "level",
      header: "Level / Target",
      render: (row) => (
        <Badge tone={row.level === "route" ? "blue" : "gray"}>{levelLabel(row)}</Badge>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (row) => (
        <Badge tone={row.plugin.enabled ? "green" : "red"}>
          {row.plugin.enabled ? "on" : "off"}
        </Badge>
      ),
    },
    {
      key: "config",
      header: "Config keys",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {Object.keys(row.plugin.config ?? {}).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => openEdit(row)}
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
              onClick={() => void handleDelete(row)}
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
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No plugins"
            description="No plugins are enabled on this service or its routes."
          />
        </Card>
      ) : (
        <Table columns={columns} rows={rows} rowKey={(row) => row.plugin.id} />
      )}

      <PluginModal
        open={open}
        onClose={() => setOpen(false)}
        submitting={submitting}
        onSubmit={(values) => void onSubmit(values)}
        editing={editing}
        level={(editing ? editingLevel : level) as PluginLevel}
        onLevelChange={(next) => {
          setLevel(next === "route" ? "route" : "service");
          if (next !== "route") setRouteId(undefined);
        }}
        routes={routes}
        routeId={editing ? editingRouteId : routeId}
        onRouteChange={setRouteId}
        title={editing ? `Edit ${editing.name}` : "Add plugin"}
        description="Plugins extend service behaviour (auth, rate limiting, CORS…) at service or route level."
      />
    </div>
  );
}