import { apiClient } from "./client";

export interface KeyAuthCredential {
  id: string;
  key: string;
  consumer?: { id?: string };
  created_at?: number;
}

export interface CreateCredentialInput {
  key?: string;
  ttl?: number;
}

export async function listKeyAuthCredentials(
  consumerId: string,
): Promise<KeyAuthCredential[]> {
  const res = await apiClient.get<KeyAuthCredential[]>(
    `/consumers/${consumerId}/credentials`,
  );
  return res.data;
}

export async function createKeyAuthCredential(
  consumerId: string,
  input: CreateCredentialInput,
): Promise<KeyAuthCredential> {
  const res = await apiClient.post<KeyAuthCredential>(
    `/consumers/${consumerId}/credentials`,
    input,
  );
  return res.data;
}

export async function rotateKeyAuthCredential(
  consumerId: string,
  credentialId: string,
  key: string,
): Promise<KeyAuthCredential> {
  const res = await apiClient.patch<KeyAuthCredential>(
    `/consumers/${consumerId}/credentials/${credentialId}`,
    { key },
  );
  return res.data;
}

export async function deleteKeyAuthCredential(
  consumerId: string,
  credentialId: string,
): Promise<void> {
  await apiClient.delete(`/consumers/${consumerId}/credentials/${credentialId}`);
}