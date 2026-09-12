import { Module } from "@nestjs/common";
import { RoleAssignmentsService } from "./role-assignments.service";
import { RoleAssignmentsController } from "./role-assignments.controller";

@Module({
  controllers: [RoleAssignmentsController],
  providers: [RoleAssignmentsService],
})
export class RoleAssignmentsModule {}