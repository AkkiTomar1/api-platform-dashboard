import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import type {
  Permission,
  RequestUser,
  RoleAssignmentEntry,
} from "@shared";
import { PrismaService } from "../core/prisma/prisma.service";
import { RedisService } from "../core/redis/redis.service";
import { PermissionService } from "../rbac/permission.service";
import { AuditService } from "../modules/audit/audit.service";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: RequestUser;
}

const DEFAULT_ACCESS_TTL = "15m";

@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlDays: number;
  private readonly issuer: string;
  private readonly privateKey: string;
  private readonly rbacCacheTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.accessTtlSeconds = parseSeconds(
      config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? DEFAULT_ACCESS_TTL,
      900,
    );
    this.rbacCacheTtl = parseSeconds(
      config.get<string>("RBAC_CACHE_TTL") ?? "900",
      900,
    );
    this.refreshTtlDays = parseSeconds(
      config.get<string>("REFRESH_TOKEN_EXPIRES_IN") ?? "7d",
      7 * 24 * 60 * 60,
    ) / 86_400;
    this.issuer = config.get<string>("JWT_ISSUER") ?? "api-platform-dashboard";

    const source = config.get<string>("JWT_PRIVATE_KEY")?.trim();
    if (source) {
      this.privateKey = source;
    } else {
      const path = config.get<string>("JWT_PRIVATE_KEY_PATH") ?? "jwt-private.pem";
      try {
        this.privateKey = readFileSync(path, "utf8");
      } catch (err) {
        Logger.error(
          `No JWT private key available (${path}). Run "bun run keys:generate" and set JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH.`,
          String(err),
          AuthService.name,
        );
        throw err;
      }
    }
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const requestUser = await this.buildRequestUser(user.id);
    const tokens = await this.issueSession(user.id);

    this.audit.record({
      action: "LOGIN",
      actor: this.actorName(requestUser),
      ipAddress: ip,
      resourceType: "user",
      resourceName: requestUser.email || `(user ${user.id})`,
      userId: user.id,
    });

    return { ...tokens, user: requestUser };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueSession(stored.userId);
    const requestUser = await this.buildRequestUser(stored.userId);
    return { ...tokens, user: requestUser };
  }

  async logout(refreshToken: string, ip?: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (stored && stored.revokedAt === null) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: stored.userId },
      });
      if (user) {
        this.audit.record({
          action: "LOGOUT",
          actor: user.email || `(user ${user.id})`,
          ipAddress: ip,
          resourceType: "user",
          resourceName: user.email || `(user ${user.id})`,
          userId: user.id,
        });
      }
    }
    return { ok: true };
  }

  private async issueSession(userId: string) {
    const refreshToken = randomBytes(48).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId,
        expiresAt: new Date(Date.now() + this.refreshTtlDays * 86_400_000),
      },
    });

    const accessToken = jwt.sign(
      { sub: userId, type: "access" as const },
      this.privateKey,
      {
        algorithm: "RS256",
        expiresIn: this.accessTtlSeconds,
        issuer: this.issuer,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
      tokenType: "Bearer" as const,
    };
  }

  async buildRequestUser(userId: string): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userKey = this.permissionService.userKey(user.id);
    const cached = await this.redis.get<{
      roles: RoleAssignmentEntry[];
      permissions: Permission[];
    }>(userKey);
    let roles = cached?.roles;
    let permissions = cached?.permissions;
    if (!roles || !permissions) {
      roles = await this.getRoles(user.id);
      permissions = await this.permissionService.getPermissionsForRoles(roles);
      await this.redis.set(userKey, { roles, permissions }, this.rbacCacheTtl);
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roles,
      permissions,
      isPlatformAdmin: roles.some((r) => r.role === "platform_admin"),
    };
  }

  async getRoles(userId: string): Promise<RoleAssignmentEntry[]> {
    const rows = await this.prisma.roleAssignment.findMany({
      where: { userId },
      select: { role: true, resourceId: true, resourceType: true },
    });
    return rows.map((r) => ({
      role: r.role,
      resourceId: r.resourceId,
      resourceType: r.resourceType,
    }));
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private actorName(user: RequestUser): string {
    return user.email || user.username || `(user ${user.id})`;
  }
}

function parseSeconds(value: string, fallback: number): number {
  const match = /^(\d+)([smhd]?)$/.exec(value.trim());
  if (!match) {
    return fallback;
  }
  const n = Number(match[1]);
  const unit = match[2] || "s";
  const multiplier =
    unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86_400 : 1;
  return n * multiplier;
}