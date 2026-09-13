import { Injectable } from "@nestjs/common";
import { RedisService } from "../core/redis/redis.service";
import {
  PERMISSION_MAP,
  type Permission,
  type RoleAssignmentEntry,
} from "@shared";

const CACHE_KEY = "rbac:permission-map";
const RBAC_USER_PREFIX = "rbac:user:";

@Injectable()
export class PermissionService {
  constructor(private readonly redis: RedisService) {}

  async readPermissionMap(): Promise<Record<string, readonly Permission[]>> {
    const cached = await this.redis.get<Record<string, readonly Permission[]>>(
      CACHE_KEY,
    );
    if (cached) {
      return cached;
    }
    const map = PERMISSION_MAP as unknown as Record<
      string,
      readonly Permission[]
    >;
    await this.redis.set(CACHE_KEY, map, 60 * 60);
    return map;
  }

  async getPermissionsForRoles(
    roles: RoleAssignmentEntry[],
  ): Promise<Permission[]> {
    const map = await this.readPermissionMap();
    const set = new Set<Permission>();
    for (const entry of roles) {
      const perms = map[entry.role];
      if (!perms) continue;
      for (const p of perms) set.add(p);
    }
    return [...set];
  }

  hasAnyPermission(permissions: Permission[], required: Permission[]): boolean {
    if (required.length === 0) return true;
    return required.some((r) => permissions.includes(r));
  }

  isPlatformAdmin(roles: RoleAssignmentEntry[]): boolean {
    return roles.some((r) => r.role === "platform_admin");
  }

  async canAccessResource(
    roles: RoleAssignmentEntry[],
    permissions: Permission[],
    required: Permission[],
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    if (!this.hasAnyPermission(permissions, required)) {
      return false;
    }
    if (this.isPlatformAdmin(roles)) {
      return true;
    }
    const map = await this.readPermissionMap();
    const relevantRoles = roles.filter((entry) => {
      const perms = map[entry.role];
      return perms && required.some((r) => perms.includes(r));
    });
    return relevantRoles.some(
      (entry) =>
        entry.resourceType === resourceType &&
        (entry.resourceId === null || entry.resourceId === resourceId),
    );
  }

  async ownedResourceIds(
    roles: RoleAssignmentEntry[],
    permissions: Permission[],
    required: Permission[],
    resourceType: string,
  ): Promise<string[] | null> {
    if (!this.hasAnyPermission(permissions, required)) {
      return [];
    }
    if (this.isPlatformAdmin(roles)) {
      return null;
    }
    const map = await this.readPermissionMap();
    const ids = new Set<string>();
    let unrestricted = false;
    for (const entry of roles) {
      const perms = map[entry.role];
      if (!perms || !required.some((r) => perms.includes(r))) continue;
      if (entry.resourceType === resourceType) {
        if (entry.resourceId === null || entry.resourceId === undefined) {
          unrestricted = true;
        } else {
          ids.add(entry.resourceId);
        }
      }
    }
    if (unrestricted) return null;
    return [...ids];
  }

  userKey(userId: string): string {
    return `${RBAC_USER_PREFIX}${userId}`;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(this.userKey(userId));
  }
}
