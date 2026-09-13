import { Injectable } from "@nestjs/common";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";

@Injectable()
export class KongClient {
  private readonly url: string;
  private readonly token?: string;

  constructor(config: ConfigService) {
    this.url = (config.get<string>("KONG_ADMIN_URL") ?? "").replace(/\/$/, "");
    this.token = config.get<string>("KONG_ADMIN_TOKEN") || undefined;
  }

  private client() {
    return axios.create({
      baseURL: this.url,
      headers: this.token
        ? { Authorization: `Bearer ${this.token}` }
        : undefined,
      timeout: 10000,
    });
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    if (!this.url) {
      throw new ServiceUnavailableException(
        "Kong admin API is not configured (KONG_ADMIN_URL)",
      );
    }
    const client = this.client();
    try {
      const res = await client.request<T>({
        method,
        url: path,
        data,
      });
      return res.data;
    } catch (err) {
      throw KongClient.mapKongError(err, this.url);
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("get", path);
  }

  post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>("post", path, data);
  }

  patch<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>("patch", path, data);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("delete", path);
  }

  isConfigured(): boolean {
    return this.url.length > 0;
  }

  static mapKongError(err: unknown, baseUrl: string): HttpException {
    if (err instanceof HttpException) {
      return err;
    }
    if (err instanceof AxiosError) {
      if (!err.response) {
        return new ServiceUnavailableException(
          `Kong admin API unreachable: ${baseUrl}`,
        );
      }
      const status = err.response.status;
      const body = err.response.data as Record<string, unknown> | undefined;
      const message =
        body?.message ?? body?.error ?? err.message ?? "Kong request failed";
      if (status === 404) {
        return new NotFoundException(message);
      }
      if (status === 409) {
        return new ConflictException(message);
      }
      if (status >= 500) {
        return new ServiceUnavailableException(message);
      }
      if (status >= 400 && status < 500) {
        return new BadRequestException(message);
      }
      return new HttpException(message, status);
    }
    return new HttpException("Kong request failed", 502);
  }
}
