import type { z } from "zod";
import { pluginCreateSchema } from "@shared";
import { apiClient } from "./client";

export type PluginCreateInput = z.input<typeof pluginCreateSchema> & {
  serviceId: string;
};

export interface KongPlugin {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  protocols?: string[];
  service?: { id?: string } | null;
  created_at?: number;
}

const COMMON_PLUGINS = [
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