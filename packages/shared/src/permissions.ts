export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  SERVICES_READ: "services:read",
  SERVICES_CREATE: "services:create",
  SERVICES_UPDATE: "services:update",
  SERVICES_DELETE: "services:delete",
  ROUTES_READ: "routes:read",
  ROUTES_CREATE: "routes:create",
  ROUTES_UPDATE: "routes:update",
  ROUTES_DELETE: "routes:delete",
  PLUGINS_READ: "plugins:read",
  PLUGINS_CREATE: "plugins:create",
  PLUGINS_UPDATE: "plugins:update",
  PLUGINS_DELETE: "plugins:delete",
  CONSUMERS_READ: "consumers:read",
  CONSUMERS_CREATE: "consumers:create",
  CONSUMERS_UPDATE: "consumers:update",
  CONSUMERS_DELETE: "consumers:delete",
  CREDENTIALS_READ: "credentials:read",
  CREDENTIALS_CREATE: "credentials:create",
  CREDENTIALS_UPDATE: "credentials:update",
  CREDENTIALS_DELETE: "credentials:delete",
  AUDIT_READ: "audit:read",
  ROLE_ASSIGN: "role:assign",
  ADMIN_USERS: "admin:users",
  ADMIN_ROLES: "admin:roles",
  ADMIN_ALL: "admin:all",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(
  PERMISSIONS,
) as readonly Permission[];

export type Tier = "platform" | "service" | "consumer";

export type RoleName =
  | "platform_admin"
  | "platform_dev"
  | "platform_viewer"
  | "service_admin"
  | "service_dev"
  | "service_viewer"
  | "consumer_admin";

export const ROLES: readonly RoleName[] = [
  "platform_admin",
  "platform_dev",
  "platform_viewer",
  "service_admin",
  "service_dev",
  "service_viewer",
  "consumer_admin",
];

export const ROLE_TIERS: Record<RoleName, Tier> = {
  platform_admin: "platform",
  platform_dev: "platform",
  platform_viewer: "platform",
  service_admin: "service",
  service_dev: "service",
  service_viewer: "service",
  consumer_admin: "consumer",
};

export function tierOf(role: string): Tier | null {
  return (ROLE_TIERS as Record<string, Tier>)[role] ?? null;
}

export const TIER_ORDER: Record<Tier, number> = {
  platform: 3,
  service: 2,
  consumer: 1,
};

export function tierRank(tier: Tier | null): number {
  return tier === null ? 0 : TIER_ORDER[tier];
}

export const ROLE_LEVELS: Record<RoleName, number> = {
  platform_admin: 99,
  platform_dev: 90,
  platform_viewer: 80,
  service_admin: 55,
  service_dev: 45,
  service_viewer: 35,
  consumer_admin: 30,
};

const CRUD = (
  base: string,
  read: boolean,
  create: boolean,
  update: boolean,
  del: boolean,
): Permission[] => {
  const out: Permission[] = [];
  if (read) out.push(`${base}:read` as Permission);
  if (create) out.push(`${base}:create` as Permission);
  if (update) out.push(`${base}:update` as Permission);
  if (del) out.push(`${base}:delete` as Permission);
  return out;
};

export const PERMISSION_MAP: Record<RoleName, readonly Permission[]> = {
  platform_admin: ALL_PERMISSIONS,
  platform_dev: [
    PERMISSIONS.DASHBOARD_VIEW,
    ...CRUD("services", true, true, true, true),
    ...CRUD("routes", true, true, true, true),
    ...CRUD("plugins", true, true, true, true),
    ...CRUD("consumers", true, true, true, true),
    ...CRUD("credentials", true, true, true, true),
    PERMISSIONS.AUDIT_READ,
  ],
  platform_viewer: [
    PERMISSIONS.DASHBOARD_VIEW,
    ...CRUD("services", true, false, false, false),
    ...CRUD("routes", true, false, false, false),
    ...CRUD("plugins", true, false, false, false),
    ...CRUD("consumers", true, false, false, false),
    ...CRUD("credentials", true, false, false, false),
    PERMISSIONS.AUDIT_READ,
  ],
  service_admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    ...CRUD("services", true, true, true, true),
    ...CRUD("routes", true, true, true, true),
    ...CRUD("plugins", true, true, true, true),
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ROLE_ASSIGN,
  ],
  service_dev: [
    PERMISSIONS.DASHBOARD_VIEW,
    ...CRUD("services", true, false, true, false),
    ...CRUD("routes", true, true, true, false),
    ...CRUD("plugins", true, true, true, false),
    PERMISSIONS.AUDIT_READ,
  ],
  service_viewer: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.ROUTES_READ,
    PERMISSIONS.PLUGINS_READ,
    PERMISSIONS.AUDIT_READ,
  ],
  consumer_admin: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SERVICES_READ,
    ...CRUD("consumers", true, true, true, true),
    ...CRUD("credentials", true, true, true, true),
    ...CRUD("plugins", true, true, true, true),
    PERMISSIONS.AUDIT_READ,
  ],
};

export function permissionLevel(role: string): number {
  return (ROLE_LEVELS as Record<string, number>)[role] ?? 0;
}

export function hasRole(role: string): role is RoleName {
  return Object.prototype.hasOwnProperty.call(ROLE_LEVELS, role);
}
