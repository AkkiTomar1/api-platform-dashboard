import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PermissionService } from "./permission.service";
import { RbacGuard } from "./rbac.guard";

@Global()
@Module({
  providers: [
    PermissionService,
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
  exports: [PermissionService],
})
export class RbacModule {}
