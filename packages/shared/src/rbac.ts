import type { Permission } from "./permissions";
export type { Tier } from "./permissions";
export { tierOf, tierRank, ROLE_TIERS, TIER_ORDER } from "./permissions";

export interface RoleAssignmentEntry {
  role: string;
  resourceId?: string | null;
  resourceType?: string | null;
}

export interface RequestUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  roles: RoleAssignmentEntry[];
  permissions: Permission[];
  isPlatformAdmin: boolean;
}

export interface RoleScope {
  role: string;
  resourceId?: string | null;
  resourceType?: string | null;
}

export interface OwnedResource {
  role: string;
  resourceId: string;
  resourceType: string;
}
