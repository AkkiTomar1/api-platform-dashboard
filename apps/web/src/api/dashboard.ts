import { apiClient } from "./client";
import type { GatewayServiceSummary } from "./services";

export interface DashboardStats {
  consumerCount: number;
  activeServices: number;
  inactiveServices: number;
  routeCount: number | null;
  pluginCount: number | null;
  health: {
    status: string;
    database?: string;
    redis?: string;
    kong?: string;
    degraded?: boolean;
  };
  tier: string[];
  roles: string[];
  usersByRole: Array<{ role: string; count: number }>;
  recentAudit: Array<{
    id: string;
    action: string;
    actor: string;
    resourceType: string;
    resourceName: string;
    userId: string;
    createdAt: string;
  }>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<DashboardStats>("/dashboard/stats");
  return res.data;
}

export interface HealthCheck {
  status: string;
  database?: string;
  redis?: string;
  kong?: string;
  degraded?: boolean;
}

export async function getHealth(): Promise<HealthCheck> {
  const res = await apiClient.get<HealthCheck>("/health");
  return res.data;
}

export type { GatewayServiceSummary };