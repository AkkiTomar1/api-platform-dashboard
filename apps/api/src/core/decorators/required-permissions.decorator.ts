import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@shared";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export const RequiredPermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
