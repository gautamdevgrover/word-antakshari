import express from "express";
import { prisma, redis } from "./lib/services.js";
export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.get("/health/live", (_req, res) => { res.json({ status: "ok", service: "backend" }); });
app.get("/health", async (_req, res) => {
  const results = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const database = results[0].status === "fulfilled";
  const cache = results[1].status === "fulfilled";
  res.set("Cache-Control", "no-store").status(database && cache ? 200 : 503).json({
    status: database && cache ? "ok" : "unavailable", service: "backend",
    dependencies: { postgres: database ? "ok" : "unavailable", redis: cache ? "ok" : "unavailable" },
  });
});
