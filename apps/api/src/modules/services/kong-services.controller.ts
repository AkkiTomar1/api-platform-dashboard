import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS, serviceCreateSchema, serviceUpdateSchema } from "@shared";
import { z } from "zod";
import type { RequestUser } from "@shared";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { KongServicesService } from "./kong-services.service";

type ServiceUpdateBody = z.infer<typeof serviceUpdateSchema>;

function safeInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

@Controller("services")
export class KongServicesController {
  constructor(private readonly services: KongServicesService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.SERVICES_READ)
  list(
    @CurrentUser() user: RequestUser,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sort") sort?: string,
    @Query("sortOrder") sortOrder?: string,
  ) {
    return this.services.list(
      { search, page: safeInt(page, 1), pageSize: safeInt(pageSize, 20), sort, sortOrder },
      user,
    );
  }

  @Get(":id")
  @RequiredPermissions(PERMISSIONS.SERVICES_READ)
  findById(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.services.findById(id, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.SERVICES_CREATE)
  create(
    @Body(new zodValidationPipe(serviceCreateSchema))
    body: {
      name: string;
      description: string;
      kongName: string;
      tags?: string[];
      url?: string | null;
      host?: string;
      path?: string;
      port?: number;
      protocol?: "http" | "https";
    },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.services.create(
      {
        name: body.name,
        description: body.description,
        kongName: body.kongName,
        tags: body.tags,
        url: body.url ?? null,
        host: body.host ?? "localhost",
        path: body.path ?? "/",
        port: body.port ?? 80,
        protocol: body.protocol ?? "http",
      },
      user,
      req.ip,
    );
  }

  @Patch(":id")
  @RequiredPermissions(PERMISSIONS.SERVICES_UPDATE)
  update(
    @Param("id") id: string,
    @Body(new zodValidationPipe(serviceUpdateSchema)) body: ServiceUpdateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.services.update(id, body, user, req.ip);
  }

  @Delete(":id")
  @RequiredPermissions(PERMISSIONS.SERVICES_DELETE)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.services.remove(id, user, req.ip);
  }
}