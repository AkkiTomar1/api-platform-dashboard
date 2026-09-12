import { Module } from "@nestjs/common";
import { KongServicesService } from "./kong-services.service";
import { KongServicesController } from "./kong-services.controller";

@Module({
  controllers: [KongServicesController],
  providers: [KongServicesService],
})
export class KongServicesModule {}