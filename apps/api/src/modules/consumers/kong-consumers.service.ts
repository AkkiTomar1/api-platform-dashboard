import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type ServiceConsumerStatus } from "@prisma/client";
import type { RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { KongClient } from "../../core/kong/kong-client";
import { PermissionService } from "../../rbac/permission.service";
import { AuditService } from "../audit/audit.service";

interface ConsumerCreateInput {
  username?: string;
  customId?: string;
  serviceId?: string;
}

interface ConsumerUpdateInput {
  username?: string;
  customId?: string | null;
}

@Injectable()
export class KongConsumersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kong: KongClient,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
  ) {}

  async list(user: RequestUser) {
    const consumers = await this.prisma.kongConsumer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        serviceConsumers: {
          include: { service: { select: { id: true, name: true } } },
        },
      },
    });

    const owned = await this.permissionService.ownedResourceIds(
      user.roles,
      user.permissions,
      ["consumers:read"],
      "service",
    );

    const filtered =
      owned === null
        ? consumers
        : consumers.filter((c) =>
            c.serviceConsumers.some((sc) => owned.includes(sc.serviceId)),
          );

    return {
      data: filtered.map((c) => ({
        id: c.id,
        username: c.username,
        customId: c.customId,
        createdAt: c.createdAt,
        services: c.serviceConsumers.map((sc) => ({
          serviceId: sc.serviceId,
          serviceName: sc.service.name,
          status: sc.status,
        })),
      })),
      total: filtered.length,
    };
  }

  async findById(id: string, user: RequestUser) {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id },
      include: { serviceConsumers: { include: { service: true } } },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    if (!this.canViewConsumer(user, consumer.serviceConsumers)) {
      throw new NotFoundException("Consumer not found");
    }
    return consumer;
  }

  async create(input: ConsumerCreateInput, user: RequestUser, ip?: string) {
    const username = (input.username ?? "").trim();
    const customId = (input.customId ?? "").trim();

    if (username) {
      const dup = await this.prisma.kongConsumer.findFirst({
        where: { OR: [{ username }, { customId: customId || undefined }] },
      });
      if (dup) {
        throw new ConflictException("Consumer username or custom_id already exists");
      }
    }

    const kongConsumer = await this.kong
      .post<{ id: string; username?: string }>("/consumers", {
        ...(username ? { username } : {}),
        ...(customId ? { custom_id: customId } : {}),
      })
      .catch(() => ({ id: `kong-consumer-${customId || username}`, username }));

    const dbConsumer = await this.prisma.kongConsumer.create({
      data: {
        username: username || null,
        customId: customId || null,
      },
    });

    let serviceLink = null;
    if (input.serviceId) {
      const service = await this.prisma.gatewayService.findUnique({
        where: { id: input.serviceId },
      });
      if (service) {
        serviceLink = await this.prisma.serviceConsumer.create({
          data: {
            serviceId: input.serviceId,
            consumerId: dbConsumer.id,
            status: "ACTIVE",
          },
        });
      }
    }

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "consumer",
      resourceName: dbConsumer.id,
      userId: user.id,
      afterJson: {
        ...input,
        kong_id: kongConsumer.id,
        service_id: input.serviceId ?? null,
      },
    });

    return { ...dbConsumer, serviceLink };
  }

  async update(
    id: string,
    input: ConsumerUpdateInput,
    user: RequestUser,
    ip?: string,
  ) {
    const existing = await this.prisma.kongConsumer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Consumer not found");
    }
    if (input.username) {
      const dup = await this.prisma.kongConsumer.findFirst({
        where: { username: input.username, id: { not: id } },
      });
      if (dup) {
        throw new ConflictException("Consumer username already in use");
      }
    }

    const kongPatch: Record<string, unknown> = {};
    if (input.username !== undefined) kongPatch.username = input.username;
    if (input.customId !== undefined) kongPatch.custom_id = input.customId ?? null;

    const kong = await this.kong
      .patch(`/consumers/${existing.username ?? id}`, kongPatch)
      .catch(() => null);

    const updated = await this.prisma.kongConsumer.update({
      where: { id },
      data: {
        ...(input.username !== undefined ? { username: input.username || null } : {}),
        ...(input.customId !== undefined ? { customId: input.customId || null } : {}),
      },
    });

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "consumer",
      resourceName: id,
      userId: user.id,
      beforeJson: { ...existing },
      afterJson: { ...updated, kong },
    });

    return updated;
  }

  async remove(id: string, user: RequestUser, ip?: string) {
    const existing = await this.prisma.kongConsumer.findUnique({
      where: { id },
      include: { serviceConsumers: true },
    });
    if (!existing) {
      throw new NotFoundException("Consumer not found");
    }

    await this.prisma.serviceConsumer.updateMany({
      where: { consumerId: id },
      data: { status: "REVOKED" },
    });

    const kong = await this.kong
      .delete(`/consumers/${existing.username ?? id}`)
      .then(() => true)
      .catch(() => false);

    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "consumer",
      resourceName: id,
      userId: user.id,
      beforeJson: {
        ...existing,
        kong_deleted: kong,
      },
    });

    return { ok: true };
  }

  async setLinkStatus(
    consumerId: string,
    serviceId: string,
    status: ServiceConsumerStatus,
    user: RequestUser,
    ip?: string,
  ) {
    const existing = await this.prisma.serviceConsumer.findUnique({
      where: { serviceId_consumerId: { serviceId, consumerId } },
    });
    if (!existing) {
      throw new NotFoundException("Consumer-service link not found");
    }
    const link = await this.prisma.serviceConsumer.update({
      where: { id: existing.id },
      data: { status },
    });

    this.audit.record({
      action: status === "REVOKED" ? "REVOKE" : "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "consumer",
      resourceName: consumerId,
      userId: user.id,
      beforeJson: { serviceId, status: existing.status },
      afterJson: { serviceId, status },
    });

    return link;
  }

  private actorName(user: RequestUser): string {
    return user.email || user.username || `(user ${user.id})`;
  }

  private canViewConsumer(
    user: RequestUser,
    links: Array<{ serviceId: string }>,
  ): boolean {
    if (user.isPlatformAdmin) return true;
    return links.some((l) =>
      user.roles.some(
        (r) => r.resourceType === "service" && r.resourceId === l.serviceId,
      ),
    );
  }
}