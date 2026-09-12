import { Injectable, NotFoundException } from "@nestjs/common";
import type { RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { KongClient } from "../../core/kong/kong-client";
import { PermissionService } from "../../rbac/permission.service";
import { AuditService } from "../audit/audit.service";

interface CredentialCreateInput {
  consumerId: string;
  key?: string;
  ttl?: number;
}

@Injectable()
export class KongCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kong: KongClient,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
  ) {}

  async list(consumerId: string, user: RequestUser) {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id: consumerId },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    await this.assertConsumerAccess(consumerId, user);
    const kong = await this.kong
      .get<{ data: unknown[] }>(`/consumers/${this.consumerRef(consumer)}/key-auth`)
      .catch(() => ({ data: [] }));
    return kong.data;
  }

  async create(input: CredentialCreateInput, user: RequestUser, ip?: string) {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id: input.consumerId },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    await this.assertConsumerAccess(input.consumerId, user);

    const body: Record<string, unknown> = {};
    if (input.key) body.key = input.key;
    if (input.ttl) body.ttl = input.ttl;

    const created = await this.kong.post<{ id?: string }>(
      `/consumers/${this.consumerRef(consumer)}/key-auth`,
      body,
    );

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "credential",
      resourceName: created.id ?? input.consumerId,
      userId: user.id,
      afterJson: {
        consumerId: input.consumerId,
        key: input.key ?? "(generated)",
      },
    });

    return created;
  }

  async update(
    consumerId: string,
    credentialId: string,
    key: string,
    user: RequestUser,
    ip?: string,
  ) {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id: consumerId },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    await this.assertConsumerAccess(consumerId, user);

    const before = await this.kong
      .get(`/consumers/${this.consumerRef(consumer)}/key-auth/${credentialId}`)
      .catch(() => null);
    if (!before) {
      throw new NotFoundException("Credential not found");
    }

    const updated = await this.kong.patch(
      `/consumers/${this.consumerRef(consumer)}/key-auth/${credentialId}`,
      { key },
    );

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "credential",
      resourceName: credentialId,
      userId: user.id,
      beforeJson: { key: "(existing key)" },
      afterJson: { key: "(rotated)" },
    });

    return updated;
  }

  async remove(consumerId: string, credentialId: string, user: RequestUser, ip?: string) {
    const consumer = await this.prisma.kongConsumer.findUnique({
      where: { id: consumerId },
    });
    if (!consumer) {
      throw new NotFoundException("Consumer not found");
    }
    await this.assertConsumerAccess(consumerId, user);
    await this.kong.delete(
      `/consumers/${this.consumerRef(consumer)}/key-auth/${credentialId}`,
    );

    this.audit.record({
      action: "DELETE",
      actor: this.actorName(user),
      ipAddress: ip,
      resourceType: "credential",
      resourceName: credentialId,
      userId: user.id,
    });

    return { ok: true };
  }

  private consumerRef(consumer: { username: string | null; id: string }): string {
    return consumer.username ?? consumer.id;
  }

  private actorName(user: RequestUser): string {
    return user.email || user.username || `(user ${user.id})`;
  }

  private async assertConsumerAccess(consumerId: string, user: RequestUser) {
    if (user.isPlatformAdmin) return;
    const links = await this.prisma.serviceConsumer.findMany({
      where: { consumerId },
      select: { serviceId: true },
    });
    const allowed = await Promise.all(
      links.map((l) =>
        this.permissionService.canAccessResource(
          user.roles,
          user.permissions,
          ["credentials:read"],
          "service",
          l.serviceId,
        ),
      ),
    );
    if (!allowed.some(Boolean)) {
      throw new NotFoundException("Consumer not found");
    }
  }
}