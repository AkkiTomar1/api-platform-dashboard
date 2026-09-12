import { useCallback, useEffect, useState } from "react";
import { Card, Table, Badge, EmptyState, Spinner, toast } from "@ui";
import type { Column } from "@ui";
import { listAuditLogs, type AuditLogEntry } from "@/api/audit";
import type { ServiceDetail } from "@/api/services";
import { formatDate } from "@/lib/format";
import { DiffModal } from "@/features/auditLogs/components/DiffModal";

export function AuditHistoryTab({ service }: { service: ServiceDetail }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffTarget, setDiffTarget] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({
        serviceId: service.id,
        pageSize: 25,
        limit: 50,
      });
      setEntries(res.data);
    } catch {
      toast.error("Failed to load audit history");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuditLogEntry>[] = [
    { key: "createdAt", header: "Timestamp", render: (e) => formatDate(e.createdAt) },
    {
      key: "action",
      header: "Action",
      render: (e) => {
        const tone =
          e.action === "CREATE"
            ? "green"
            : e.action === "DELETE"
              ? "red"
              : e.action === "UPDATE"
                ? "amber"
                : "blue";
        return <Badge tone={tone}>{e.action}</Badge>;
      },
    },
    { key: "actor", header: "Actor", render: (e) => e.actor },
    {
      key: "changes",
      header: "Changes",
      render: (e) => (
        <button
          type="button"
          onClick={() => setDiffTarget(e)}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          View diff
        </button>
      ),
    },
  ];

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState title="No audit events" description="No activity for this service yet." />
        </Card>
      ) : (
        <Table columns={columns} rows={entries} rowKey={(e) => e.id} />
      )}

      <DiffModal entry={diffTarget} onClose={() => setDiffTarget(null)} />
    </div>
  );
}