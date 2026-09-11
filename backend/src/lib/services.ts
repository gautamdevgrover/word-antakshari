import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "redis";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";
export const prisma = new PrismaClient({ adapter: new PrismaPg({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000,
  query_timeout: 2000,
}) });
export const redis = createClient({ url: config.redisUrl, disableOfflineQueue: true,
  socket: { connectTimeout: 2000 } });
redis.on("error", (error: Error) => console.error("Redis connection error:", error.message));
export async function connectServices() {
  await prisma.$connect();
  await redis.connect();
}
export async function disconnectServices() {
  await Promise.allSettled([prisma.$disconnect(), redis.isOpen ? redis.close() : Promise.resolve()]);
}
