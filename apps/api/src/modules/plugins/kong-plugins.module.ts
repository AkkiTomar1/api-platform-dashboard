import { Module } from "@nestjs/common";
import { KongPluginsService } from "./kong-plugins.service";
import {
  KongPluginsController,
  KongRoutePluginsController,
  KongConsumerPluginsController,
} from "./kong-plugins.controller";

@Module({
  controllers: [
    KongPluginsController,
    KongRoutePluginsController,
    KongConsumerPluginsController,
  ],
  providers: [KongPluginsService],
})
export class KongPluginsModule {}