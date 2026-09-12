import { z } from "zod";

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
  initialRole: z.string().optional(),
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
  url: z.string().nullable().optional(),
  host: z.string().min(1),
  path: z.string().startsWith("/").optional().default("/"),
  port: z.coerce.number().int().min(1).max(65535).optional().default(80),
  protocol: z.enum(["http", "https"]).optional().default("http"),
});

export const serviceUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  kongName: z.string().min(1).max(120).optional(),
  tags: z.array(z.string()).nullable().optional(),
  url: z.string().nullable().optional(),
  host: z.string().min(1).optional(),
  path: z.string().startsWith("/").nullable().optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  protocol: z.enum(["http", "https"]).nullable().optional(),
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
  serviceId: z.string().min(1),
});

export const routeUpdateSchema = routeCreateSchema.partial();

export const pluginCreateSchema = z.object({
  name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
  protocols: z.array(z.enum(["http", "https"])).optional().default(["http", "https"]),
  serviceId: z.string().min(1),
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
  role: z.string().min(1),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
});

export const roleAssignmentUpdateSchema = z.object({
  role: z.string().min(1).optional(),
  resourceId: z.string().nullable().optional(),
  resourceType: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  username: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
});
