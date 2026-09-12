import { Injectable } from "@nestjs/common";
import type { Permission } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { HealthService } from "../health/health.service";
import { PermissionService } from "../../rbac/permission.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthService,
    private readonly permissionService: PermissionService,
  ) {}

  async stats(user: {
    id: string;
    roles: Array<{ role: string; resourceId?: string | null; resourceType?: string | null }>;
    permissions: Permission[];
    isPlatformAdmin: boolean;
  }) {
    const owned = await this.permissionService.ownedResourceIds(
      user.roles,
      user.permissions,
      ["services:read"],
      "service",
    );

    const serviceWhere =
      owned === null ? {} : owned.length === 0 ? { id: "never" } : { id: { in: owned } };

    const [consumerCount, activeServices, inactiveServices, recentAudit] =
      await Promise.all([
        this.prisma.kongConsumer.count(),
        this.prisma.gatewayService.count({
          where: { ...serviceWhere, isActive: true },
        }),
        this.prisma.gatewayService.count({
          where: { ...serviceWhere, isActive: false },
        }),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            action: true,
            actor: true,
            resourceType: true,
            resourceName: true,
            userId: true,
            createdAt: true,
          },
        }),
      ]);

    let health: unknown = undefined;
    try {
      health = await this.health.check();
    } catch (err) {
      health = {
        status: "partial",
        degraded: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    return { consumerCount, activeServices, inactiveServices, health, recentAudit };
  }
}