import assert from "node:assert/strict";
import { io } from "socket.io-client";

const base = process.env.STACK_URL ?? "http://localhost:8080";

function waitForWord(socket: any, expectedWord: string): Promise<any> {
  return new Promise((resolve) => {
    const handler = (data: any) => {
      if (data.word.toLowerCase() === expectedWord.toLowerCase()) {
        socket.off("word:accepted", handler);
        resolve(data);
      }
    };
    socket.on("word:accepted", handler);
  });
}

function waitForRejection(socket: any): Promise<any> {
  return new Promise((resolve) => {
    socket.once("word:rejected", resolve);
  });
}

async function runGameplayTest() {
  console.log("--- Starting Word Antakshari Live Gameplay Integration Test ---");

  // Create Socket 1 (Gautam - Host)
  const socket1 = io(base, {
    transports: ["websocket"],
    extraHeaders: { Origin: base },
  });

  // Create Socket 2 (Sister - Player 2)
  const socket2 = io(base, {
    transports: ["websocket"],
    extraHeaders: { Origin: base },
  });

  await Promise.all([
    new Promise<void>((resolve) => socket1.on("connect", resolve)),
    new Promise<void>((resolve) => socket2.on("connect", resolve)),
  ]);
  console.log("PASS: Both player sockets connected to server via WebSocket through Nginx.");

  // Step 1: P1 creates room
  const createPromise = new Promise<{ room: any; player: any }>((resolve) => {
    socket1.once("room:created", resolve);
  });
  socket1.emit("room:create", { playerName: "Gautam" });
  const { room: createdRoom, player: player1 } = await createPromise;

  assert.ok(createdRoom.roomCode, "Room code should exist");
  assert.equal(createdRoom.roomCode.length, 5, "Room code should be 5 characters");
  assert.equal(player1.name, "Gautam");
  assert.equal(createdRoom.status, "waiting");
  console.log(`PASS: Room created with code "${createdRoom.roomCode}" by ${player1.name}.`);

  // Step 2: P2 joins room
  const joinPromise = new Promise<{ room: any; player: any }>((resolve) => {
    socket2.once("room:joined", resolve);
  });
  socket2.emit("room:join", { roomCode: createdRoom.roomCode, playerName: "Sister" });
  const { room: joinedRoom, player: player2 } = await joinPromise;

  assert.equal(player2.name, "Sister");
  assert.equal(joinedRoom.players.length, 2, "Room should have 2 players");
  console.log(`PASS: Player 2 ("Sister") joined room "${createdRoom.roomCode}".`);

  // Step 3: P1 starts match
  const matchStartPromise = new Promise<any>((resolve) => {
    const handler = (r: any) => {
      if (r.status === "active") {
        socket1.off("room:updated", handler);
        resolve(r);
      }
    };
    socket1.on("room:updated", handler);
  });
  socket1.emit("game:start", { roomCode: createdRoom.roomCode });
  const activeRoom = await matchStartPromise;

  assert.equal(activeRoom.status, "active");
  assert.equal(activeRoom.currentRound, 1);
  assert.equal(activeRoom.currentTurnPlayerId, player1.id);
  assert.equal(activeRoom.requiredLetter, null, "First turn has no required letter");
  console.log("PASS: Match started, Round 1 active, Gautam's turn.");

  // Step 4: P1 submits "apple"
  const p1WordPromise = waitForWord(socket1, "apple");
  socket1.emit("word:submit", { roomCode: createdRoom.roomCode, word: "apple" });
  const p1WordResult = await p1WordPromise;

  assert.equal(p1WordResult.word, "apple");
  assert.equal(p1WordResult.score, 5); // 5 letters
  assert.equal(p1WordResult.nextLetter, "e");
  console.log(`PASS: "apple" accepted (+5 pts). Next letter: "e".`);

  // Step 5: P2 attempts invalid word "banana" (does not start with 'e')
  const rejectedLetterPromise = waitForRejection(socket2);
  socket2.emit("word:submit", { roomCode: createdRoom.roomCode, word: "banana" });
  const rejectedLetter = await rejectedLetterPromise;
  assert.match(rejectedLetter.reason, /must start with the letter "E"/i);
  console.log(`PASS: "banana" correctly rejected: ${rejectedLetter.reason}`);

  // Step 6: P2 attempts non-existent word "exyzxyz"
  const rejectedDictPromise = waitForRejection(socket2);
  socket2.emit("word:submit", { roomCode: createdRoom.roomCode, word: "exyzxyz" });
  const rejectedDict = await rejectedDictPromise;
  assert.match(rejectedDict.reason, /not a recognized English word/i);
  console.log(`PASS: "exyzxyz" correctly rejected: ${rejectedDict.reason}`);

  // Step 7: P2 submits "elephant" (valid, starts with 'e', 8 letters -> 8 + 2 bonus = 10 pts)
  const p2WordPromise = waitForWord(socket2, "elephant");
  socket2.emit("word:submit", { roomCode: createdRoom.roomCode, word: "elephant" });
  const p2WordResult = await p2WordPromise;

  assert.equal(p2WordResult.word, "elephant");
  assert.equal(p2WordResult.score, 10); // 8 letters + 2 bonus
  assert.equal(p2WordResult.nextLetter, "t");
  console.log(`PASS: "elephant" accepted (+10 pts with bonus). Next letter: "t".`);

  // Step 8: P1 submits "tree" (starts with 't', valid word, ends with 'e')
  const p1TreePromise = waitForWord(socket1, "tree");
  socket1.emit("word:submit", { roomCode: createdRoom.roomCode, word: "tree" });
  const p1TreeResult = await p1TreePromise;
  assert.equal(p1TreeResult.word, "tree");
  assert.equal(p1TreeResult.nextLetter, "e");
  console.log(`PASS: "tree" accepted (+4 pts). Next letter: "e".`);

  // Step 9: P2 attempts duplicate word "elephant" (starts with 'e', but already used earlier!)
  const rejectedDuplicatePromise = waitForRejection(socket2);
  socket2.emit("word:submit", { roomCode: createdRoom.roomCode, word: "elephant" });
  const rejectedDuplicate = await rejectedDuplicatePromise;
  assert.match(rejectedDuplicate.reason, /already been used/i);
  console.log(`PASS: Duplicate word "elephant" correctly rejected: ${rejectedDuplicate.reason}`);

  // Disconnect cleanly
  socket1.disconnect();
  socket2.disconnect();

  console.log("=== ALL MULTIPLAYER GAMEPLAY INTEGRATION TESTS PASSED! ===");
}

runGameplayTest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
