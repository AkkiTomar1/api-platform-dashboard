import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma/prisma.service";
import { RedisService } from "../../core/redis/redis.service";
import { KongClient } from "../../core/kong/kong-client";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly kong: KongClient,
  ) {}

  async check() {
    const status: Record<string, string> = {};

    status.database = await this.prisma
      .$queryRaw`SELECT 1`
      .then(() => "up")
      .catch(() => "down");

    status.redis = this.redis.isConfigured()
      ? (await this.redis.ping())
        ? "up"
        : "down"
      : "skipped";

    status.kong = this.kong.isConfigured()
      ? await this.kong
          .get("/")
          .then(() => "up")
          .catch(() => "down")
      : "skipped";

    const degraded = Object.entries(status).some(([, s]) => s === "down");
    if (degraded) {
      throw new HttpException(
        { status: "partial", ...status, degraded: true },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: "ok", ...status, degraded: false };
  }
}