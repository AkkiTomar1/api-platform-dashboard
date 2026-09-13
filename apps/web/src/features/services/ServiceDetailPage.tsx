import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  PageHeader,
  Tabs,
  Badge,
  Spinner,
  toast,
  ChevronLeft,
} from "@ui";
import { getService, type ServiceDetail } from "@/api/services";
import { RoutesTab } from "./tabs/RoutesTab";
import { PluginsTab } from "./tabs/PluginsTab";
import { ConsumersTab } from "./tabs/ConsumersTab";
import { CredentialsTab } from "./tabs/CredentialsTab";
import { AuditHistoryTab } from "./tabs/AuditHistoryTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { PERMISSIONS } from "@shared";

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const canReadConsumers = hasPermission(user, PERMISSIONS.CONSUMERS_READ);
  const canReadCredentials = hasPermission(user, PERMISSIONS.CREDENTIALS_READ);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await getService(id);
      setService(detail);
    } catch {
      toast.error("Failed to load service");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || service === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview", content: <OverviewTab service={service} /> },
    { key: "routes", label: "Routes", content: <RoutesTab service={service} /> },
    { key: "plugins", label: "Plugins", content: <PluginsTab service={service} /> },
    ...(canReadConsumers
      ? [{ key: "consumers", label: "Consumers", content: <ConsumersTab service={service} /> }]
      : []),
    ...(canReadCredentials
      ? [{ key: "credentials", label: "Credentials", content: <CredentialsTab service={service} /> }]
      : []),
    { key: "audit-history", label: "Audit History", content: <AuditHistoryTab service={service} /> },
  ];

  return (
    <div>
      <Link to="/services" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="h-4 w-4" /> Services
      </Link>
      <PageHeader
        title={service.name}
        description={`${service.kongName} · ${service.description}`}
        breadcrumbs={["Services", service.name]}
        actions={
          <Badge tone={service.isActive ? "green" : "red"}>
            {service.isActive ? "Active" : "Inactive"}
          </Badge>
        }
      />

      <Tabs items={tabs} activeKey={tab} onChange={setTab} />
    </div>
  );
}