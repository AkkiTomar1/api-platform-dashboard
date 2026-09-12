import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { KongClient } from "../../core/kong/kong-client";
import { PermissionService } from "../../rbac/permission.service";
import { AuditService } from "../audit/audit.service";

interface CreateInput {
  name: string;
  description: string;
  kongName: string;
  tags?: string[];
  url?: string | null;
  host: string;
  path: string;
  port: number;
  protocol: "http" | "https";
}

interface TargetInput {
  url?: string | null;
  host: string;
  path: string;
  port: number;
  protocol: "http" | "https";
}

interface UpdateInput {
  name?: string;
  description?: string;
  kongName?: string;
  tags?: string[] | null;
  url?: string | null;
  host?: string;
  path?: string | null;
  port?: number | null;
  protocol?: "http" | "https" | null;
  isActive?: boolean;
}

@Injectable()
export class KongServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kong: KongClient,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: {
    search?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    sortOrder?: string;
  }, user: RequestUser) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(Math.max(1, Number(query.pageSize ?? 20) || 20), 100);
    const sort = query.sort || "name";
    const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

    const owned = await this.permissionService.ownedResourceIds(
      user.roles,
      user.permissions,
      ["services:read"],
      "service",
    );

    const where: Prisma.GatewayServiceWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { kongName: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (owned !== null) {
      if (owned.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      where.id = { in: owned };
    }

    const orderBy: Prisma.GatewayServiceOrderByWithRelationInput =
      sort === "createdAt"
        ? { createdAt: sortOrder }
        : sort === "updatedAt"
          ? { updatedAt: sortOrder }
          : { name: sortOrder };

    const [total, services] = await this.prisma.$transaction([
      this.prisma.gatewayService.count({ where }),
      this.prisma.gatewayService.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
    ]);

    const ids = services.map((s) => s.id);
    const counts = await this.prisma.serviceConsumer.groupBy({
      by: ["serviceId"],
      where: { serviceId: { in: ids }, status: "ACTIVE" },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.serviceId, c._count.id]));

    const data = services.map((s) => ({
      ...s,
      consumerCount: countMap.get(s.id) ?? 0,
    }));

    return { data, total, page, pageSize };
  }

  async findById(id: string, user: RequestUser) {
    await this.assertMembership(id, user);
    const service = await this.prisma.gatewayService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    const count = await this.prisma.serviceConsumer.count({
      where: { serviceId: id, status: "ACTIVE" },
    });
    const auditEntries = await this.prisma.auditLog.findMany({
      where: { resourceType: "service", resourceName: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return {
      ...service,
      consumerCount: count,
      auditSummary: auditEntries.map((e) => ({
        action: e.action,
        actor: e.actor,
        createdAt: e.createdAt,
      })),
    };
  }

  async create(input: CreateInput, user: RequestUser, ip?: string) {
    const existing = await this.prisma.gatewayService.findFirst({
      where: { OR: [{ kongName: input.kongName }, { name: input.name }] },
    });
    if (existing) {
      throw new ConflictException(
        `Service with name "${input.name}" or kongName "${input.kongName}" already exists`,
      );
    }

    const target = this.buildTarget(input);
    const kong = await this.kong
      .post<{ id: string; name?: string }>("/services", {
        name: input.kongName,
        ...target,
        tags: input.tags ?? [],
      })
      .catch(() => ({
        id: `kong-${input.kongName}`,
        name: input.kongName,
      }));

    const service = await this.prisma.gatewayService.create({
      data: {
        name: input.name,
        description: input.description,
        kongName: input.kongName,
        tags: input.tags ?? Prisma.JsonNull,
      },
    });

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "service",
      resourceName: service.id,
      userId: user.id,
      afterJson: {
        ...input,
        kong_id: kong.id,
      },
    });

    return { ...service, kong };
  }

  async update(
    id: string,
    input: UpdateInput,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertMembership(id, user);
    const existing = await this.prisma.gatewayService.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Service not found");
    }
    if (input.kongName && input.kongName !== existing.kongName) {
      const dup = await this.prisma.gatewayService.findFirst({
        where: { kongName: input.kongName, id: { not: id } },
      });
      if (dup) {
        throw new ConflictException(`kongName "${input.kongName}" already in use`);
      }
    }

    const target = this.buildTarget({
      host: input.host ?? "localhost",
      path: input.path ?? "/",
      port: input.port ?? 80,
      protocol: input.protocol ?? "http",
      url: input.url,
    });

    const kongPatch: Record<string, unknown> = {
      ...(input.kongName ? { name: input.kongName } : {}),
      ...target,
      ...(input.tags !== undefined ? { tags: input.tags ?? [] } : {}),
    };

    const kong = await this.kong
      .patch(`/services/${id}`, kongPatch)
      .catch(() => null);

    await this.prisma.gatewayService.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.kongName !== undefined ? { kongName: input.kongName } : {}),
        ...(input.tags !== undefined ? { tags: input.tags ?? Prisma.DbNull } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    const after = await this.prisma.gatewayService.findUnique({ where: { id } });

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "service",
      resourceName: id,
      userId: user.id,
      beforeJson: {
        name: existing.name,
        description: existing.description,
        kongName: existing.kongName,
        tags: existing.tags,
      },
      afterJson: {
        name: after?.name,
        description: after?.description,
        kongName: after?.kongName,
        tags: after?.tags,
        kong,
      },
    });

    return { ...after, kong };
  }

  async remove(id: string, user: RequestUser, ip?: string) {
    await this.assertMembership(id, user);
    const existing = await this.prisma.gatewayService.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Service not found");
    }

    await this.kong.delete(`/services/${id}`).catch(() => null);

    const updated = await this.prisma.gatewayService.update({
      where: { id },
      data: { isActive: false },
    });

    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "service",
      resourceName: id,
      userId: user.id,
      beforeJson: {
        name: existing.name,
        kongName: existing.kongName,
        isActive: existing.isActive,
      },
    });

    return updated;
  }

  private buildTarget(input: TargetInput) {
    if (input.url) {
      return { url: input.url };
    }
    return {
      host: input.host,
      path: input.path,
      port: input.port,
      protocol: input.protocol,
    };
  }

  private actorName(user: RequestUser): string {
    return user.email || user.username || `(user ${user.id})`;
  }

  private async assertMembership(id: string, user: RequestUser): Promise<void> {
    if (user.isPlatformAdmin) return;
    const allowed = await this.permissionService.canAccessResource(
      user.roles,
      user.permissions,
      ["services:read"],
      "service",
      id,
    );
    if (!allowed) {
      throw new NotFoundException("Service not found");
    }
  }
}