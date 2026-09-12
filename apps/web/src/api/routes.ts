import type { z } from "zod";
import { routeCreateSchema } from "@shared";
import { apiClient } from "./client";

export type RouteCreateInput = z.input<typeof routeCreateSchema> & {
  serviceId: string;
};

export interface KongRoute {
  id: string;
  name?: string;
  paths?: string[];
  methods?: string[];
  hosts?: string[];
  protocols?: string[];
  strip_path?: boolean;
  preserve_host?: boolean;
  service?: { id?: string } | null;
  created_at?: number;
}

export async function listRoutes(serviceId: string): Promise<KongRoute[]> {
  const res = await apiClient.get<KongRoute[]>(`/services/${serviceId}/routes`);
  return res.data;
}

export async function createRoute(
  serviceId: string,
  input: Omit<RouteCreateInput, "serviceId">,
): Promise<KongRoute> {
  const res = await apiClient.post<KongRoute>(`/services/${serviceId}/routes`, input);
  return res.data;
}

export async function updateRoute(
  serviceId: string,
  routeId: string,
  input: Partial<Omit<RouteCreateInput, "serviceId">>,
): Promise<KongRoute> {
  const res = await apiClient.patch<KongRoute>(
    `/services/${serviceId}/routes/${routeId}`,
    input,
  );
  return res.data;
}

export async function deleteRoute(serviceId: string, routeId: string): Promise<void> {
  await apiClient.delete(`/services/${serviceId}/routes/${routeId}`);
}