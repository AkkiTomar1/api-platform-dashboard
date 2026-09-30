import { useCallback, useEffect, useState } from "react";
import {
  PageHeader,
  Input,
  Select,
  Button,
  Table,
  Badge,
  Card,
  SummaryCard,
  NoAccessCard,
  SearchInput,
  toast,
  RefreshCw,
} from "@ui";
import { CircleCheck, CircleX, PenLine, ScrollText } from "lucide-react";
import type { Column } from "@ui";
import { listAuditLogs, type AuditLogEntry, type AuditListQuery } from "@/api/audit";
import { formatDate } from "@/lib/format";
import { DiffModal } from "./components/DiffModal";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { ROLES, tierOf } from "@shared";
import { QueryState } from "@/components/QueryState";
import { usePageTitle } from "@/lib/use-page-title";

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ASSIGN",
  "UNASSIGN",
  "REVOKE",
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

const ROLE_TONE: Record<string, "violet" | "blue" | "amber" | "gray"> = {
  platform: "violet",
  service: "blue",
  consumer: "amber",
};

function roleTone(role?: string): "violet" | "blue" | "amber" | "gray" {
  if (!role) return "gray";
  const tier = tierOf(role);
  return tier ? ROLE_TONE[tier] : "gray";
}

export function AuditLogsView() {
  usePageTitle("Audit Logs");
  const { user } = useAuth();
  const canRead = hasPermission(user, "audit:read");
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    creates: 0,
    updates: 0,
    deletes: 0,
    others: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<AuditListQuery>({ page: 1, pageSize: 20 });
  const [diffTarget, setDiffTarget] = useState<AuditLogEntry | null>(null);

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs(query);
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
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
      <div>
        <PageHeader title="Audit Logs" description="Field-level change history across the platform" />
        <NoAccessCard
          title="No access"
          description="You don't have permission to view audit logs."
        />
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
          <p className="mt-0.5 max-w-52 truncate text-xs text-ink-soft">{e.resourceName}</p>
        </div>
      ),
    },
    { key: "userId", header: "User", render: (e) => <span className="font-mono text-xs">{e.userId}</span> },
    {
      key: "actorRole",
      header: "Role",
      render: (e) =>
        e.actorRole ? (
          <Badge tone={roleTone(e.actorRole)}>{e.actorRole}</Badge>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        ),
    },
    { key: "ipAddress", header: "IP", render: (e) => e.ipAddress ?? "—" },
    {
      key: "changes",
      header: "Changes",
      render: (e) => (
        <button
          type="button"
          onClick={() => setDiffTarget(e)}
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View diff
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Field-level change history across the platform" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          icon={<ScrollText className="h-5 w-5" />}
          label="Total events"
          value={summary.creates + summary.updates + summary.deletes + summary.others}
        />
        <SummaryCard
          icon={<CircleCheck className="h-5 w-5" />}
          label="Creates"
          value={summary.creates}
          variant="success"
        />
        <SummaryCard
          icon={<PenLine className="h-5 w-5" />}
          label="Updates"
          value={summary.updates}
        />
        <SummaryCard
          icon={<CircleX className="h-5 w-5" />}
          label="Deletes"
          value={summary.deletes}
          variant="error"
        />
      </div>

      <Card className="mt-6" title="Filters" subtitle="Narrow the audit trail">
        <div className="flex flex-wrap gap-3">
          <Select
            className="w-full sm:w-48"
            label="Action"
            value={query.action ?? ""}
            onChange={(e) => updateFilter({ action: e.target.value || undefined })}
            options={[{ value: "", label: "All actions" }, ...ACTIONS.map((a) => ({ value: a, label: a }))]}
          />
          <Select
            className="w-full sm:w-48"
            label="Resource type"
            value={query.userType ?? ""}
            onChange={(e) => updateFilter({ userType: e.target.value || undefined })}
            options={[
              { value: "", label: "All resources" },
              ...RESOURCE_TYPES.map((r) => ({ value: r, label: r })),
            ]}
          />
          <Select
            className="w-full sm:w-48"
            label="Role"
            value={query.actorRole ?? ""}
            onChange={(e) => updateFilter({ actorRole: e.target.value || undefined })}
            options={[
              { value: "", label: "All roles" },
              ...ROLES.map((r) => ({ value: r, label: r })),
            ]}
          />
          <div className="flex flex-wrap items-end gap-3">
            <Input
              className="w-44"
              label="From"
              type="datetime-local"
              value={query.dateFrom ?? ""}
              onChange={(e) => updateFilter({ dateFrom: e.target.value || undefined })}
            />
            <Input
              className="w-44"
              label="To"
              type="datetime-local"
              value={query.dateTo ?? ""}
              onChange={(e) => updateFilter({ dateTo: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Filter by user ID"
            value={query.userId ?? ""}
            onChange={(e) => updateFilter({ userId: e.target.value || undefined })}
          />
          <SearchInput
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
      </Card>

      <QueryState loading={loading} error={error} onRetry={load}>
        <Table
          columns={columns}
          rows={data}
          rowKey={(e) => e.id}
          onRowClick={(e) => setDiffTarget(e)}
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ink-soft">{total} events</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter({ page: page - 1 })}
            >
              Prev
            </Button>
            <span className="flex items-center px-2 text-sm text-ink">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * pageSize >= total}
              onClick={() => updateFilter({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </QueryState>

      <DiffModal entry={diffTarget} onClose={() => setDiffTarget(null)} />
    </div>
  );
}