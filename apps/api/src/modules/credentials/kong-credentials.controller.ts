import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS } from "@shared";
import { KongCredentialsService } from "./kong-credentials.service";

@Controller("consumers/:consumerId/credentials")
export class KongCredentialsController {
  constructor(private readonly credentials: KongCredentialsService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.CREDENTIALS_READ)
  list(
    @Param("consumerId") consumerId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.credentials.list(consumerId, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.CREDENTIALS_CREATE)
  create(
    @Param("consumerId") consumerId: string,
    @Body() body: { key?: string; ttl?: number },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.credentials.create({ consumerId, ...body }, user, req.ip);
  }

  @Patch(":credentialId")
  @RequiredPermissions(PERMISSIONS.CREDENTIALS_UPDATE)
  update(
    @Param("consumerId") consumerId: string,
    @Param("credentialId") credentialId: string,
    @Body() body: { key: string },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.credentials.update(consumerId, credentialId, body.key, user, req.ip);
  }

  @Delete(":credentialId")
  @RequiredPermissions(PERMISSIONS.CREDENTIALS_DELETE)
  remove(
    @Param("consumerId") consumerId: string,
    @Param("credentialId") credentialId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.credentials.remove(consumerId, credentialId, user, req.ip);
  }
}