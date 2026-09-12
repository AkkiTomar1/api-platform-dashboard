import { Module } from "@nestjs/common";
import { KongRoutesService } from "./kong-routes.service";
import { KongRoutesController } from "./kong-routes.controller";

@Module({
  controllers: [KongRoutesController],
  providers: [KongRoutesService],
})
export class KongRoutesModule {}