import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestUser } from "@shared";
import { PERMISSIONS, permissionLevel, tierOf } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { PermissionService } from "../../rbac/permission.service";
import { AuditService } from "../audit/audit.service";

interface AssignmentInput {
  userId: string;
  role: string;
  resourceId?: string;
  resourceType?: string;
}

interface AssignmentUpdateInput {
  role?: string;
  resourceId?: string | null;
  resourceType?: string | null;
}

@Injectable()
export class RoleAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  async list(user: RequestUser) {
    const rows = await this.prisma.roleAssignment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (user.isPlatformAdmin) {
      return rows;
    }

    const assignable = rows.filter(
      (r) => r.userId === user.id || this.scopeMatches(user, r),
    );
    return assignable;
  }

  async assign(input: AssignmentInput, actor: RequestUser, ip?: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!target) {
      throw new NotFoundException("Target user not found");
    }

    await this.assertAssignmentAllowed(input, actor);

    const existing = await this.prisma.roleAssignment.findFirst({
      where: {
        userId: input.userId,
        role: input.role,
        resourceId: input.resourceId ?? null,
        resourceType: input.resourceType ?? null,
      },
    });
    if (existing) {
      throw new NotFoundException("Assignment already exists");
    }

    const assignment = await this.prisma.roleAssignment.create({
      data: {
        userId: input.userId,
        role: input.role,
        resourceId: input.resourceId ?? null,
        resourceType: input.resourceType ?? null,
      },
    });

    this.audit.record({
      action: "ASSIGN",
      actor: this.actorName(actor),
      ipAddress: ip,
      resourceType: "role",
      resourceName: this.targetName(target),
      userId: target.id,
      afterJson: {
        role: input.role,
        resourceId: input.resourceId ?? null,
        resourceType: input.resourceType ?? null,
        assignedBy: actor.id,
      },
    });

    await this.permissionService.invalidateUser(input.userId);

    return assignment;
  }

  async update(
    assignmentId: string,
    input: AssignmentUpdateInput,
    actor: RequestUser,
    ip?: string,
  ) {
    const existing = await this.prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException("Assignment not found");
    }
    const nextRole = input.role ?? existing.role;
    const nextResourceId =
      input.resourceId !== undefined ? input.resourceId : existing.resourceId;
    const nextResourceType =
      input.resourceType !== undefined ? input.resourceType : existing.resourceType;
    await this.assertAssignmentAllowed(
      { role: nextRole, resourceId: nextResourceId, resourceType: nextResourceType },
      actor,
    );

    const updated = await this.prisma.roleAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.resourceId !== undefined ? { resourceId: input.resourceId } : {}),
        ...(input.resourceType !== undefined ? { resourceType: input.resourceType } : {}),
      },
    });

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(actor),
      ipAddress: ip,
      resourceType: "role",
      resourceName: this.targetName(existing.user),
      userId: existing.userId,
      beforeJson: {
        role: existing.role,
        resourceId: existing.resourceId,
        resourceType: existing.resourceType,
      },
      afterJson: {
        role: updated.role,
        resourceId: updated.resourceId,
        resourceType: updated.resourceType,
      },
    });

    await this.permissionService.invalidateUser(existing.userId);

    return updated;
  }

  async unassign(assignmentId: string, actor: RequestUser, ip?: string) {
    const existing = await this.prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
      include: { user: true },
    });
    if (!existing) {
      throw new NotFoundException("Assignment not found");
    }
    const tier = tierOf(existing.role);
    if (tier === "platform" || tier === "consumer") {
      this.requirePlatformAdmin(actor);
    }

    await this.prisma.roleAssignment.delete({ where: { id: assignmentId } });

    this.audit.record({
      action: "UNASSIGN",
      actor: this.actorName(actor),
      ipAddress: ip,
      resourceType: "role",
      resourceName: this.targetName(existing.user),
      userId: existing.userId,
      beforeJson: {
        role: existing.role,
        resourceId: existing.resourceId,
        resourceType: existing.resourceType,
      },
    });

    await this.permissionService.invalidateUser(existing.userId);

    return { ok: true };
  }

  private async assertAssignmentAllowed(
    input: {
      role: string;
      resourceId?: string | null;
      resourceType?: string | null;
    },
    actor: RequestUser,
  ): Promise<void> {
    const tier = tierOf(input.role);
    if (tier === "platform" || tier === "consumer") {
      this.requirePlatformAdmin(actor);
      return;
    }
    if (tier !== "service") {
      throw new ForbiddenException("Unknown role");
    }
    const actorLevel = Math.max(
      0,
      ...actor.roles.map((r) => permissionLevel(r.role)),
    );
    if (permissionLevel(input.role) > actorLevel) {
      throw new ForbiddenException("Cannot assign a role higher than your own");
    }
    if (actor.isPlatformAdmin) {
      return;
    }
    if (!actor.permissions.includes(PERMISSIONS.ROLE_ASSIGN)) {
      throw new ForbiddenException("Missing role:assign permission");
    }
    const rtype = input.resourceType ?? null;
    const rid = input.resourceId ?? null;
    if (rtype !== null && rtype !== "service") {
      throw new ForbiddenException("Only service-scoped assignments are supported");
    }
    if (rid === null) {
      throw new ForbiddenException("Global service roles require platform admin");
    }
    const allowed = await this.permissionService.canAccessResource(
      actor.roles,
      actor.permissions,
      [PERMISSIONS.SERVICES_READ],
      "service",
      rid,
    );
    if (!allowed) {
      throw new ForbiddenException("Cannot assign a role for a service you do not own");
    }
  }

  private requirePlatformAdmin(actor: RequestUser): void {
    if (!actor.isPlatformAdmin) {
      throw new ForbiddenException("Platform admin required");
    }
  }

  private scopeMatches(
    actor: RequestUser,
    assignment: { role: string; resourceId?: string | null; resourceType?: string | null },
  ): boolean {
    return actor.roles.some(
      (r) =>
        r.resourceType === "service" &&
        r.resourceId !== null &&
        r.resourceId === assignment.resourceId,
    );
  }

  private actorName(actor: RequestUser): string {
    return actor.email || actor.username || `(user ${actor.id})`;
  }

  private targetName(user: { username: string; email: string; id: string }): string {
    return user.username || user.email || `(user ${user.id})`;
  }
}