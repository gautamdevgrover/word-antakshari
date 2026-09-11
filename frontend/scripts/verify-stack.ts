import assert from "node:assert/strict";
import { io } from "socket.io-client";
const base = process.env.STACK_URL ?? "http://localhost:8080";
for (const [path, service] of [["/health", "frontend"], ["/api/health", "backend"], ["/api/health/live", "backend"], ["/nginx-health", "nginx"]]) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, path);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, service);
  if (path === "/api/health") assert.deepEqual(body.dependencies, { postgres: "ok", redis: "ok" });
  console.log(`PASS ${path}`);
}
const home = await fetch(base, { signal: AbortSignal.timeout(5000) });
assert.equal(home.status, 200);
assert.match(await home.text(), /Word/);
console.log("PASS frontend HTML");
for (const transport of ["polling", "websocket"] as const) {
  await new Promise<void>((resolve, reject) => {
    const socket = io(base, { transports: [transport], reconnection: false, timeout: 5000, extraHeaders: { Origin: base } });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error(`${transport} timed out`)); }, 7000);
    socket.on("connect", () => { clearTimeout(timer); socket.disconnect(); resolve(); });
    socket.on("connect_error", (error) => { clearTimeout(timer); socket.disconnect(); reject(error); });
  });
  console.log(`PASS Socket.IO ${transport}`);
}
const rejected = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, {
  headers: { Origin: "https://untrusted.invalid" }, signal: AbortSignal.timeout(5000),
});
assert.equal(rejected.status, 403);
console.log("PASS unconfigured browser origin rejected");
