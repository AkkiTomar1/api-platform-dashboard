import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestUser } from "@shared";
import { PERMISSIONS, permissionLevel } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
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
  private static readonly PLATFORM_ROLES = [
    "platform_admin",
    "platform_dev",
    "platform_user",
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

    this.checkRoleAssignmentAllowed(input.role, actor);

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
    if (input.role) {
      this.checkRoleAssignmentAllowed(input.role, actor);
    }
    if (RoleAssignmentsService.PLATFORM_ROLES.includes(existing.role)) {
      this.requirePlatformAdmin(actor);
    }

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
    if (RoleAssignmentsService.PLATFORM_ROLES.includes(existing.role)) {
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

    return { ok: true };
  }

  private checkRoleAssignmentAllowed(role: string, actor: RequestUser): void {
    if (RoleAssignmentsService.PLATFORM_ROLES.includes(role)) {
      this.requirePlatformAdmin(actor);
      return;
    }
    const has = actor.permissions.includes(PERMISSIONS.ROLE_ASSIGN);
    if (!has && !actor.isPlatformAdmin) {
      throw new ForbiddenException("Missing role:assign permission");
    }
    if (permissionLevel(role) > permissionLevel(actor.roles[0]?.role ?? "")) {
      throw new ForbiddenException("Cannot assign a role higher than your own");
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