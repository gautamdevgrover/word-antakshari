import "dotenv/config";
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
const origin = required("APP_ORIGIN");
if (new URL(origin).origin !== origin) throw new Error("APP_ORIGIN must be an HTTP(S) origin without a trailing slash");
if (!/^https?:/.test(origin)) throw new Error("APP_ORIGIN must use HTTP(S)");
export const config = { port, origin, databaseUrl: required("DATABASE_URL"), redisUrl: required("REDIS_URL") };
