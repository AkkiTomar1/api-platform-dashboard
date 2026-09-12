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
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS, routeCreateSchema } from "@shared";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { KongRoutesService } from "./kong-routes.service";

type RouteCreateBody = z.infer<typeof routeCreateSchema>;
type RouteUpdateBody = z.infer<ReturnType<typeof routeCreateSchema.partial>>;

@Controller("services/:serviceId/routes")
export class KongRoutesController {
  constructor(private readonly routes: KongRoutesService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.ROUTES_READ)
  list(@Param("serviceId") serviceId: string, @CurrentUser() user: RequestUser) {
    return this.routes.list(serviceId, user);
  }

  @Get(":routeId")
  @RequiredPermissions(PERMISSIONS.ROUTES_READ)
  findById(
    @Param("serviceId") serviceId: string,
    @Param("routeId") routeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.routes.findById(serviceId, routeId, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.ROUTES_CREATE)
  create(
    @Param("serviceId") serviceId: string,
    @Body(new zodValidationPipe(routeCreateSchema)) body: RouteCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.routes.create({ ...body, serviceId }, user, req.ip);
  }

  @Patch(":routeId")
  @RequiredPermissions(PERMISSIONS.ROUTES_UPDATE)
  update(
    @Param("serviceId") serviceId: string,
    @Param("routeId") routeId: string,
    @Body(new zodValidationPipe(routeCreateSchema.partial())) body: RouteUpdateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.routes.update(serviceId, routeId, body, user, req.ip);
  }

  @Delete(":routeId")
  @RequiredPermissions(PERMISSIONS.ROUTES_DELETE)
  remove(
    @Param("serviceId") serviceId: string,
    @Param("routeId") routeId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.routes.remove(serviceId, routeId, user, req.ip);
  }
}