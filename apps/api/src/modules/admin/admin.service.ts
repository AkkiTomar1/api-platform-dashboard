import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { RequestUser } from "@shared";
import { PrismaService } from "../../core/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

interface UserUpdateInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface UserCreateInput {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  initialRole?: string;
}

const BCRYPT_COST = 10;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        roleAssignments: {
          select: { id: true, role: true, resourceId: true, resourceType: true },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      roles: u.roleAssignments,
    }));
  }

  async listRoles() {
    const roles = await this.prisma.roleAssignment.groupBy({
      by: ["role"],
      _count: { role: true },
    });
    return roles.map((r) => ({ role: r.role, count: r._count.role }));
  }

  async createUser(input: UserCreateInput, actor: RequestUser, ip?: string) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const username = input.username?.trim() || email.split("@")[0];
    const initialRole = input.initialRole ?? "platform_user";
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        firstName: input.firstName ?? username,
        lastName: input.lastName ?? "",
        avatarUrl: "",
        passwordHash,
        roleAssignments: {
          create: {
            role: initialRole,
            resourceId: null,
            resourceType: null,
          },
        },
      },
    });

    this.audit.record({
      action: "CREATE",
      actor: this.actorName(actor),
      ipAddress: ip,
      resourceType: "user",
      resourceName: email,
      userId: user.id,
      afterJson: { email, username, initialRole },
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      roles: [{ role: initialRole, resourceId: null, resourceType: null }],
    };
  }

  async updateUser(
    id: string,
    input: UserUpdateInput,
    actor: RequestUser,
    ip?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl ?? "" } : {}),
      },
    });

    this.audit.record({
      action: "UPDATE",
      actor: this.actorName(actor),
      ipAddress: ip,
      resourceType: "user",
      resourceName: user.username || user.email || `(user ${user.id})`,
      userId: user.id,
      beforeJson: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      afterJson: {
        username: updated.username,
        firstName: updated.firstName,
        lastName: updated.lastName,
      },
    });

    return updated;
  }

  private actorName(actor: RequestUser): string {
    return actor.email || actor.username || `(user ${actor.id})`;
  }
}