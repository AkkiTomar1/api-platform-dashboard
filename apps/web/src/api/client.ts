import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { logout as apiLogout, refreshToken } from "./auth";

const TOKEN_KEY = "api-dashboard:access-token";
const REFRESH_KEY = "api-dashboard:refresh-token";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredTokens(accessToken: string | null, refreshTokenValue: string | null): void {
  if (accessToken === null) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, accessToken);
  }
  if (refreshTokenValue === null) {
    localStorage.removeItem(REFRESH_KEY);
  } else {
    localStorage.setItem(REFRESH_KEY, refreshTokenValue);
  }
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function logoutLocal(): void {
  const refreshTokenValue = getStoredRefreshToken();
  if (refreshTokenValue) {
    apiLogout(refreshTokenValue).catch(() => undefined);
  }
  setStoredTokens(null, null);
  window.location.assign("/login");
}

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const url = String(config?.url ?? "");

    if (status === 401 && config && !config._retried && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      config._retried = true;
      const refreshTokenValue = getStoredRefreshToken();
      if (refreshTokenValue) {
        try {
          const result = await refreshToken(refreshTokenValue);
          setStoredTokens(result.accessToken, result.refreshToken);
          config.headers.Authorization = `Bearer ${result.accessToken}`;
          return apiClient(config);
        } catch (refreshError) {
          logoutLocal();
          return Promise.reject(refreshError);
        }
      }
      logoutLocal();
    } else if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      logoutLocal();
    }
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string") {
      return Promise.reject(new Error(data.message));
    }
    return Promise.reject(error);
  },
);