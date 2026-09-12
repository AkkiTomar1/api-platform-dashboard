import { Module } from "@nestjs/common";
import { KongPluginsService } from "./kong-plugins.service";
import { KongPluginsController } from "./kong-plugins.controller";

@Module({
  controllers: [KongPluginsController],
  providers: [KongPluginsService],
})
export class KongPluginsModule {}