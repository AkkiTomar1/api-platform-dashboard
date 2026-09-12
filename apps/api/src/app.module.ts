import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { AuditModule } from "./modules/audit/audit.module";
import { KongServicesModule } from "./modules/services/kong-services.module";
import { KongRoutesModule } from "./modules/routes/kong-routes.module";
import { KongPluginsModule } from "./modules/plugins/kong-plugins.module";
import { KongConsumersModule } from "./modules/consumers/kong-consumers.module";
import { KongCredentialsModule } from "./modules/credentials/kong-credentials.module";
import { RoleAssignmentsModule } from "./modules/role-assignments/role-assignments.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PrismaModule } from "./core/prisma/prisma.module";
import { RedisModule } from "./core/redis/redis.module";
import { KongModule } from "./core/kong/kong.module";
import { RbacModule } from "./rbac/rbac.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    KongModule,
    AuthModule,
    RbacModule,
    HealthModule,
    DashboardModule,
    AuditModule,
    KongServicesModule,
    KongRoutesModule,
    KongPluginsModule,
    KongConsumersModule,
    KongCredentialsModule,
    RoleAssignmentsModule,
    AdminModule,
  ],
})
export class AppModule {}
