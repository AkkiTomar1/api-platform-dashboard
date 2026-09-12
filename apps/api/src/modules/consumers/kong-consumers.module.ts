import { Module } from "@nestjs/common";
import { KongConsumersService } from "./kong-consumers.service";
import { KongConsumersController } from "./kong-consumers.controller";

@Module({
  controllers: [KongConsumersController],
  providers: [KongConsumersService],
})
export class KongConsumersModule {}