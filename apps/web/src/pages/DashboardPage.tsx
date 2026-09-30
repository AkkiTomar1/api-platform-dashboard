import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  SummaryCard,
  NoAccessCard,
  cn,
} from "@ui";
import {
  Activity,
  ArrowRight,
  Boxes,
  LayoutGrid,
  Puzzle,
  RefreshCw,
  Users,
} from "lucide-react";
import { fetchDashboardStats, type DashboardStats } from "@/api/dashboard";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { PERMISSIONS } from "@shared";
import { QueryState } from "@/components/QueryState";
import { usePageTitle } from "@/lib/use-page-title";

export function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setStats(await fetchDashboardStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    void load();
  };

  const canReadServices = hasPermission(user, PERMISSIONS.SERVICES_READ);
  const canReadConsumers = hasPermission(user, PERMISSIONS.CONSUMERS_READ);
  const canReadRoutes = hasPermission(user, PERMISSIONS.ROUTES_READ);
  const canReadPlugins = hasPermission(user, PERMISSIONS.PLUGINS_READ);
  const canReadAudit = hasPermission(user, PERMISSIONS.AUDIT_READ);
  const canSeeAnything =
    canReadServices || canReadConsumers || canReadRoutes || canReadPlugins || canReadAudit;

  const header = (
    <PageHeader
      title="Dashboard"
      description="Platform overview at a glance"
      actions={
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading || refreshing}>
          <RefreshCw
            className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")}
          />
          Refresh
        </Button>
      }
    />
  );

  if (loading || stats === null) {
    return (
      <div>
        {header}
        <QueryState loading={loading} error={error} onRetry={() => void load()}>
          <div />
        </QueryState>
      </div>
    );
  }

  if (!canSeeAnything) {
    return (
      <div>
        {header}
        <NoAccessCard
          title="No access"
          description="You don't have read access to any dashboard section."
        />
      </div>
    );
  }

  const totalServices = stats.activeServices + stats.inactiveServices;

  const summaryCards = [
    {
      key: "services",
      show: canReadServices,
      icon: <Boxes className="h-5 w-5" />,
      label: "Total Services",
      value:
        canReadServices ? (
          <span>
            {totalServices}
            <span className="ml-2 text-sm font-medium text-ink-soft">
              {stats.activeServices} active · {stats.inactiveServices} inactive
            </span>
          </span>
        ) : null,
    },
    {
      key: "consumers",
      show: canReadConsumers,
      icon: <Users className="h-5 w-5" />,
      label: "Consumers",
      value: stats.consumerCount,
    },
    {
      key: "routes",
      show: canReadRoutes,
      icon: <Puzzle className="h-5 w-5" />,
      label: "Routes",
      value: stats.routeCount ?? "—",
    },
    {
      key: "plugins",
      show: canReadPlugins,
      icon: <LayoutGrid className="h-5 w-5" />,
      label: "Plugins",
      value: stats.pluginCount ?? "—",
    },
  ].filter((card) => card.show);

  const quickLinks = [
    {
      to: "/services",
      title: "Services",
      description: `${stats.activeServices} active · ${stats.inactiveServices} inactive`,
      icon: <Boxes className="h-5 w-5" />,
      show: canReadServices,
    },
    {
      to: "/consumers",
      title: "Consumers",
      description: `${stats.consumerCount} registered consumers`,
      icon: <Users className="h-5 w-5" />,
      show: canReadConsumers,
    },
    {
      to: "/audit-logs",
      title: "Audit Logs",
      description: "Latest activity across the platform",
      icon: <Activity className="h-5 w-5" />,
      show: canReadAudit,
    },
  ].filter((link) => link.show);

  return (
    <div>
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={card.value}
          />
        ))}
      </div>

      {quickLinks.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface-card p-4 shadow-sm shadow-slate-950/5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-500/10 dark:hover:border-brand-500/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300">
                  {link.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-strong">{link.title}</p>
                  <p className="truncate text-xs text-ink-soft">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Recent Audit Events" subtitle="Latest actions across the platform">
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-ink-faint">No audit events yet.</p>
          ) : (
            <ul className="-mx-2 space-y-3">
              {stats.recentAudit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted/60"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-strong">
                      <Activity className="mr-1 inline h-3.5 w-3.5 text-brand-500" />
                      {entry.action} · <Badge tone="violet">{entry.resourceType}</Badge>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {entry.resourceName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {formatDate(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canReadAudit ? (
            <div className="mt-4">
              <Link
                to="/audit-logs"
                className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                View all audit logs →
              </Link>
            </div>
          ) : null}
        </Card>

        {stats.usersByRole && stats.usersByRole.length > 0 ? (
          <Card title="Users by Role" subtitle="How platform roles are distributed">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.usersByRole.map((row) => (
                <div
                  key={row.role}
                  className="flex items-center justify-between rounded-xl border border-hairline bg-surface-inset px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-ink-soft" />
                    <span className="text-sm font-medium text-ink">{row.role}</span>
                  </div>
                  <span className="text-2xl font-bold text-ink-strong">{row.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                to="/admin"
                className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                View all roles →
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}