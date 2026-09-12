import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { PERMISSIONS, roleAssignmentCreateSchema } from "@shared";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { RoleAssignmentsService } from "./role-assignments.service";

@Controller("role-assignments")
export class RoleAssignmentsController {
  constructor(private readonly assignments: RoleAssignmentsService) {}

  @Get()
  @RequiredPermissions(PERMISSIONS.ROLE_ASSIGN)
  list(@CurrentUser() user: RequestUser) {
    return this.assignments.list(user);
  }

  @Post()
  @RequiredPermissions(PERMISSIONS.ROLE_ASSIGN)
  assign(
    @Body(new zodValidationPipe(roleAssignmentCreateSchema))
    body: {
      userId: string;
      role: string;
      resourceId?: string;
      resourceType?: string;
    },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.assignments.assign(body, user, req.ip);
  }

  @Patch(":id")
  @RequiredPermissions(PERMISSIONS.ROLE_ASSIGN)
  update(
    @Param("id") id: string,
    @Body()
    body: {
      role?: string;
      resourceId?: string | null;
      resourceType?: string | null;
    },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.assignments.update(id, body, user, req.ip);
  }

  @Delete(":id")
  @RequiredPermissions(PERMISSIONS.ROLE_ASSIGN)
  unassign(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.assignments.unassign(id, user, req.ip);
  }
}