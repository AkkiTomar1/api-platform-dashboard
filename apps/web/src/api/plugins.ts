import type { z } from "zod";
import {
  pluginCreateSchema,
  routePluginCreateSchema,
  consumerPluginCreateSchema,
} from "@shared";
import { apiClient } from "./client";

export type PluginCreateInput = z.input<typeof pluginCreateSchema> & {
  serviceId: string;
};

export type RoutePluginCreateInput = z.input<typeof routePluginCreateSchema> & {
  routeId: string;
};

export type ConsumerPluginCreateInput = z.input<typeof consumerPluginCreateSchema> & {
  consumerId: string;
};

export interface KongPlugin {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  protocols?: string[];
  service?: { id?: string } | null;
  route?: { id?: string } | null;
  consumer?: { id?: string } | null;
  created_at?: number;
}

export const COMMON_PLUGINS = [
  "key-auth",
  "rate-limiting",
  "cors",
  "acl",
  "jwt",
  "basic-auth",
  "request-transformer",
  "response-transformer",
  "ip-restriction",
  "request-termination",
] as const;

export const PLUGIN_NAMES: readonly string[] = COMMON_PLUGINS;

export type PluginLevel = "service" | "route" | "consumer";

export function pluginLevel(plugin: KongPlugin): PluginLevel {
  if (plugin.route?.id) return "route";
  if (plugin.consumer?.id) return "consumer";
  return "service";
}

export async function listPlugins(serviceId: string): Promise<KongPlugin[]> {
  const res = await apiClient.get<KongPlugin[]>(`/services/${serviceId}/plugins`);
  return res.data;
}

export async function createPlugin(
  serviceId: string,
  input: Omit<PluginCreateInput, "serviceId">,
): Promise<KongPlugin> {
  const res = await apiClient.post<KongPlugin>(`/services/${serviceId}/plugins`, input);
  return res.data;
}

export async function updatePlugin(
  serviceId: string,
  pluginId: string,
  input: Partial<Omit<PluginCreateInput, "serviceId">>,
): Promise<KongPlugin> {
  const res = await apiClient.patch<KongPlugin>(
    `/services/${serviceId}/plugins/${pluginId}`,
    input,
  );
  return res.data;
}

export async function deletePlugin(serviceId: string, pluginId: string): Promise<void> {
  await apiClient.delete(`/services/${serviceId}/plugins/${pluginId}`);
}

export async function listRoutePlugins(routeId: string): Promise<KongPlugin[]> {
  const res = await apiClient.get<KongPlugin[]>(`/routes/${routeId}/plugins`);
  return res.data;
}

export async function createRoutePlugin(
  routeId: string,
  input: Omit<RoutePluginCreateInput, "routeId">,
): Promise<KongPlugin> {
  const res = await apiClient.post<KongPlugin>(`/routes/${routeId}/plugins`, input);
  return res.data;
}

export async function updateRoutePlugin(
  routeId: string,
  pluginId: string,
  input: Partial<Omit<RoutePluginCreateInput, "routeId">>,
): Promise<KongPlugin> {
  const res = await apiClient.patch<KongPlugin>(
    `/routes/${routeId}/plugins/${pluginId}`,
    input,
  );
  return res.data;
}

export async function deleteRoutePlugin(routeId: string, pluginId: string): Promise<void> {
  await apiClient.delete(`/routes/${routeId}/plugins/${pluginId}`);
}

export async function listConsumerPlugins(consumerId: string): Promise<KongPlugin[]> {
  const res = await apiClient.get<KongPlugin[]>(`/consumers/${consumerId}/plugins`);
  return res.data;
}

export async function createConsumerPlugin(
  consumerId: string,
  input: Omit<ConsumerPluginCreateInput, "consumerId">,
): Promise<KongPlugin> {
  const res = await apiClient.post<KongPlugin>(`/consumers/${consumerId}/plugins`, input);
  return res.data;
}

export async function updateConsumerPlugin(
  consumerId: string,
  pluginId: string,
  input: Partial<Omit<ConsumerPluginCreateInput, "consumerId">>,
): Promise<KongPlugin> {
  const res = await apiClient.patch<KongPlugin>(
    `/consumers/${consumerId}/plugins/${pluginId}`,
    input,
  );
  return res.data;
}

export async function deleteConsumerPlugin(consumerId: string, pluginId: string): Promise<void> {
  await apiClient.delete(`/consumers/${consumerId}/plugins/${pluginId}`);
}