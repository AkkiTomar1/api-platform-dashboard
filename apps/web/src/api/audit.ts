import { apiClient } from "./client";

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  ipAddress: string | null;
  resourceType: string;
  resourceName: string;
  userId: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditListResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditListQuery {
  page?: number;
  pageSize?: number;
  limit?: number;
  action?: string;
  userType?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  serviceId?: string;
  consumerId?: string;
}

export async function listAuditLogs(
  query: AuditListQuery = {},
): Promise<AuditListResult> {
  const res = await apiClient.get<AuditListResult>("/audit-logs", { params: query });
  return res.data;
}