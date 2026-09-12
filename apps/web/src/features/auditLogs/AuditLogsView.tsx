import { useCallback, useEffect, useState } from "react";
import {
  PageHeader,
  Input,
  Select,
  Button,
  Table,
  Badge,
  Spinner,
  toast,
  RefreshCw,
} from "@ui";
import type { Column } from "@ui";
import { listAuditLogs, type AuditLogEntry, type AuditListQuery } from "@/api/audit";
import { formatDate } from "@/lib/format";
import { DiffModal } from "./components/DiffModal";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ASSIGN",
  "UNASSIGN",
  "REVOKE",
  "LOGIN",
  "LOGOUT",
];

const RESOURCE_TYPES = [
  "service",
  "route",
  "plugin",
  "consumer",
  "credential",
  "role",
  "user",
  "system",
];

export function AuditLogsView() {
  const { user } = useAuth();
  const canRead = hasPermission(user, "audit:read");
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState<AuditListQuery>({ page: 1, pageSize: 20 });
  const [diffTarget, setDiffTarget] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs(query);
      setData(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <div className="text-sm text-red-600">
        You do not have permission to view audit logs.
      </div>
    );
  }

  const updateFilter = (patch: Partial<AuditListQuery>) => {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
  };

  const columns: Column<AuditLogEntry>[] = [
    { key: "createdAt", header: "Timestamp", render: (e) => formatDate(e.createdAt) },
    {
      key: "action",
      header: "Action",
      render: (e) => {
        const tone =
          e.action === "CREATE"
            ? "green"
            : e.action === "DELETE" || e.action === "UNASSIGN" || e.action === "REVOKE"
              ? "red"
              : e.action === "UPDATE" || e.action === "ASSIGN"
                ? "amber"
                : "blue";
        return <Badge tone={tone}>{e.action}</Badge>;
      },
    },
    {
      key: "resource",
      header: "Resource",
      render: (e) => (
        <div>
          <Badge tone="gray">{e.resourceType}</Badge>
          <p className="mt-0.5 truncate text-xs text-slate-500 max-w-52">{e.resourceName}</p>
        </div>
      ),
    },
    { key: "userId", header: "User", render: (e) => <span className="font-mono text-xs">{e.userId}</span> },
    { key: "ipAddress", header: "IP", render: (e) => e.ipAddress ?? "—" },
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
      <PageHeader title="Audit Logs" description="Field-level change history across the platform" />

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Action"
          value={query.action ?? ""}
          onChange={(e) => updateFilter({ action: e.target.value || undefined })}
          options={[{ value: "", label: "All actions" }, ...ACTIONS.map((a) => ({ value: a, label: a }))]}
        />
        <Select
          label="Resource type"
          value={query.userType ?? ""}
          onChange={(e) => updateFilter({ userType: e.target.value || undefined })}
          options={[
            { value: "", label: "All resources" },
            ...RESOURCE_TYPES.map((r) => ({ value: r, label: r })),
          ]}
        />
        <Input
          label="From"
          type="datetime-local"
          value={query.dateFrom ?? ""}
          onChange={(e) => updateFilter({ dateFrom: e.target.value || undefined })}
        />
        <Input
          label="To"
          type="datetime-local"
          value={query.dateTo ?? ""}
          onChange={(e) => updateFilter({ dateTo: e.target.value || undefined })}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-64"
          placeholder="Filter by user ID"
          value={query.userId ?? ""}
          onChange={(e) => updateFilter({ userId: e.target.value || undefined })}
        />
        <Input
          className="w-64"
          placeholder="Service ID"
          value={query.serviceId ?? ""}
          onChange={(e) => updateFilter({ serviceId: e.target.value || undefined })}
        />
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            rows={data}
            rowKey={(e) => e.id}
            onRowClick={(e) => setDiffTarget(e)}
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} events</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); setQuery((q) => ({ ...q, page: page - 1 })); }}>
                Prev
              </Button>
              <span className="flex items-center px-2 text-sm text-slate-600">Page {page}</span>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); setQuery((q) => ({ ...q, page: page + 1 })); }}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <DiffModal entry={diffTarget} onClose={() => setDiffTarget(null)} />
    </div>
  );
}