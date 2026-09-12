import type { RequestUser } from "@shared";
import { apiClient } from "./client";

export interface RoleAssignment {
  id: string;
  userId: string;
  role: string;
  resourceId: string | null;
  resourceType: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface AssignRoleInput {
  userId: string;
  role: string;
  resourceId?: string;
  resourceType?: string;
}

export async function listRoleAssignments(): Promise<RoleAssignment[]> {
  const res = await apiClient.get<RoleAssignment[]>("/role-assignments");
  return res.data;
}

export async function assignRole(input: AssignRoleInput): Promise<RoleAssignment> {
  const res = await apiClient.post<RoleAssignment>("/role-assignments", input);
  return res.data;
}

export async function updateRoleAssignment(
  id: string,
  input: {
    role?: string;
    resourceId?: string | null;
    resourceType?: string | null;
  },
): Promise<RoleAssignment> {
  const res = await apiClient.patch<RoleAssignment>(`/role-assignments/${id}`, input);
  return res.data;
}

export async function unassignRole(id: string): Promise<void> {
  await apiClient.delete(`/role-assignments/${id}`);
}

export function hasPermission(user: RequestUser | null, permission: string): boolean {
  return Boolean(user?.isPlatformAdmin || user?.permissions.includes(permission as never));
}