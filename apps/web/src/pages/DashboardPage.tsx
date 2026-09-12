import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeader,
  Card,
  Badge,
  Spinner,
  Database,
  Activity,
  ShieldCheck,
} from "@ui";
import { fetchDashboardStats, type DashboardStats } from "@/api/dashboard";
import { formatDate } from "@/lib/format";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error !== null) {
    return (
      <div className="text-sm text-red-600">Failed to load dashboard: {error}</div>
    );
  }

  if (stats === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const healthOk = stats.health?.status === "ok";
  const healthBadge = {
    tone: healthOk ? "green" as const : "red" as const,
    label: `${healthOk ? "Healthy" : "Degraded"} · ${stats.health?.status ?? "unknown"}`,
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview at a glance"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Consumers" subtitle="Registered gateway consumers">
          <p className="text-3xl font-bold text-slate-900">{stats.consumerCount}</p>
        </Card>
        <Card title="Active Services" subtitle="Enabled gateway services">
          <p className="text-3xl font-bold text-emerald-600">{stats.activeServices}</p>
        </Card>
        <Card title="Inactive Services" subtitle="Soft-deleted / disabled">
          <p className="text-3xl font-bold text-slate-500">{stats.inactiveServices}</p>
        </Card>
        <Card title="Platform Health" subtitle="DB · Redis · Kong">
          <div className="flex items-center gap-2">
            <Badge tone={healthBadge.tone}>{healthBadge.label}</Badge>
          </div>
          <dl className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between"><dt>Database</dt><dd>{stats.health?.database ?? "?"}</dd></div>
            <div className="flex justify-between"><dt>Redis</dt><dd>{stats.health?.redis ?? "?"}</dd></div>
            <div className="flex justify-between"><dt>Kong</dt><dd>{stats.health?.kong ?? "skipped"}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Recent Audit Events"
          subtitle="Latest actions across the platform"
        >
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-400">No audit events yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      <Activity className="mr-1 inline h-3.5 w-3.5 text-brand-600" />
                      {entry.action} · {entry.resourceType}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.resourceName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDate(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link to="/audit-logs" className="text-sm font-medium text-brand-600 hover:underline">
              View all audit logs →
            </Link>
          </div>
        </Card>

        <Card title="Quick Links" subtitle="Frequent management tasks">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/services"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50"
            >
              <Database className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">Services</p>
                <p className="text-xs text-slate-500">Manage gateway services</p>
              </div>
            </Link>
            <Link
              to="/consumers"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50"
            >
              <ShieldCheck className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">Consumers</p>
                <p className="text-xs text-slate-500">Manage API consumers</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}