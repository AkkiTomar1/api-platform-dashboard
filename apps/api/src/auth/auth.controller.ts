import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { CurrentUser } from "../core/decorators/current-user.decorator";
import { Public } from "../core/decorators/public.decorator";
import { zodValidationPipe } from "../core/pipes/zod.pipe";
import { loginBodySchema, refreshBodySchema } from "@shared";
import type { RequestUser } from "@shared";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body(new zodValidationPipe(loginBodySchema))
    body: z.infer<typeof loginBodySchema>,
    @Req() req: Request,
  ) {
    return this.authService.login(body.email, body.password, req.ip);
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Body(new zodValidationPipe(refreshBodySchema))
    body: z.infer<typeof refreshBodySchema>,
  ) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post("logout")
  async logout(
    @Body(new zodValidationPipe(refreshBodySchema))
    body: { refreshToken: string },
    @Req() req: Request,
  ) {
    await this.authService.logout(body.refreshToken, req.ip);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}