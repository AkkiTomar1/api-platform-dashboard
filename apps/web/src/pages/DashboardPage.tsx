import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Spinner } from "@ui";
import { Activity, PauseCircle, Power, Users } from "lucide-react";
import { fetchDashboardStats, type DashboardStats } from "@/api/dashboard";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { PERMISSIONS } from "@shared";

export function DashboardPage() {
  const { user } = useAuth();
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

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview at a glance" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Consumers" subtitle="Registered gateway consumers">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Users className="h-5 w-5" />
            </span>
            <p className="text-3xl font-bold text-slate-900">{stats.consumerCount}</p>
          </div>
          {hasPermission(user, PERMISSIONS.CONSUMERS_READ) && (
            <Link
              to="/consumers"
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              View all consumers →
            </Link>
          )}
        </Card>
        <Card title="Active Services" subtitle="Enabled gateway services">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Power className="h-5 w-5" />
            </span>
            <p className="text-3xl font-bold text-emerald-600">{stats.activeServices}</p>
          </div>
        </Card>
        <Card title="Inactive Services" subtitle="Soft-deleted / disabled">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <PauseCircle className="h-5 w-5" />
            </span>
            <p className="text-3xl font-bold text-slate-500">{stats.inactiveServices}</p>
          </div>
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

        {stats.usersByRole && stats.usersByRole.length > 0 && (
          <Card title="Users by Role" subtitle="How platform roles are distributed">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {stats.usersByRole.map((row) => (
                <div
                  key={row.role}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{row.role}</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link to="/admin" className="text-sm font-medium text-brand-600 hover:underline">
                View all roles →
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}