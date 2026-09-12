import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../core/decorators/public.decorator";
import { AuthService } from "./auth.service";
import type { JwtAuthPayload } from "./jwt-auth.types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const ok = Boolean(await super.canActivate(context));
    if (ok) {
      const request = context
        .switchToHttp()
        .getRequest<{ user?: unknown }>();
      const payload = request.user as JwtAuthPayload | undefined;
      if (payload?.sub) {
        request.user = await this.authService.buildRequestUser(payload.sub);
      }
    }
    return ok;
  }
}