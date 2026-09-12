import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { readFileSync } from "node:fs";
import type { JwtAuthPayload } from "./jwt-auth.types";
import type { RequestUser } from "@shared";
import { AuthService } from "./auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService, private readonly authService: AuthService) {
    const issuer = config.get<string>("JWT_ISSUER") ?? "api-platform-dashboard";
    const source = config.get<string>("JWT_PUBLIC_KEY")?.trim();

    let publicKey: string;
    if (source) {
      publicKey = source;
    } else {
      const path =
        config.get<string>("JWT_PUBLIC_KEY_PATH") ?? "jwt-public.pem";
      try {
        publicKey = readFileSync(path, "utf8");
      } catch (err) {
        Logger.error(
          `No JWT public key available (${path}). Run "bun run keys:generate" and set JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH.`,
          String(err),
          JwtStrategy.name,
        );
        throw err;
      }
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: (_req: unknown, _rawJwt: string, done: (err: unknown, key: string) => void) =>
        done(null, publicKey),
      algorithms: ["RS256"],
      ignoreExpiration: false,
      issuer,
    });
  }

  async validate(payload: JwtAuthPayload): Promise<RequestUser> {
    if (!payload.sub) {
      throw new Error("JWT missing subject");
    }
    return this.authService.buildRequestUser(payload.sub);
  }
}