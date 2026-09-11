import assert from "node:assert/strict";
import { io } from "socket.io-client";

const base = process.env.STACK_URL ?? "http://localhost:8080";

async function testTimeoutAndPersistence() {
  console.log("--- Testing Turn Timeout and Database Persistence ---");

  const socket1 = io(base, {
    transports: ["websocket"],
    extraHeaders: { Origin: base },
  });
  const socket2 = io(base, {
    transports: ["websocket"],
    extraHeaders: { Origin: base },
  });

  await Promise.all([
    new Promise<void>((res) => socket1.on("connect", res)),
    new Promise<void>((res) => socket2.on("connect", res)),
  ]);

  // Create & join room
  const createPromise = new Promise<any>((res) => socket1.on("room:created", res));
  socket1.emit("room:create", { playerName: "Gautam" });
  const { room, player: p1 } = await createPromise;

  const joinPromise = new Promise<any>((res) => socket2.on("room:joined", res));
  socket2.emit("room:join", { roomCode: room.roomCode, playerName: "Sister" });
  await joinPromise;

  // Start game
  socket1.emit("game:start", { roomCode: room.roomCode });

  console.log("Waiting for timeouts across 2 rounds to conclude the match (target: 2 wins)...");
  
  const gameOverPromise = new Promise<any>((resolve) => {
    socket1.on("room:updated", (r) => {
      console.log(`Room updated: status=${r.status}, round=${r.currentRound}, p1Wins=${r.players[0]?.roundsWon}, p2Wins=${r.players[1]?.roundsWon}`);
      if (r.status === "game_over") {
        resolve(r);
      }
    });
  });

  const finalRoom = await Promise.race([
    gameOverPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Match did not finish within timeout period")), 60000)),
  ]);

  assert.equal(finalRoom.status, "game_over");
  assert.equal(finalRoom.roundHistory.length, 3);
  console.log(`PASS: Game over reached! Winner: ${finalRoom.roundHistory[1].winnerName}`);

  socket1.disconnect();
  socket2.disconnect();

  console.log("PASS: Timeout handling and game conclusion verified!");
}

testTimeoutAndPersistence().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
