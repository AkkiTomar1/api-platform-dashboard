import type { RequestUser } from "@shared";
import { apiClient } from "./client";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: RequestUser;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await apiClient.post<AuthResult>("/auth/login", {
    email,
    password,
  });
  return res.data;
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<AuthResult> {
  const res = await apiClient.post<AuthResult>("/auth/refresh", {
    refreshToken: refreshTokenValue,
  });
  return res.data;
}

export async function logout(refreshTokenValue: string): Promise<void> {
  await apiClient.post("/auth/logout", { refreshToken: refreshTokenValue });
}

export async function fetchMe(): Promise<RequestUser> {
  const res = await apiClient.get<RequestUser>("/auth/me");
  return res.data;
}