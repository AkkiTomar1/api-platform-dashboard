import { apiClient } from "./client";
import type { GatewayServiceSummary } from "./services";

export interface DashboardStats {
  consumerCount: number;
  activeServices: number;
  inactiveServices: number;
  health: {
    status: string;
    database?: string;
    redis?: string;
    kong?: string;
    degraded?: boolean;
  };
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

export type { GatewayServiceSummary };