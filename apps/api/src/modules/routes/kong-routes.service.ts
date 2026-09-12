import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { KongClient } from "../../core/kong/kong-client";
import { PermissionService } from "../../rbac/permission.service";
import { AuditService } from "../audit/audit.service";

interface RouteCreateInput {
  name: string;
  paths: string[];
  methods?: string[];
  hosts?: string[];
  protocols?: string[];
  stripPath?: boolean;
  preserveHost?: boolean;
  serviceId: string;
}

@Injectable()
export class KongRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kong: KongClient,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
  ) {}

  async list(serviceId: string, user: RequestUser) {
    await this.assertServiceAccess(serviceId, user);
    const service = await this.prisma.gatewayService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    const kong = await this.kong
      .get<{ data: unknown[] }>(`/services/${service.kongName}/routes`)
      .catch(() => ({ data: [] }));
    return kong.data;
  }

  async findById(serviceId: string, routeId: string, user: RequestUser) {
    await this.assertServiceAccess(serviceId, user);
    const service = await this.prisma.gatewayService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    const route = await this.kong.get(`/routes/${routeId}`).catch(() => null);
    if (!route) {
      throw new NotFoundException("Route not found");
    }
    return route;
  }

  async create(input: RouteCreateInput, user: RequestUser, ip?: string) {
    const service = await this.requireService(input.serviceId);
    await this.assertServiceAccess(input.serviceId, user);

    const existing = await this.kong
      .get<{ data: Array<{ id: string }> }>(`/services/${service.kongName}/routes`)
      .catch(() => ({ data: [] }));
    if (existing.data.some((r) => this.routeNameMatches(r, input.name))) {
      throw new ConflictException(`Route "${input.name}" already exists on service`);
    }

    const created = await this.kong.post<{ id?: string }>(`/services/${service.kongName}/routes`, {
      name: input.name,
      paths: input.paths,
      methods: input.methods ?? [],
      hosts: input.hosts ?? [],
      protocols: input.protocols ?? ["http", "https"],
      strip_path: input.stripPath ?? true,
      preserve_host: input.preserveHost ?? false,
    });

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "route",
      resourceName: created.id ?? input.name,
      userId: user.id,
      afterJson: input,
    });

    return created;
  }

  async update(
    serviceId: string,
    routeId: string,
    input: Partial<RouteCreateInput>,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertServiceAccess(serviceId, user);
    const service = await this.requireService(serviceId);

    const before = await this.kong.get(`/routes/${routeId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Route not found");
    }

    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.paths !== undefined) body.paths = input.paths;
    if (input.methods !== undefined) body.methods = input.methods;
    if (input.hosts !== undefined) body.hosts = input.hosts;
    if (input.protocols !== undefined) body.protocols = input.protocols;
    if (input.stripPath !== undefined) body.strip_path = input.stripPath;
    if (input.preserveHost !== undefined) body.preserve_host = input.preserveHost;

    const updated = await this.kong.patch(`/routes/${routeId}`, body);

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "route",
      resourceName: routeId,
      userId: user.id,
      beforeJson: before,
      afterJson: updated,
    });

    void service;
    return updated;
  }

  async remove(serviceId: string, routeId: string, user: RequestUser, ip?: string) {
    await this.assertServiceAccess(serviceId, user);
    const before = await this.kong.get(`/routes/${routeId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Route not found");
    }
    await this.kong.delete(`/routes/${routeId}`);
    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "route",
      resourceName: routeId,
      userId: user.id,
      beforeJson: before,
    });
    return { ok: true };
  }

  private routeNameMatches(route: { name?: string; id: string }, name: string) {
    return route.name === name || route.name === undefined && route.id === name;
  }

  private actorName(user: RequestUser): string {
    return user.email || user.username || `(user ${user.id})`;
  }

  private async requireService(serviceId: string) {
    const service = await this.prisma.gatewayService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    return service;
  }

  private async assertServiceAccess(serviceId: string, user: RequestUser) {
    if (user.isPlatformAdmin) return;
    const allowed = await this.permissionService.canAccessResource(
      user.roles,
      user.permissions,
      ["routes:read"],
      "service",
      serviceId,
    );
    if (!allowed) {
      throw new NotFoundException("Service not found");
    }
  }
}