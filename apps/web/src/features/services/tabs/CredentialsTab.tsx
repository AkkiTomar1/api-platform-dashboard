import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Badge,
  EmptyState,
  Modal,
  Input,
  Spinner,
  toast,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "@ui";
import type { Column } from "@ui";
import {
  listKeyAuthCredentials,
  createKeyAuthCredential,
  deleteKeyAuthCredential,
  type KeyAuthCredential,
} from "@/api/credentials";
import { listConsumers } from "@/api/consumers";
import type { ServiceDetail } from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";

export function CredentialsTab({ service }: { service: ServiceDetail }) {
  const { user } = useAuth();
  const [creds, setCreds] = useState<KeyAuthCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission(user, "credentials:create");
  const canDelete = hasPermission(user, "credentials:delete");

  const consumerIdsForService = useCallback(
    async (): Promise<string[]> => {
      const res = await listConsumers();
      return res.data
        .filter((c) => c.services.some((s) => s.serviceId === service.id))
        .map((c) => c.id);
    },
    [service.id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ids = await consumerIdsForService();
      const all = await Promise.all(
        ids.map((id) => listKeyAuthCredentials(id).catch(() => [])),
      );
      setCreds(all.flat());
    } catch {
      toast.error("Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, [consumerIdsForService]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const ids = await consumerIdsForService();
      if (ids.length === 0) {
        toast.error("Link a consumer to this service first");
        return;
      }
      const created = await createKeyAuthCredential(ids[0], {
        key: keyInput || undefined,
      });
      setRevealed(created.key);
      setOpen(false);
      toast.success("Credential created — secret shown once");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    try {
      const ids = await consumerIdsForService();
      if (ids.length === 0) return;
      await deleteKeyAuthCredential(ids[0], credentialId);
      toast.success("Credential deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<KeyAuthCredential>[] = [
    {
      key: "key",
      header: "Key",
      render: (c) => (
        <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
          {c.key}
        </code>
      ),
    },
    { key: "id", header: "ID", render: (c) => <span className="font-mono text-xs">{c.id}</span> },
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
      <div className="mb-3 flex justify-end">
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add key-auth credential
          </Button>
        ) : null}
      </div>

      {revealed !== null ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-800">
              Secret shown once — copy it now
            </p>
            <button
              type="button"
              onClick={() => setRevealed((r) => (r === null ? r : null))}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Hide secret"
            >
              {revealed !== null ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <code className="mt-1 block break-all rounded bg-emerald-100 px-2 py-1 font-mono text-xs text-emerald-900">
            {revealed}
          </code>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : creds.length === 0 ? (
        <Card>
          <EmptyState
            title="No credentials"
            description="No key-auth credentials for this service's consumers."
          />
        </Card>
      ) : (
        <Table columns={columns} rows={creds} rowKey={(c) => c.id} />
      )}

      <div className="mt-3">
        <Badge tone="amber">Secret keys are stored redacted in audit logs.</Badge>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New key-auth credential"
        description="The secret key is shown exactly once after creation."
      >
        <div className="space-y-4">
          <Input
            label="Key — leave blank to auto-generate"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="super-secret-key"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={() => void onSubmit()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}