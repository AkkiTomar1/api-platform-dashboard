import type { z } from "zod";
import { serviceCreateSchema, serviceUpdateSchema } from "@shared";
import { apiClient } from "./client";

export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export interface GatewayServiceSummary {
  id: string;
  name: string;
  description: string;
  kongName: string;
  tags: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  consumerCount: number;
}

export interface ServiceListResult {
  data: GatewayServiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  sortOrder?: "asc" | "desc";
}

export interface ServiceDetail extends GatewayServiceSummary {
  auditSummary: Array<{
    action: string;
    actor: string;
    createdAt: string;
  }>;
}

export async function listServices(
  query: ServiceListQuery = {},
): Promise<ServiceListResult> {
  const res = await apiClient.get<ServiceListResult>("/services", {
    params: query,
  });
  return res.data;
}

export async function getService(id: string): Promise<ServiceDetail> {
  const res = await apiClient.get<ServiceDetail>(`/services/${id}`);
  return res.data;
}

export async function createService(
  input: ServiceCreateInput,
): Promise<GatewayServiceSummary> {
  const res = await apiClient.post<GatewayServiceSummary>("/services", input);
  return res.data;
}

export async function updateService(
  id: string,
  input: ServiceUpdateInput,
): Promise<GatewayServiceSummary> {
  const res = await apiClient.patch<GatewayServiceSummary>(
    `/services/${id}`,
    input,
  );
  return res.data;
}

export async function deleteService(id: string): Promise<{ id: string; isActive: boolean }> {
  const res = await apiClient.delete(`/services/${id}`);
  return res.data;
}