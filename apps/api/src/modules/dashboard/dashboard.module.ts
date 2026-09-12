import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { HealthModule } from "../health/health.module";

@Module({
  imports: [HealthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}