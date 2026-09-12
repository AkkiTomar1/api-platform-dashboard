import type { z } from "zod";
import { consumerCreateSchema, consumerUpdateSchema } from "@shared";
import { apiClient } from "./client";

export type ConsumerCreateInput = z.infer<typeof consumerCreateSchema>;
export type ConsumerUpdateInput = z.infer<typeof consumerUpdateSchema>;

export type ConsumerLinkStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

export interface ConsumerSummary {
  id: string;
  username: string | null;
  customId: string | null;
  createdAt: string;
  services: Array<{
    serviceId: string;
    serviceName: string;
    status: ConsumerLinkStatus;
  }>;
}

export interface ConsumerDetail {
  id: string;
  username: string | null;
  customId: string | null;
  createdAt: string;
  serviceConsumers: Array<{
    id: string;
    serviceId: string;
    status: ConsumerLinkStatus;
    service: { id: string; name: string };
  }>;
}

export async function listConsumers(): Promise<{
  data: ConsumerSummary[];
  total: number;
}> {
  const res = await apiClient.get<{ data: ConsumerSummary[]; total: number }>(
    "/consumers",
  );
  return res.data;
}

export async function getConsumer(id: string): Promise<ConsumerDetail> {
  const res = await apiClient.get<ConsumerDetail>(`/consumers/${id}`);
  return res.data;
}

export async function createConsumer(
  input: ConsumerCreateInput,
): Promise<ConsumerSummary> {
  const res = await apiClient.post<ConsumerSummary>("/consumers", input);
  return res.data;
}

export async function updateConsumer(
  id: string,
  input: ConsumerUpdateInput,
): Promise<ConsumerSummary> {
  const res = await apiClient.patch<ConsumerSummary>(`/consumers/${id}`, input);
  return res.data;
}

export async function deleteConsumer(id: string): Promise<void> {
  await apiClient.delete(`/consumers/${id}`);
}

export async function setConsumerLinkStatus(
  consumerId: string,
  serviceId: string,
  status: ConsumerLinkStatus,
): Promise<void> {
  await apiClient.patch(`/consumers/${consumerId}/link/${serviceId}`, { status });
}