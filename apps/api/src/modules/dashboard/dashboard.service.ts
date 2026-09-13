import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PERMISSIONS, tierOf, type Permission, type Tier } from "@shared";
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

    const isShadowAdmin =
      user.isPlatformAdmin ||
      user.roles.some((r) => tierOf(r.role) === "platform");
    const canSeeConsumers = user.permissions.includes(PERMISSIONS.CONSUMERS_READ);
    const canSeeCredentials = user.permissions.includes(PERMISSIONS.CREDENTIALS_READ);

    const auditWhere: Prisma.AuditLogWhereInput = {};
    if (!isShadowAdmin) {
      const orClauses: Prisma.AuditLogWhereInput[] =
        owned === null
          ? [{ userId: user.id }]
          : [
              { userId: user.id },
              { resourceType: "service", resourceName: { in: owned } },
            ];
      if (canSeeConsumers || canSeeCredentials) {
        orClauses.push({ resourceType: { in: ["consumer", "credential"] } });
      }
      auditWhere.OR = orClauses;
    }

    const [consumerCount, activeServices, inactiveServices, usersByRole, recentAudit] =
      await Promise.all([
        this.prisma.kongConsumer.count(),
        this.prisma.gatewayService.count({
          where: { ...serviceWhere, isActive: true },
        }),
        this.prisma.gatewayService.count({
          where: { ...serviceWhere, isActive: false },
        }),
        user.permissions.includes(PERMISSIONS.ADMIN_USERS)
          ? this.prisma.roleAssignment.groupBy({
              by: ["role"],
              _count: { role: true },
            })
          : Promise.resolve([]),
        this.prisma.auditLog.findMany({
          where: auditWhere,
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

    const tiers = new Set<Tier>();
    for (const r of user.roles) {
      const tier = tierOf(r.role);
      if (tier) tiers.add(tier);
    }

    return {
      consumerCount,
      activeServices,
      inactiveServices,
      health,
      recentAudit,
      tier: [...tiers],
      roles: user.roles.map((r) => r.role),
      usersByRole: usersByRole.map((row) => ({ role: row.role, count: row._count.role })),
    };
  }
}