import { useCallback, useEffect, useState } from "react";
import {
  PageHeader,
  Button,
  Table,
  Badge,
  Spinner,
  toast,
  Plus,
  Trash2,
  EyeOff,
  Modal,
} from "@ui";
import type { Column } from "@ui";
import {
  listConsumers,
  createConsumer,
  deleteConsumer,
  type ConsumerSummary,
} from "@/api/consumers";
import { createKeyAuthCredential } from "@/api/credentials";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { ConsumerFormModal } from "./ConsumerFormModal";

interface GenerateState {
  consumerId: string;
  secret: string | null;
}

export function ConsumersPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ConsumerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generate, setGenerate] = useState<GenerateState | null>(null);

  const canCreate = hasPermission(user, "consumers:create");
  const canDelete = hasPermission(user, "consumers:delete");
  const canCredential = hasPermission(user, "credentials:create");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listConsumers();
      setData(res.data);
    } catch {
      toast.error("Failed to load consumers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteConsumer(id);
      toast.success("Consumer deleted (revoked)");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
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
            <span className="text-xs text-slate-400">none</span>
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
      key: "actions",
      header: "",
      render: (c) =>
        canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => void handleDelete(c.id)}
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table columns={columns} rows={data} rowKey={(c) => c.id} />
      )}

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
            <p className="text-sm text-slate-600">Consumer: {generate.consumerId}</p>
            {generate.secret !== null ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-800">Secret key</p>
                  <button
                    type="button"
                    className="text-emerald-700"
                    onClick={() => setGenerate((g) => (g ? { ...g, secret: null } : null))}
                    aria-label="Hide secret"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </div>
                <code className="mt-1 block break-all rounded bg-emerald-100 px-2 py-1 font-mono text-xs text-emerald-900">
                  {generate.secret}
                </code>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                The secret key is only ever shown once. You cannot reveal it again.
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}