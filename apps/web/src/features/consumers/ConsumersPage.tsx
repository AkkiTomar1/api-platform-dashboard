import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  Button,
  Table,
  DataTable,
  Badge,
  toast,
  Plus,
  Pencil,
  Trash2,
  EyeOff,
} from "@ui";
import type { Column } from "@ui";
import {
  listConsumers,
  createConsumer,
  deleteConsumer,
  type ConsumerSummary,
} from "@/api/consumers";
import {
  listConsumerPlugins,
  createConsumerPlugin,
  updateConsumerPlugin,
  deleteConsumerPlugin,
  type KongPlugin,
} from "@/api/plugins";
import { createKeyAuthCredential } from "@/api/credentials";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { ConsumerFormModal } from "./ConsumerFormModal";
import { PluginModal, type PluginModalSubmit } from "@/features/plugins/PluginModal";
import { QueryState } from "@/components/QueryState";
import { ConfirmDialog } from "@ui";
import { Modal } from "@ui";
import { usePageTitle } from "@/lib/use-page-title";

interface GenerateState {
  consumerId: string;
  secret: string | null;
}

export function ConsumersPage() {
  usePageTitle("Consumers");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ConsumerSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generate, setGenerate] = useState<GenerateState | null>(null);
  const [pluginsFor, setPluginsFor] = useState<ConsumerSummary | null>(null);
  const [consumerPlugins, setConsumerPlugins] = useState<KongPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [pluginOpen, setPluginOpen] = useState(false);
  const [pluginEditing, setPluginEditing] = useState<KongPlugin | null>(null);
  const [pluginsSubmitting, setPluginsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission(user, "consumers:create");
  const canDelete = hasPermission(user, "consumers:delete");
  const canCredential = hasPermission(user, "credentials:create");
  const canManagePlugins = hasPermission(user, "plugins:read");
  const canCreatePlugin = hasPermission(user, "plugins:create");
  const canUpdatePlugin = hasPermission(user, "plugins:update");
  const canDeletePlugin = hasPermission(user, "plugins:delete");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listConsumers({
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, total: res.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consumers");
      toast.error("Failed to load consumers");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadConsumerPlugins = useCallback(async (consumerId: string) => {
    setPluginsLoading(true);
    try {
      setConsumerPlugins(await listConsumerPlugins(consumerId));
    } catch {
      toast.error("Failed to load plugins");
    } finally {
      setPluginsLoading(false);
    }
  }, []);

  const openConsumerPlugins = (consumer: ConsumerSummary) => {
    setPluginsFor(consumer);
    void loadConsumerPlugins(consumer.id);
  };

  const onSubmit = async (values: { username?: string; customId?: string }) => {
    setSubmitting(true);
    try {
      await createConsumer(values);
      toast.success("Consumer created");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onPluginSubmit = async (values: PluginModalSubmit) => {
    if (!pluginsFor) return;
    setPluginsSubmitting(true);
    try {
      if (pluginEditing) {
        await updateConsumerPlugin(pluginsFor.id, pluginEditing.id, {
          config: values.config,
          enabled: values.enabled,
        });
        toast.success("Plugin updated");
      } else {
        await createConsumerPlugin(pluginsFor.id, {
          name: values.name,
          config: values.config,
          enabled: values.enabled,
          protocols: ["http", "https"],
        });
        toast.success("Plugin created");
      }
      setPluginOpen(false);
      await loadConsumerPlugins(pluginsFor.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPluginsSubmitting(false);
    }
  };

  const handlePluginDelete = async (plugin: KongPlugin) => {
    if (!pluginsFor) return;
    try {
      await deleteConsumerPlugin(pluginsFor.id, plugin.id);
      toast.success("Plugin deleted");
      await loadConsumerPlugins(pluginsFor.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteConsumer(confirmDelete.id);
      toast.success("Consumer deleted (revoked)");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      const created = await createKeyAuthCredential(id, {});
      setGenerate({ consumerId: id, secret: created.key });
      toast.success("Key generated — shown once");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const columns: Column<ConsumerSummary>[] = [
    { key: "username", header: "Username", render: (c) => c.username ?? "—" },
    { key: "customId", header: "Custom ID", render: (c) => c.customId ?? "—" },
    { key: "createdAt", header: "Created", render: (c) => formatDate(c.createdAt) },
    {
      key: "services",
      header: "Linked services",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.services.length === 0 ? (
            <span className="text-xs text-ink-faint">none</span>
          ) : (
            c.services.map((s) => (
              <Badge key={s.serviceId} tone={s.status === "ACTIVE" ? "green" : "red"}>
                {s.serviceName}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: "credentials",
      header: "Key-auth",
      render: (c) =>
        canCredential ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleGenerate(c.id)}
          >
            Generate key
          </Button>
        ) : null,
    },
    {
      key: "plugins",
      header: "Plugins",
      render: (c) =>
        canManagePlugins ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openConsumerPlugins(c)}
          >
            Plugins
          </Button>
        ) : null,
    },
    {
      key: "actions",
      header: "",
      render: (c) =>
        canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setConfirmDelete({ id: c.id, name: c.username ?? c.customId ?? c.id })}
          >
            Delete
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Consumers"
        description="API consumers and their gateway credentials"
        actions={
          canCreate ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setOpen(true)}
            >
              New consumer
            </Button>
          ) : undefined
        }
      />

      <QueryState loading={loading} error={error} onRetry={load}>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(c) => c.id}
          lastHeaderAlign="right"
          onRowClick={(c) => {
            navigate(`/consumers/${c.id}`);
          }}
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            {pagination.total} consumer{pagination.total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page - 1 }))
              }
            >
              Prev
            </Button>
            <span className="flex items-center px-2 text-sm text-ink">
              Page {pagination.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </QueryState>

      <ConsumerFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        submitting={submitting}
      />

      <Modal
        open={generate !== null}
        onClose={() => setGenerate(null)}
        title="Generated key"
        description="This secret is shown exactly once — copy it before closing."
      >
        {generate ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">Consumer: {generate.consumerId}</p>
            {generate.secret !== null ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Secret key
                  </p>
                  <button
                    type="button"
                    className="text-emerald-600 dark:text-emerald-400"
                    onClick={() => setGenerate((g) => (g ? { ...g, secret: null } : null))}
                    aria-label="Hide secret"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </div>
                <code className="mt-1 block break-all rounded bg-emerald-100 px-2 py-1 font-mono text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {generate.secret}
                </code>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                The secret key is only ever shown once. You cannot reveal it again.
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={pluginsFor !== null}
        onClose={() => setPluginsFor(null)}
        title={
          pluginsFor
            ? `Plugins · ${pluginsFor.username ?? pluginsFor.customId ?? pluginsFor.id}`
            : "Plugins"
        }
        description="Plugins applied to this consumer (e.g. rate limiting, ACL, key-auth)."
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            {pluginsFor && canCreatePlugin ? (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setPluginEditing(null);
                  setPluginOpen(true);
                }}
              >
                Add plugin
              </Button>
            ) : null}
          </div>
          {pluginsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : consumerPlugins.length === 0 ? (
            <div className="rounded-lg border border-hairline p-8 text-center">
              <p className="text-sm text-ink-soft">
                No plugins are enabled on this consumer.
              </p>
            </div>
          ) : (
            <Table
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (p) => <Badge tone="violet">{p.name}</Badge>,
                },
                {
                  key: "enabled",
                  header: "Enabled",
                  render: (p) => (
                    <Badge tone={p.enabled ? "green" : "red"}>
                      {p.enabled ? "on" : "off"}
                    </Badge>
                  ),
                },
                {
                  key: "config",
                  header: "Config keys",
                  render: (p) => (
                    <span className="text-xs text-ink-soft">
                      {Object.keys(p.config ?? {}).join(", ") || "—"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (p) => (
                    <div className="flex justify-end gap-1">
                      {canUpdatePlugin ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setPluginEditing(p);
                            setPluginOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDeletePlugin ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => void handlePluginDelete(p)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={consumerPlugins}
              rowKey={(p) => p.id}
            />
          )}

          <PluginModal
            open={pluginOpen}
            onClose={() => setPluginOpen(false)}
            submitting={pluginsSubmitting}
            onSubmit={(values) => void onPluginSubmit(values)}
            editing={pluginEditing}
            level="consumer"
            title={
              pluginEditing ? `Edit ${pluginEditing.name}` : "Add plugin"
            }
            description="Plugins attached to this consumer."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete consumer"
        description="This revokes the consumer's credentials. The action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      >
        {confirmDelete ? (
          <p className="text-sm text-ink">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-ink-strong">{confirmDelete.name}</span>?
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}