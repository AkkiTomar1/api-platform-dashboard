import type { RequestUser } from "@shared";
import { apiClient } from "./client";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  createdAt: string;
  roles: Array<{
    id: string;
    role: string;
    resourceId: string | null;
    resourceType: string | null;
  }>;
}

export interface RoleCount {
  role: string;
  count: number;
}

export interface AdminUserCreateInput {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  password: string;
  initialRole?: string;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>("/admin/users");
  return res.data;
}

export async function listAdminRoles(): Promise<RoleCount[]> {
  const res = await apiClient.get<RoleCount[]>("/admin/roles");
  return res.data;
}

export async function createAdminUser(
  input: AdminUserCreateInput,
): Promise<AdminUser> {
  const res = await apiClient.post<AdminUser>("/admin/users", input);
  return res.data;
}

export async function updateAdminUser(
  id: string,
  input: {
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  },
): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${id}`, input);
  return res.data;
}

export const isPlatformAdmin = (user: RequestUser | null): boolean =>
  Boolean(user?.isPlatformAdmin);