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
import { sanitize } from "../audit/audit.helpers";

interface PluginCreateInput {
  name: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  protocols?: string[];
  serviceId: string;
}

@Injectable()
export class KongPluginsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kong: KongClient,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
  ) {}

  async list(serviceId: string, user: RequestUser) {
    await this.assertServiceAccess(serviceId, user);
    const service = await this.requireService(serviceId);
    const kong = await this.kong
      .get<{ data: unknown[] }>(`/services/${service.kongName}/plugins`)
      .catch(() => ({ data: [] }));
    return kong.data;
  }

  async create(input: PluginCreateInput, user: RequestUser, ip?: string) {
    const service = await this.requireService(input.serviceId);
    await this.assertServiceAccess(input.serviceId, user);

    const existing = await this.kong
      .get<{ data: Array<{ name?: string; id: string }> }>(
        `/services/${service.kongName}/plugins`,
      )
      .catch(() => ({ data: [] }));
    if (existing.data.some((p) => p.name === input.name)) {
      throw new ConflictException(
        `Plugin "${input.name}" already enabled on service`,
      );
    }

    const created = await this.kong.post<{ id?: string }>(`/services/${service.kongName}/plugins`, {
      name: input.name,
      config: input.config ?? {},
      enabled: input.enabled ?? true,
      protocols: input.protocols ?? ["http", "https"],
    });

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: created.id ?? input.name,
      userId: user.id,
      afterJson: sanitize({ ...input, service_id: service.kongName }),
    });

    return created;
  }

  async update(
    serviceId: string,
    pluginId: string,
    input: Partial<Omit<PluginCreateInput, "serviceId">>,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertServiceAccess(serviceId, user);
    const service = await this.requireService(serviceId);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }

    const body: Record<string, unknown> = {};
    if (input.config !== undefined) body.config = input.config;
    if (input.enabled !== undefined) body.enabled = input.enabled;
    if (input.protocols !== undefined) body.protocols = input.protocols;

    const updated = await this.kong.patch(`/plugins/${pluginId}`, body);

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
      afterJson: sanitize(updated),
    });

    void service;
    return updated;
  }

  async remove(serviceId: string, pluginId: string, user: RequestUser, ip?: string) {
    await this.assertServiceAccess(serviceId, user);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }
    await this.kong.delete(`/plugins/${pluginId}`);
    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
    });
    return { ok: true };
  }

  async listByRoute(routeId: string, user: RequestUser) {
    await this.assertRouteAccess(routeId, user);
    const kong = await this.kong
      .get<{ data: unknown[] }>(`/routes/${routeId}/plugins`)
      .catch(() => ({ data: [] }));
    return kong.data;
  }

  async createByRoute(
    input: Omit<PluginCreateInput, "serviceId"> & { routeId: string },
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertRouteAccess(input.routeId, user);
    await this.assertPluginNameFree(
      `/routes/${input.routeId}/plugins`,
      input.name,
    );

    const created = await this.kong.post<{ id?: string }>(
      `/routes/${input.routeId}/plugins`,
      {
        name: input.name,
        config: input.config ?? {},
        enabled: input.enabled ?? true,
        protocols: input.protocols ?? ["http", "https"],
      },
    );

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: created.id ?? input.name,
      userId: user.id,
      afterJson: sanitize({ ...input, route_id: input.routeId }),
    });

    return created;
  }

  async updateByRoute(
    routeId: string,
    pluginId: string,
    input: Partial<Omit<PluginCreateInput, "serviceId">>,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertRouteAccess(routeId, user);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }

    const body: Record<string, unknown> = {};
    if (input.config !== undefined) body.config = input.config;
    if (input.enabled !== undefined) body.enabled = input.enabled;
    if (input.protocols !== undefined) body.protocols = input.protocols;

    const updated = await this.kong.patch(`/plugins/${pluginId}`, body);

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
      afterJson: sanitize(updated),
    });

    return updated;
  }

  async removeByRoute(routeId: string, pluginId: string, user: RequestUser, ip?: string) {
    await this.assertRouteAccess(routeId, user);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }
    await this.kong.delete(`/plugins/${pluginId}`);
    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
    });
    return { ok: true };
  }

  async listByConsumer(consumerId: string, user: RequestUser) {
    const ref = await this.assertConsumerAccess(consumerId, user);
    const kong = await this.kong
      .get<{ data: unknown[] }>(`/consumers/${ref}/plugins`)
      .catch(() => ({ data: [] }));
    return kong.data;
  }

  async createByConsumer(
    input: Omit<PluginCreateInput, "serviceId"> & { consumerId: string },
    user: RequestUser,
    ip?: string,
  ) {
    const ref = await this.assertConsumerAccess(input.consumerId, user);
    await this.assertPluginNameFree(`/consumers/${ref}/plugins`, input.name);

    const created = await this.kong.post<{ id?: string }>(
      `/consumers/${ref}/plugins`,
      {
        name: input.name,
        config: input.config ?? {},
        enabled: input.enabled ?? true,
        protocols: input.protocols ?? ["http", "https"],
      },
    );

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: created.id ?? input.name,
      userId: user.id,
      afterJson: sanitize({ ...input, consumer_id: input.consumerId }),
    });

    return created;
  }

  async updateByConsumer(
    consumerId: string,
    pluginId: string,
    input: Partial<Omit<PluginCreateInput, "serviceId">>,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertConsumerAccess(consumerId, user);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }

    const body: Record<string, unknown> = {};
    if (input.config !== undefined) body.config = input.config;
    if (input.enabled !== undefined) body.enabled = input.enabled;
    if (input.protocols !== undefined) body.protocols = input.protocols;

    const updated = await this.kong.patch(`/plugins/${pluginId}`, body);

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
      afterJson: sanitize(updated),
    });

    return updated;
  }

  async removeByConsumer(
    consumerId: string,
    pluginId: string,
    user: RequestUser,
    ip?: string,
  ) {
    await this.assertConsumerAccess(consumerId, user);
    const before = await this.kong.get(`/plugins/${pluginId}`).catch(() => null);
    if (!before) {
      throw new NotFoundException("Plugin not found");
    }
    await this.kong.delete(`/plugins/${pluginId}`);
    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "plugin",
      resourceName: pluginId,
      userId: user.id,
      beforeJson: sanitize(before),
    });
    return { ok: true };
  }

  private async assertPluginNameFree(path: string, name: string) {
    const existing = await this.kong
      .get<{ data: Array<{ name?: string; id: string }> }>(path)
      .catch(() => ({ data: [] }));
    if (existing.data.some((p) => p.name === name)) {
      throw new ConflictException(
        `Plugin "${name}" already enabled on this level`,
      );
    }
  }

  private async assertRouteAccess(routeId: string, user: RequestUser) {
    if (user.isPlatformAdmin) return;

    const route = await this.kong
      .get<{ service?: { id?: string } }>(`/routes/${routeId}`)
      .catch(() => null);
    const kongServiceId = route?.service?.id;
    if (!route || !kongServiceId) {
      throw new NotFoundException("Route not found");
    }

    const kongService = await this.kong
      .get<{ name?: string }>(`/services/${kongServiceId}`)
      .catch(() => null);
    if (!kongService?.name) {
      throw new NotFoundException("Service not found");
    }

    const dbService = await this.prisma.gatewayService.findFirst({
      where: { kongName: kongService.name },
    });
    if (!dbService) {
      throw new NotFoundException("Service not found");
    }

    const allowed = await this.permissionService.canAccessResource(
      user.roles,
      user.permissions,
      ["plugins:read"],
      "service",
      dbService.id,
    );
    if (!allowed) {
      throw new NotFoundException("Service not found");
    }
  }

  private async assertConsumerAccess(consumerId: string, user: RequestUser): Promise<string> {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id: consumerId },
      include: { serviceConsumers: { select: { serviceId: true } } },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    if (!user.isPlatformAdmin) {
      const linkedServiceIds = consumer.serviceConsumers.map((l) => l.serviceId);
      const allowed = user.roles.some(
        (r) => r.resourceType === "service" && linkedServiceIds.includes(r.resourceId ?? ""),
      );
      if (!allowed) {
        throw new NotFoundException("Consumer not found");
      }
    }
    return consumer.username ?? consumer.customId ?? consumer.id;
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
      ["plugins:read"],
      "service",
      serviceId,
    );
    if (!allowed) {
      throw new NotFoundException("Service not found");
    }
  }
}