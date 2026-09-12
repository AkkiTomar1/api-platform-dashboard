import { Module } from "@nestjs/common";
import { KongCredentialsService } from "./kong-credentials.service";
import { KongCredentialsController } from "./kong-credentials.controller";

@Module({
  controllers: [KongCredentialsController],
  providers: [KongCredentialsService],
})
export class KongCredentialsModule {}