import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private url: string;

  constructor(private config: ConfigService) {
    this.url =
      this.config.get<string>("REDIS_URL") ??
      `redis://${this.config.get<string>("REDIS_HOST") ?? "localhost"}:${
        this.config.get<string>("REDIS_PORT") ?? "6380"
      }`;
  }

  async onModuleInit() {
    this.client = createClient({
      url: this.url,
      password: this.config.get<string>("REDIS_PASSWORD") || undefined,
      socket: { reconnectStrategy: false },
    });
    this.client.on("error", () => {
      // non-fatal: Redis may be down in dev
    });
    await this.client.connect().catch(() => {
      // ignore connection errors; health probe catches state
    });
  }

  isReady(): boolean {
    return Boolean(this.client?.isOpen) && this.client.isOpen;
  }

  isConfigured(): boolean {
    return (
      this.config.get<string>("REDIS_URL") !== undefined ||
      this.config.get<string>("REDIS_HOST") !== undefined
    );
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) return false;
      const res = await this.client.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      if (val === null || val === undefined) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, str, { EX: ttlSeconds });
      } else {
        await this.client.set(key, str);
      }
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.disconnect().catch(() => {});
    }
  }
}
