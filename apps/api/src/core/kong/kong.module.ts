import { Global, Module } from "@nestjs/common";
import { KongClient } from "./kong-client";

@Global()
@Module({
  providers: [KongClient],
  exports: [KongClient],
})
export class KongModule {}
