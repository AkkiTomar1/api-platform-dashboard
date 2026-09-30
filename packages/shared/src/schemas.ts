import { z } from "zod";
import { ROLES, type RoleName } from "./permissions";

const roleEnum = z.enum([...ROLES] as [RoleName, ...RoleName[]]);

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const SERVICE_PROTOCOLS = [
  "http",
  "https",
  "grpc",
  "grpcs",
  "tcp",
  "tls",
  "udp",
] as const;

export type ServiceProtocol = (typeof SERVICE_PROTOCOLS)[number];

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(120).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8).max(128),
  initialRole: roleEnum.optional(),
});

export const getServiceByIdQuerySchema = z.object({
  id: z.string().min(1),
  detail: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const serviceCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  kongName: z.string().min(1).max(120),
  tags: z.array(z.string()).optional(),
  url: z
    .union([
      z.literal(""),
      z.string().trim().url("Enter a valid URL, e.g. https://api.example.com"),
    ])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  host: z.string().min(1).optional().default("localhost"),
  path: z.string().startsWith("/").optional().default("/"),
  port: z.coerce.number().int().min(1).max(65535).optional().default(80),
  protocol: z.enum(SERVICE_PROTOCOLS).optional().default("http"),
  ownerContact: z.string().max(120).optional().default(""),
  connectTimeout: z.coerce.number().int().min(0).optional().default(60000),
  writeTimeout: z.coerce.number().int().min(0).optional().default(60000),
  readTimeout: z.coerce.number().int().min(0).optional().default(60000),
  retries: z.coerce.number().int().min(0).optional().default(5),
});

export const serviceUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  kongName: z.string().min(1).max(120).optional(),
  tags: z.array(z.string()).nullable().optional(),
  url: z
    .union([
      z.literal(""),
      z.string().trim().url("Enter a valid URL, e.g. https://api.example.com"),
    ])
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  host: z.string().min(1).optional(),
  path: z.string().startsWith("/").nullable().optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  protocol: z.enum(SERVICE_PROTOCOLS).nullable().optional(),
  ownerContact: z.string().max(120).nullable().optional(),
  connectTimeout: z.coerce.number().int().min(0).optional(),
  writeTimeout: z.coerce.number().int().min(0).optional(),
  readTimeout: z.coerce.number().int().min(0).optional(),
  retries: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const routeCreateSchema = z.object({
  name: z.string().min(1).max(120),
  paths: z.array(z.string()).min(1),
  methods: z.array(z.string()).optional().default([]),
  hosts: z.array(z.string()).optional().default([]),
  protocols: z.array(z.enum(["http", "https"])).optional().default(["http", "https"]),
  stripPath: z.boolean().optional().default(true),
  preserveHost: z.boolean().optional().default(false),
  regexPriority: z.coerce.number().int().min(0).max(1_000_000).optional(),
  serviceId: z.string().min(1).optional(),
});

export const routeUpdateSchema = routeCreateSchema.partial();

export const pluginCreateSchema = z.object({
  name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
  protocols: z.array(z.enum(["http", "https"])).optional().default(["http", "https"]),
});

export const routePluginCreateSchema = z.object({
  name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
  protocols: z.array(z.enum(["http", "https"])).optional().default(["http", "https"]),
});

export const consumerPluginCreateSchema = z.object({
  name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
  protocols: z.array(z.enum(["http", "https"])).optional().default(["http", "https"]),
});

export const pluginUpdateSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  protocols: z.array(z.enum(["http", "https"])).optional(),
});

export const consumerCreateSchema = z.object({
  username: z.string().min(1).max(120).optional(),
  customId: z.string().min(1).max(120).optional(),
  serviceId: z.string().min(1).optional(),
});

export const consumerUpdateSchema = z.object({
  username: z.string().min(1).max(120).optional(),
  customId: z.string().min(1).max(120).nullable().optional(),
});

export const credentialCreateSchema = z.object({
  consumerId: z.string().min(1),
  key: z.string().min(1).max(250).optional(),
  ttl: z.number().int().positive().optional(),
});

export const credentialUpdateSchema = z.object({
  key: z.string().min(1).max(250).optional(),
});

export const roleAssignmentCreateSchema = z.object({
  userId: z.string().min(1),
  role: roleEnum,
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
});

export const roleAssignmentUpdateSchema = z.object({
  role: roleEnum.optional(),
  resourceId: z.string().nullable().optional(),
  resourceType: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  username: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
});
