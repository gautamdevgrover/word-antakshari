import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "./config.js";
import { connectServices, disconnectServices } from "./lib/services.js";
import { attachRealtime } from "./realtime.js";
const server = createServer(app);
const io = attachRealtime(server);
let stopping = false;
async function shutdown(code: number) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 8000);
  deadline.unref();
  io.close();
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectServices();
  process.exit(code);
}
process.on("SIGTERM", () => void shutdown(0));
process.on("SIGINT", () => void shutdown(0));
server.on("error", (error) => { console.error("HTTP server error:", error.message); void shutdown(1); });
try {
  await connectServices();
  server.listen(config.port, "0.0.0.0", () => console.log(`Backend listening on ${config.port}`));
} catch (error) {
  console.error("Backend startup failed:", error instanceof Error ? error.message : "Unknown error");
  await shutdown(1);
}
