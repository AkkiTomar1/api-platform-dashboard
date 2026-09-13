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
import {
  PERMISSIONS,
  pluginCreateSchema,
  routePluginCreateSchema,
  consumerPluginCreateSchema,
  pluginUpdateSchema,
} from "@shared";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { KongPluginsService } from "./kong-plugins.service";

type PluginCreateBody = z.infer<typeof pluginCreateSchema>;
type PluginUpdateBody = z.infer<ReturnType<typeof pluginCreateSchema.partial>>;
type RoutePluginCreateBody = z.infer<typeof routePluginCreateSchema>;
type ConsumerPluginCreateBody = z.infer<typeof consumerPluginCreateSchema>;
type PluginUpdateBodyGeneric = z.infer<typeof pluginUpdateSchema>;

@Controller("services/:serviceId/plugins")
export class KongPluginsController {
  constructor(private readonly plugins: KongPluginsService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.PLUGINS_READ)
  list(@Param("serviceId") serviceId: string, @CurrentUser() user: RequestUser) {
    return this.plugins.list(serviceId, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.PLUGINS_CREATE)
  create(
    @Param("serviceId") serviceId: string,
    @Body(new zodValidationPipe(pluginCreateSchema)) body: PluginCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.create({ ...body, serviceId }, user, req.ip);
  }

  @Patch(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_UPDATE)
  update(
    @Param("serviceId") serviceId: string,
    @Param("pluginId") pluginId: string,
    @Body(new zodValidationPipe(pluginCreateSchema.partial())) body: PluginUpdateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.update(serviceId, pluginId, body, user, req.ip);
  }

  @Delete(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_DELETE)
  remove(
    @Param("serviceId") serviceId: string,
    @Param("pluginId") pluginId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.remove(serviceId, pluginId, user, req.ip);
  }
}

@Controller("routes/:routeId/plugins")
export class KongRoutePluginsController {
  constructor(private readonly plugins: KongPluginsService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.PLUGINS_READ)
  list(@Param("routeId") routeId: string, @CurrentUser() user: RequestUser) {
    return this.plugins.listByRoute(routeId, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.PLUGINS_CREATE)
  create(
    @Param("routeId") routeId: string,
    @Body(new zodValidationPipe(routePluginCreateSchema)) body: RoutePluginCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.createByRoute({ ...body, routeId }, user, req.ip);
  }

  @Patch(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_UPDATE)
  update(
    @Param("routeId") routeId: string,
    @Param("pluginId") pluginId: string,
    @Body(new zodValidationPipe(pluginUpdateSchema)) body: PluginUpdateBodyGeneric,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.updateByRoute(routeId, pluginId, body, user, req.ip);
  }

  @Delete(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_DELETE)
  remove(
    @Param("routeId") routeId: string,
    @Param("pluginId") pluginId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.removeByRoute(routeId, pluginId, user, req.ip);
  }
}

@Controller("consumers/:consumerId/plugins")
export class KongConsumerPluginsController {
  constructor(private readonly plugins: KongPluginsService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.PLUGINS_READ)
  list(@Param("consumerId") consumerId: string, @CurrentUser() user: RequestUser) {
    return this.plugins.listByConsumer(consumerId, user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.PLUGINS_CREATE)
  create(
    @Param("consumerId") consumerId: string,
    @Body(new zodValidationPipe(consumerPluginCreateSchema)) body: ConsumerPluginCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.createByConsumer({ ...body, consumerId }, user, req.ip);
  }

  @Patch(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_UPDATE)
  update(
    @Param("consumerId") consumerId: string,
    @Param("pluginId") pluginId: string,
    @Body(new zodValidationPipe(pluginUpdateSchema)) body: PluginUpdateBodyGeneric,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.updateByConsumer(consumerId, pluginId, body, user, req.ip);
  }

  @Delete(":pluginId")
  @RequiredPermissions(PERMISSIONS.PLUGINS_DELETE)
  remove(
    @Param("consumerId") consumerId: string,
    @Param("pluginId") pluginId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.plugins.removeByConsumer(consumerId, pluginId, user, req.ip);
  }
}