export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ASSIGN"
  | "UNASSIGN"
  | "REVOKE"
  | "AUTH"
  | "VIEW"
  | "OTHER";

export type AuditResourceType =
  | "service"
  | "route"
  | "plugin"
  | "consumer"
  | "credential"
  | "role"
  | "user"
  | "system";

export const SENSITIVE_KEYS: readonly string[] = [
  "key",
  "secret",
  "client_secret",
  "password",
  "public_key",
  "private_key",
  "rsa_public_key",
];

export interface AuditRecordInput {
  action: string;
  actor: string;
  ipAddress?: string | null;
  resourceType: string;
  resourceName: string;
  userId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
}

export interface ResolvedAuditEntry {
  id: string;
  action: string;
  actor: string;
  ipAddress?: string | null;
  resourceType: string;
  resourceName: string;
  userId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  createdAt: Date | string;
  actorRoles?: string[];
  actorRole?: string;
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
  actorRole?: string;
}

export interface AuditListResult {
  data: ResolvedAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FieldDiff {
  field: string;
  before?: unknown;
  after?: unknown;
}
