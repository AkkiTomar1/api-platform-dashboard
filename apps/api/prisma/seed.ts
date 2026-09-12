import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Temporary123!";
const BCRYPT_COST = 10;

interface SeedUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
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
    roles: ["service_admin", "role:assign"],
  },
  {
    email: "service-dev@apipdashboard.local",
    username: "service-developer",
    firstName: "Service",
    lastName: "Developer",
    roles: ["service_developer"],
  },
  {
    email: "service-viewer@apipdashboard.local",
    username: "service-viewer",
    firstName: "Service",
    lastName: "Viewer",
    roles: ["service_viewer"],
  },
  {
    email: "consumer-admin@apipdashboard.local",
    username: "consumer-admin",
    firstName: "Consumer",
    lastName: "Admin",
    roles: ["consumer_admin", "role:assign"],
  },
  {
    email: "user@apipdashboard.local",
    username: "platform-user",
    firstName: "Platform",
    lastName: "User",
    roles: ["platform_user"],
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

    for (const role of user.roles) {
      const existingRole = await prisma.roleAssignment.findFirst({
        where: {
          userId: dbUser.id,
          role,
          resourceId: null,
          resourceType: null,
        },
      });
      if (existingRole) {
        continue;
      }
      await prisma.roleAssignment.create({
        data: {
          userId: dbUser.id,
          role,
          resourceId: null,
          resourceType: null,
        },
      });
    }
  }

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