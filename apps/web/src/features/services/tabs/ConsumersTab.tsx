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
} from "@ui";
import type { Column } from "@ui";
import {
  listConsumers,
  createConsumer,
  setConsumerLinkStatus,
  type ConsumerSummary,
} from "@/api/consumers";
import type { ServiceDetail } from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { ConsumerFormModal } from "@/features/consumers/ConsumerFormModal";
import { formatDate } from "@/lib/format";

export function ConsumersTab({ service }: { service: ServiceDetail }) {
  const { user } = useAuth();
  const [consumers, setConsumers] = useState<ConsumerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission(user, "consumers:create");
  const canUpdate = hasPermission(user, "consumers:update");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listConsumers();
      setConsumers(
        res.data.filter((c) => c.services.some((s) => s.serviceId === service.id)),
      );
    } catch {
      toast.error("Failed to load consumers");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (values: { username?: string; customId?: string }) => {
    setSubmitting(true);
    try {
      await createConsumer({ ...values, serviceId: service.id });
      toast.success("Consumer created and linked");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetStatus = async (consumerId: string, status: "ACTIVE" | "INACTIVE" | "REVOKED") => {
    try {
      await setConsumerLinkStatus(consumerId, service.id, status);
      toast.success(`Consumer marked ${status.toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const columns: Column<ConsumerSummary>[] = [
    { key: "username", header: "Username", render: (c) => c.username ?? c.customId ?? c.id },
    {
      key: "status",
      header: "On this service",
      render: (c) => {
        const link = c.services.find((s) => s.serviceId === service.id);
        const tone = link?.status === "ACTIVE" ? "green" : link?.status === "REVOKED" ? "red" : "amber";
        return <Badge tone={tone}>{link?.status ?? "—"}</Badge>;
      },
    },
    { key: "createdAt", header: "Created", render: (c) => formatDate(c.createdAt) },
    {
      key: "actions",
      header: "",
      render: (c) => {
        const link = c.services.find((s) => s.serviceId === service.id);
        if (!canUpdate || !link) return null;
        return link.status === "ACTIVE" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:bg-amber-50"
            onClick={() => void handleSetStatus(c.id, "REVOKED")}
          >
            Revoke
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:bg-emerald-50"
            onClick={() => void handleSetStatus(c.id, "ACTIVE")}
          >
            Activate
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Link consumer
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : consumers.length === 0 ? (
        <Card>
          <EmptyState title="No consumers" description="No consumers are linked to this service." />
        </Card>
      ) : (
        <Table columns={columns} rows={consumers} rowKey={(c) => c.id} />
      )}

      <ConsumerFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </div>
  );
}