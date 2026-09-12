import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS, type Permission, type RequestUser } from "@shared";
import { PermissionService } from "./permission.service";
import { REQUIRED_PERMISSIONS_KEY } from "../core/decorators/required-permissions.decorator";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: RequestUser | undefined }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    if (
      user.isPlatformAdmin ||
      this.permissionService.hasAnyPermission(user.permissions, required)
    ) {
      return true;
    }

    // grant audit:read to all roles (the real control is data scoping)
    if (required.includes(PERMISSIONS.AUDIT_READ as Permission)) {
      return true;
    }

    throw new ForbiddenException("Insufficient permissions");
  }
}
