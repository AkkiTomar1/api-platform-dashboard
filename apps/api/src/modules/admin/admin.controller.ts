import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { PERMISSIONS, userUpdateSchema, adminUserCreateSchema } from "@shared";
import { z } from "zod";
import type { RequestUser } from "@shared";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { RequiredPermissions } from "../../core/decorators/required-permissions.decorator";
import { zodValidationPipe } from "../../core/pipes/zod.pipe";
import { AdminService } from "./admin.service";

type UserUpdateBody = z.infer<typeof userUpdateSchema>;
type UserCreateBody = z.infer<typeof adminUserCreateSchema>;

@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  @RequiredPermissions(PERMISSIONS.ADMIN_USERS)
  users() {
    return this.admin.listUsers();
  }

  @Get("roles")
  @RequiredPermissions(PERMISSIONS.ADMIN_ROLES)
  roles() {
    return this.admin.listRoles();
  }

  @Post("users")
  @RequiredPermissions(PERMISSIONS.ADMIN_USERS)
  createUser(
    @Body(new zodValidationPipe(adminUserCreateSchema)) body: UserCreateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.admin.createUser(body, user, req.ip);
  }

  @Patch("users/:id")
  @RequiredPermissions(PERMISSIONS.ADMIN_USERS)
  updateUser(
    @Param("id") id: string,
    @Body(new zodValidationPipe(userUpdateSchema)) body: UserUpdateBody,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.admin.updateUser(id, body, user, req.ip);
  }
}