import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Temporary123!";
const BCRYPT_COST = 10;

interface SeedRoleEntry {
  role: string;
  kongName?: string;
}

type SeedRole = string | SeedRoleEntry;

interface SeedUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: SeedRole[];
}

function toSeedRole(entry: SeedRole): SeedRoleEntry {
  return typeof entry === "string" ? { role: entry } : entry;
}

const seedUsers: SeedUser[] = [
  {
    email: "admin@apipdashboard.local",
    username: "platform-admin",
    firstName: "Platform",
    lastName: "Admin",
    roles: ["platform_admin"],
  },
  {
    email: "dev@apipdashboard.local",
    username: "platform-dev",
    firstName: "Platform",
    lastName: "Dev",
    roles: ["platform_dev"],
  },
  {
    email: "service-admin@apipdashboard.local",
    username: "service-admin",
    firstName: "Service",
    lastName: "Admin",
    roles: [
      { role: "service_admin", kongName: "catalog-api" },
      { role: "service_admin", kongName: "orders-api" },
    ],
  },
  {
    email: "service-dev@apipdashboard.local",
    username: "service-developer",
    firstName: "Service",
    lastName: "Developer",
    roles: [
      { role: "service_dev", kongName: "catalog-api" },
      { role: "service_dev", kongName: "orders-api" },
    ],
  },
  {
    email: "service-viewer@apipdashboard.local",
    username: "service-viewer",
    firstName: "Service",
    lastName: "Viewer",
    roles: [{ role: "service_viewer", kongName: "catalog-api" }],
  },
  {
    email: "consumer-admin@apipdashboard.local",
    username: "consumer-admin",
    firstName: "Consumer",
    lastName: "Admin",
    roles: ["consumer_admin"],
  },
  {
    email: "user@apipdashboard.local",
    username: "platform-user",
    firstName: "Platform",
    lastName: "User",
    roles: ["platform_viewer"],
  },
];

const defaultServices: Array<{
  name: string;
  description: string;
  kongName: string;
  tags: string[];
}> = [
  {
    name: "Catalog API",
    description: "Product catalog service exposed via the gateway",
    kongName: "catalog-api",
    tags: ["catalog", "products"],
  },
  {
    name: "Orders API",
    description: "Order management backend service",
    kongName: "orders-api",
    tags: ["orders", "commerce"],
  },
  {
    name: "Identity API",
    description: "Internal identity and profile service",
    kongName: "identity-api",
    tags: ["identity", "auth"],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  for (const svc of defaultServices) {
    const existing = await prisma.gatewayService.findFirst({
      where: { kongName: svc.kongName },
    });
    if (existing) {
      await prisma.gatewayService.update({
        where: { id: existing.id },
        data: {
          name: svc.name,
          description: svc.description,
          tags: svc.tags,
        },
      });
    } else {
      await prisma.gatewayService.create({
        data: {
          name: svc.name,
          description: svc.description,
          kongName: svc.kongName,
          tags: svc.tags,
        },
      });
    }
  }

  await prisma.roleAssignment.deleteMany({
    where: {
      role: { in: ["role:assign", "platform_user", "service_developer"] },
    },
  });

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: "",
      },
      create: {
        email: user.email,
        passwordHash,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: "",
      },
    });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (!dbUser) {
      throw new Error(`failed to create seed user ${user.username}`);
    }

    const scopedRoles = new Set(
      user.roles
        .map(toSeedRole)
        .filter((e) => e.kongName)
        .map((e) => e.role),
    );
    if (scopedRoles.size > 0) {
      await prisma.roleAssignment.deleteMany({
        where: { userId: dbUser.id, role: { in: [...scopedRoles] }, resourceId: null },
      });
    }

    for (const entry of user.roles) {
      const { role, kongName } = toSeedRole(entry);
      let resourceId: string | null = null;
      let resourceType: string | null = null;
      if (kongName) {
        const svc = await prisma.gatewayService.findFirst({
          where: { kongName },
        });
        if (!svc) {
          throw new Error(`seed service not found: ${kongName}`);
        }
        resourceId = svc.id;
        resourceType = "service";
      }

      const existingRole = await prisma.roleAssignment.findFirst({
        where: {
          userId: dbUser.id,
          role,
          resourceType,
          resourceId,
        },
      });
      if (existingRole) {
        continue;
      }
      await prisma.roleAssignment.create({
        data: {
          userId: dbUser.id,
          role,
          resourceId,
          resourceType,
        },
      });
    }
  }

  console.log(`Seed complete (password for all users: ${SEED_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });