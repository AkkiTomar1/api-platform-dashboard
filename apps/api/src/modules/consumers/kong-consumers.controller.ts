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
import { z } from "zod";
import type { ServiceConsumerStatus } from "@prisma/client";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS, consumerCreateSchema, consumerUpdateSchema } from "@shared";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { KongConsumersService } from "./kong-consumers.service";

type ConsumerCreateBody = z.infer<typeof consumerCreateSchema>;
type ConsumerUpdateBody = z.infer<typeof consumerUpdateSchema>;

@Controller("consumers")
export class KongConsumersController {
  constructor(private readonly consumers: KongConsumersService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.CONSUMERS_READ)
  list(@CurrentUser() user: RequestUser) {
    return this.consumers.list(user);
  }

  @Get(":id")
  @RequiredPermissions(PERMISSIONS.CONSUMERS_READ)
  findById(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.consumers.findById(id, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.CONSUMERS_CREATE)
  create(
    @Body(new zodValidationPipe(consumerCreateSchema)) body: ConsumerCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.consumers.create(body, user, req.ip);
  }

  @Patch(":id")
  @RequiredPermissions(PERMISSIONS.CONSUMERS_UPDATE)
  update(
    @Param("id") id: string,
    @Body(new zodValidationPipe(consumerUpdateSchema)) body: ConsumerUpdateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.consumers.update(id, body, user, req.ip);
  }

  @Patch(":id/link/:serviceId")
  @RequiredPermissions(PERMISSIONS.CONSUMERS_UPDATE)
  setLinkStatus(
    @Param("id") id: string,
    @Param("serviceId") serviceId: string,
    @Body() body: { status: ServiceConsumerStatus },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.consumers.setLinkStatus(id, serviceId, body.status, user, req.ip);
  }

  @Delete(":id")
  @RequiredPermissions(PERMISSIONS.CONSUMERS_DELETE)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.consumers.remove(id, user, req.ip);
  }
}