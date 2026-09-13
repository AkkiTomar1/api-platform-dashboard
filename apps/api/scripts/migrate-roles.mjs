import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient();

const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`;

async function migrateRoles() {
  const [platformUser, serviceDeveloper, bogusAssign] = await prisma.$transaction([
    prisma.roleAssignment.updateMany({
      where: { role: "platform_user" },
      data: { role: "platform_viewer" },
    }),
    prisma.roleAssignment.updateMany({
      where: { role: "service_developer" },
      data: { role: "service_dev" },
    }),
    prisma.roleAssignment.deleteMany({ where: { role: "role:assign" } }),
  ]);
  console.log(
    `roles migrated: platform_user->platform_viewer (${platformUser.count}), ` +
      `service_developer->service_dev (${serviceDeveloper.count}), ` +
      `role:assign rows removed (${bogusAssign.count})`,
  );
}

async function flushRbacCache() {
  const redis = createClient({ url: REDIS_URL });
  redis.on("error", (err) => console.warn(`redis warning: ${err.message}`));
  await redis.connect().catch(() => {
    console.warn("redis unavailable, skipping rbac cache flush");
  });
  if (!redis.isOpen) {
    return;
  }
  let flushed = 0;
  for await (const key of redis.scanIterator({ MATCH: "rbac:user:*", COUNT: 100 })) {
    await redis.del(key);
    flushed++;
  }
  await redis.quit();
  console.log(`flushed ${flushed} rbac:user:* cache keys`);
}

await migrateRoles();
await flushRbacCache();

await prisma.$disconnect();
console.log("role migration complete");