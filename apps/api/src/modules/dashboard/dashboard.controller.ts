import { Controller, Get } from "@nestjs/common";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { PERMISSIONS } from "@shared";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @RequiredPermissions(PERMISSIONS.DASHBOARD_VIEW)
  async stats(@CurrentUser() user: RequestUser) {
    return this.dashboardService.stats(user);
  }
}