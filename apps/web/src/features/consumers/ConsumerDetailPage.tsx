import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  PageHeader,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  toast,
  ChevronLeft,
  Trash2,
  Plus,
} from "@ui";
import { Copy, RotateCw } from "lucide-react";
import type { Column } from "@ui";
import { getConsumer, type ConsumerDetail } from "@/api/consumers";
import {
  listKeyAuthCredentials,
  createKeyAuthCredential,
  rotateKeyAuthCredential,
  deleteKeyAuthCredential,
  type KeyAuthCredential,
} from "@/api/credentials";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { PERMISSIONS } from "@shared";
import { QueryState } from "@/components/QueryState";
import { usePageTitle } from "@/lib/use-page-title";
import { useBreadcrumb } from "@/components/Breadcrumbs";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function ConsumerDetailPage() {
  const { consumerId } = useParams<{ consumerId: string }>();
  const { user } = useAuth();
  const [consumer, setConsumer] = useState<ConsumerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<KeyAuthCredential[]>([]);
  const [credsLoading, setCredsLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState("Generated key");
  const [confirmDelete, setConfirmDelete] = useState<KeyAuthCredential | null>(null);

  const canReadCredentials = hasPermission(user, PERMISSIONS.CREDENTIALS_READ);
  const canCreateCredentials = hasPermission(user, PERMISSIONS.CREDENTIALS_CREATE);
  const canUpdateCredentials = hasPermission(user, PERMISSIONS.CREDENTIALS_UPDATE);
  const canDeleteCredentials = hasPermission(user, PERMISSIONS.CREDENTIALS_DELETE);

  const displayName = consumer
    ? (consumer.username ?? consumer.customId ?? consumer.id)
    : "";

  usePageTitle(consumer ? `Consumer · ${displayName}` : "Consumer");
  useBreadcrumb(consumer ? displayName : null);

  const loadConsumer = useCallback(async () => {
    if (!consumerId) return;
    setLoading(true);
    setError(null);
    try {
      setConsumer(await getConsumer(consumerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consumer");
      toast.error("Failed to load consumer");
    } finally {
      setLoading(false);
    }
  }, [consumerId]);

  const loadCredentials = useCallback(async () => {
    if (!consumerId) return;
    setCredsLoading(true);
    try {
      setCredentials(await listKeyAuthCredentials(consumerId));
    } catch {
      toast.error("Failed to load credentials");
    } finally {
      setCredsLoading(false);
    }
  }, [consumerId]);

  useEffect(() => {
    void loadConsumer();
  }, [loadConsumer]);

  useEffect(() => {
    if (canReadCredentials && consumerId) {
      void loadCredentials();
    }
  }, [canReadCredentials, consumerId, loadCredentials]);

  const handleGenerate = async () => {
    if (!consumerId) return;
    try {
      const created = await createKeyAuthCredential(consumerId, {});
      setNewKey(created.key);
      setResultTitle("Generated key");
      toast.success("Key generated — shown once");
      await loadCredentials();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const handleRotate = async (credential: KeyAuthCredential) => {
    if (!consumerId) return;
    try {
      const updated = await rotateKeyAuthCredential(consumerId, credential.id, credential.key);
      setNewKey(updated.key);
      setResultTitle("Rotated key — old key deactivated");
      toast.success("Key rotated");
      await loadCredentials();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rotation failed");
    }
  };

  const handleDelete = async () => {
    if (!consumerId || !confirmDelete) return;
    try {
      await deleteKeyAuthCredential(consumerId, confirmDelete.id);
      toast.success("Credential deleted");
      setConfirmDelete(null);
      await loadCredentials();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<KeyAuthCredential>[] = [
    {
      key: "key",
      header: "Key",
      render: (c) => (
        <span className="break-all font-mono text-sm text-ink-strong">{c.key}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Copy className="h-3.5 w-3.5" />}
            onClick={async (e) => {
              e.stopPropagation();
              await copyText(c.key);
              toast.success("Key copied");
            }}
          >
            Copy
          </Button>
          {canUpdateCredentials ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                void handleRotate(c);
              }}
            >
              Rotate
            </Button>
          ) : null}
          {canDeleteCredentials ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(c);
              }}
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
      <Link
        to="/consumers"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink-strong"
      >
        <ChevronLeft className="h-4 w-4" /> Consumers
      </Link>

      <QueryState loading={loading} error={error} onRetry={() => void loadConsumer()}>
        {consumer ? (
          <>
            <PageHeader
              title={displayName}
              description={`Consumer · created ${formatDate(consumer.createdAt)}`}
              breadcrumbs={[{ label: "Consumers", to: "/consumers" }, displayName]}
            />

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Identity" subtitle="Consumer metadata">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Username
                    </dt>
                    <dd className="mt-1 break-all font-mono text-sm text-ink-strong">
                      {consumer.username ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Custom ID
                    </dt>
                    <dd className="mt-1 break-all font-mono text-sm text-ink-strong">
                      {consumer.customId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Consumer ID
                    </dt>
                    <dd className="mt-1 break-all font-mono text-sm text-ink-strong">
                      {consumer.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-ink-strong">
                      {formatDate(consumer.createdAt)}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card title="Linked services" subtitle="Gateway access bindings">
                {consumer.serviceConsumers.length === 0 ? (
                  <p className="text-sm text-ink-faint">Not linked to any service.</p>
                ) : (
                  <ul className="space-y-2">
                    {consumer.serviceConsumers.map((sc) => (
                      <li
                        key={sc.id}
                        className="flex items-center justify-between rounded-lg border border-hairline bg-surface-inset px-3 py-2"
                      >
                        <Link
                          to={`/services/${sc.serviceId}`}
                          className="text-sm font-medium text-ink-strong transition-colors hover:text-brand-600"
                        >
                          {sc.service.name}
                        </Link>
                        <Badge tone={sc.status === "ACTIVE" ? "green" : "red"}>
                          {sc.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card
              className="mt-4"
              title="API keys"
              subtitle="Key-auth credentials for this consumer"
              action={
                canCreateCredentials ? (
                  <Button
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => void handleGenerate()}
                  >
                    Generate key
                  </Button>
                ) : undefined
              }
            >
              {!canReadCredentials ? (
                <p className="text-sm text-ink-soft">
                  You don&apos;t have permission to view credentials.
                </p>
              ) : credsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : credentials.length === 0 ? (
                <p className="text-sm text-ink-faint">No API keys yet.</p>
              ) : (
                <Table
                  columns={columns}
                  rows={credentials}
                  rowKey={(c) => c.id}
                  lastHeaderAlign="right"
                />
              )}
            </Card>
          </>
        ) : null}
      </QueryState>

      <Modal
        open={newKey !== null}
        onClose={() => setNewKey(null)}
        title={resultTitle}
        description="This secret is shown exactly once — copy it before closing."
      >
        {newKey ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Secret key
              </p>
              <code className="mt-1 block break-all rounded bg-emerald-100 px-2 py-1 font-mono text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                {newKey}
              </code>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={async () => {
                  await copyText(newKey);
                  toast.success("Key copied");
                }}
              >
                Copy
              </Button>
              <Button onClick={() => setNewKey(null)}>Done</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete API key"
        description="The key will no longer authenticate traffic."
      >
        <p className="text-sm text-ink">
          Are you sure you want to delete this API key? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => void handleDelete()}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}