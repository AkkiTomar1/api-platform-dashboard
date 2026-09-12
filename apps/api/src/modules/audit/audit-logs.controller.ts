import { Controller, Get, Query } from "@nestjs/common";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS } from "@shared";
import { AuditService } from "./audit.service";

function safeIntQuery(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.floor(n);
}

@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.AUDIT_READ)
  async list(
    @CurrentUser() user: RequestUser,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: string,
    @Query("userType") userType?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("userId") userId?: string,
    @Query("serviceId") serviceId?: string,
    @Query("consumerId") consumerId?: string,
  ) {
    return this.auditService.list(
      {
        page: safeIntQuery(page, 1),
        pageSize: safeIntQuery(pageSize, 20),
        limit: safeIntQuery(limit, 20),
        action,
        userType,
        dateFrom,
        dateTo,
        userId,
        serviceId,
        consumerId,
      },
      user,
    );
  }
}