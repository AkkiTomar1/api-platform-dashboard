import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuditListQuery, RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PermissionService } from "../../rbac/permission.service";
import { sanitize } from "./audit.helpers";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private static readonly MAX_LIMIT = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  record(input: {
    action: string;
    actor: string;
    ipAddress?: string | null;
    resourceType: string;
    resourceName: string;
    userId: string;
    beforeJson?: unknown;
    afterJson?: unknown;
  }): void {
    if (!input.resourceName || input.resourceName.trim() === "") {
      throw new Error("resourceName must be a non-empty string");
    }
    if (!input.userId || input.userId.trim() === "") {
      throw new Error("userId must be a non-empty string");
    }

    const payload = {
      action: input.action,
      actor: input.actor,
      ipAddress: input.ipAddress ?? null,
      resourceType: input.resourceType,
      resourceName: input.resourceName.trim(),
      userId: input.userId,
      beforeJson: input.beforeJson
        ? (sanitize(input.beforeJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      afterJson: input.afterJson
        ? (sanitize(input.afterJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };

    void this.prisma.auditLog
      .create({ data: payload })
      .catch((err) => {
        this.logger.error(`Failed to persist audit log: ${String(err)}`);
      });
  }

  async list(
    query: AuditListQuery,
    user: RequestUser,
  ): Promise<{ data: unknown[]; total: number; page: number; pageSize: number }> {
    const page = safeInt(query.page, 1);
    const pageSize = Math.min(safeInt(query.pageSize, 20), 100);
    const limit = Math.min(safeInt(query.limit, pageSize), AuditService.MAX_LIMIT);

    const where: Prisma.AuditLogWhereInput = {};

    const owned = await this.permissionService.ownedResourceIds(
      user.roles,
      user.permissions,
      ["audit:read"],
      "service",
    );

    if (owned && owned.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    if (query.action) {
      where.action = { equals: query.action };
    }
    if (query.userType) {
      where.resourceType = { equals: query.userType };
    }
    if (query.userId) {
      where.userId = { equals: query.userId };
    }
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.dateFrom) {
      createdAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      createdAt.lte = new Date(query.dateTo);
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = createdAt;
    }

    const orClauses: Prisma.AuditLogWhereInput[] = [];

    const isShadowAdmin =
      user.isPlatformAdmin ||
      user.roles.some((r) => r.role === "platform_admin" || r.role === "platform_dev");

    if (!isShadowAdmin) {
      if (owned) {
        orClauses.push(
          { userId: user.id },
          { resourceType: "service", resourceName: { in: owned } },
        );
      } else {
        orClauses.push({ userId: user.id });
      }
    }

    if (query.serviceId && query.consumerId) {
      orClauses.push(
        { resourceName: { equals: query.serviceId } },
        { resourceName: { equals: query.consumerId } },
      );
    } else if (query.serviceId) {
      orClauses.push({ resourceName: { equals: query.serviceId } });
    } else if (query.consumerId) {
      orClauses.push({ resourceName: { equals: query.consumerId } });
    }

    if (orClauses.length > 0) {
      where.OR = orClauses;
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    const resolved = await this.resolveNames(rows);
    return {
      data: resolved,
      total,
      page,
      pageSize: limit,
    };
  }

  private async resolveNames(rows: Array<Record<string, unknown>>) {
    const serviceIds = new Set<string>();
    const consumerIds = new Set<string>();
    for (const row of rows) {
      if (row.resourceType === "service") {
        serviceIds.add(String(row.resourceName));
      }
      if (row.resourceType === "consumer") {
        consumerIds.add(String(row.resourceName));
      }
      const after = asRecord(row.afterJson);
      const before = asRecord(row.beforeJson);
      if (after && typeof after.service_id === "string") {
        serviceIds.add(after.service_id);
      }
      if (before && typeof before.service_id === "string") {
        serviceIds.add(before.service_id);
      }
    }

    const [services, consumers] = await Promise.all([
      serviceIds.size
        ? this.prisma.gatewayService.findMany({
            where: { id: { in: [...serviceIds] } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      consumerIds.size
        ? this.prisma.kongConsumer.findMany({
            where: { id: { in: [...consumerIds] } },
            select: { id: true, username: true },
          })
        : Promise.resolve([]),
    ]);

    const svcMap = new Map(services.map((s) => [s.id, s.name]));
    const conMap = new Map(
      consumers.map((c) => [c.id, c.username ?? c.id]),
    );

    return rows.map((row) => {
      const out = { ...row };
      if (row.resourceType === "service" && svcMap.has(String(row.resourceName))) {
        out.resourceName = svcMap.get(String(row.resourceName)) as string;
      }
      if (row.resourceType === "consumer" && conMap.has(String(row.resourceName))) {
        out.resourceName = conMap.get(String(row.resourceName)) as string;
      }
      return out;
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function safeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}