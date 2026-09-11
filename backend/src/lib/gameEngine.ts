import { randomUUID } from "node:crypto";
import { validateWord } from "./dictionary.js";
import {
  saveRoomState,
  getRoomState,
  addUsedWord,
  getUsedWords,
  clearUsedWords,
  associateSocket,
  getSocketAssociation,
} from "./gameState.js";
import { persistMatchResult } from "./matchPersistence.js";
import type { Player, RoomState } from "./types.js";

const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TURN_SECONDS = 15;
const TARGET_WINS = 2; // Best of 3

const roomTimers = new Map<string, NodeJS.Timeout>();

export function clearRoomTimer(roomCode: string): void {
  const code = roomCode.toUpperCase();
  const existing = roomTimers.get(code);
  if (existing) {
    clearTimeout(existing);
    roomTimers.delete(code);
  }
}

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARACTERS.length);
    code += CODE_CHARACTERS[idx];
  }
  return code;
}

export async function createRoom(
  playerName: string,
  socketId: string
): Promise<{ room: RoomState; player: Player }> {
  const roomCode = generateRoomCode();
  const playerId = randomUUID();
  const cleanName = playerName.trim() || "Player 1";

  const hostPlayer: Player = {
    id: playerId,
    name: cleanName,
    socketId,
    score: 0,
    roundsWon: 0,
    connected: true,
  };

  const room: RoomState = {
    roomCode,
    hostId: playerId,
    status: "waiting",
    players: [hostPlayer],
    currentRound: 1,
    totalRounds: 3,
    targetWins: TARGET_WINS,
    currentTurnPlayerId: null,
    requiredLetter: null,
    lastWord: null,
    turnExpiresAt: null,
    turnDurationSeconds: DEFAULT_TURN_SECONDS,
    roundHistory: [],
    wordChain: [],
  };

  await saveRoomState(room);
  await associateSocket(socketId, roomCode, playerId);

  return { room, player: hostPlayer };
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
  socketId: string
): Promise<{ room: RoomState; player: Player }> {
  const code = roomCode.trim().toUpperCase();
  const room = await getRoomState(code);

  if (!room) {
    throw new Error(`Room "${code}" not found.`);
  }

  const cleanName = playerName.trim() || "Player 2";

  // Check if player is re-joining
  const existingPlayer = room.players.find(
    (p) => p.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingPlayer) {
    existingPlayer.socketId = socketId;
    existingPlayer.connected = true;
    await saveRoomState(room);
    await associateSocket(socketId, code, existingPlayer.id);
    return { room, player: existingPlayer };
  }

  if (room.players.length >= 2) {
    throw new Error("This room is already full (2 players maximum).");
  }

  const newPlayer: Player = {
    id: randomUUID(),
    name: cleanName,
    socketId,
    score: 0,
    roundsWon: 0,
    connected: true,
  };

  room.players.push(newPlayer);
  await saveRoomState(room);
  await associateSocket(socketId, code, newPlayer.id);

  return { room, player: newPlayer };
}

export async function startMatch(
  roomCode: string,
  socketId: string,
  onTimeout: (room: RoomState) => void
): Promise<RoomState> {
  const code = roomCode.trim().toUpperCase();
  const room = await getRoomState(code);

  if (!room) {
    throw new Error(`Room "${code}" not found.`);
  }

  if (room.players.length < 2) {
    throw new Error("Waiting for a second player to join before starting!");
  }

  clearRoomTimer(code);
  await clearUsedWords(code);

  room.status = "active";
  room.currentRound = 1;
  room.players.forEach((p) => {
    p.score = 0;
    p.roundsWon = 0;
  });
  room.roundHistory = [];
  const firstPlayer = room.players[0];
  if (!firstPlayer) {
    throw new Error("No players in room.");
  }
  room.currentTurnPlayerId = firstPlayer.id;
  room.requiredLetter = null; // First player can pick any starting word
  room.lastWord = null;
  room.turnExpiresAt = Date.now() + room.turnDurationSeconds * 1000;

  await saveRoomState(room);
  scheduleTurnTimeout(code, room.turnDurationSeconds * 1000, onTimeout);

  return room;
}

export async function submitWord(
  roomCode: string,
  socketId: string,
  rawWord: string,
  onTimeout: (room: RoomState) => void
): Promise<{
  room: RoomState;
  acceptedWord: string;
  score: number;
  nextLetter: string;
  submittingPlayer: Player;
}> {
  const code = roomCode.trim().toUpperCase();
  const room = await getRoomState(code);

  if (!room) {
    throw new Error(`Room "${code}" not found.`);
  }

  if (room.status !== "active") {
    throw new Error("Game is not currently active.");
  }

  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) {
    throw new Error("You are not part of this room.");
  }

  if (room.currentTurnPlayerId !== player.id) {
    throw new Error("It's not your turn right now!");
  }

  // Allow 1.5s grace for network latency
  if (room.turnExpiresAt && Date.now() > room.turnExpiresAt + 1500) {
    throw new Error("Time expired before your submission reached the server!");
  }

  const usedWords = await getUsedWords(code);
  const validation = validateWord(rawWord, room.requiredLetter, usedWords);

  if (!validation.valid) {
    throw new Error(validation.error || "Invalid word.");
  }

  clearRoomTimer(code);

  const acceptedWord = validation.word!;
  const score = validation.score!;
  const nextLetter = validation.nextLetter!;

  await addUsedWord(code, acceptedWord);

  player.score += score;
  room.lastWord = acceptedWord;
  room.requiredLetter = nextLetter;
  room.wordChain.push({
    word: acceptedWord,
    playerId: player.id,
    playerName: player.name,
    score,
    timestamp: Date.now(),
  });

  // Switch turn to opponent
  const opponent = room.players.find((p) => p.id !== player.id)!;
  room.currentTurnPlayerId = opponent.id;
  room.turnExpiresAt = Date.now() + room.turnDurationSeconds * 1000;

  await saveRoomState(room);
  scheduleTurnTimeout(code, room.turnDurationSeconds * 1000, onTimeout);

  return {
    room,
    acceptedWord,
    score,
    nextLetter,
    submittingPlayer: player,
  };
}

export function scheduleTurnTimeout(
  roomCode: string,
  durationMs: number,
  onTimeout: (room: RoomState) => void
): void {
  clearRoomTimer(roomCode);
  const timer = setTimeout(async () => {
    try {
      const updatedRoom = await handleTurnTimeout(roomCode, onTimeout);
      if (updatedRoom) {
        onTimeout(updatedRoom);
      }
    } catch (err) {
      console.error(`Error handling timeout for room ${roomCode}:`, err);
    }
  }, durationMs);

  roomTimers.set(roomCode.toUpperCase(), timer);
}

export async function handleTurnTimeout(
  roomCode: string,
  onNextRoundTimeout?: (room: RoomState) => void
): Promise<RoomState | null> {
  const code = roomCode.trim().toUpperCase();
  const room = await getRoomState(code);

  if (!room || room.status !== "active") return null;

  clearRoomTimer(code);

  const timedOutPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const winningPlayer = room.players.find((p) => p.id !== room.currentTurnPlayerId);

  if (!timedOutPlayer || !winningPlayer) return null;

  winningPlayer.roundsWon += 1;

  room.roundHistory.push({
    roundNumber: room.currentRound,
    winnerId: winningPlayer.id,
    winnerName: winningPlayer.name,
    reason: `${timedOutPlayer.name} ran out of time!`,
  });

  // Check if match won
  if (winningPlayer.roundsWon >= room.targetWins) {
    room.status = "game_over";
    room.turnExpiresAt = null;
    room.currentTurnPlayerId = null;
    await saveRoomState(room);
    await persistMatchResult(room);
    return room;
  }

  // Advance to next round
  room.currentRound += 1;
  await clearUsedWords(code);
  room.wordChain = [];

  // Alternate starting player
  const startingIndex = (room.currentRound - 1) % room.players.length;
  const startingPlayer = room.players[startingIndex];
  if (!startingPlayer) return null;
  room.currentTurnPlayerId = startingPlayer.id;
  room.requiredLetter = null;
  room.lastWord = null;
  room.status = "active";
  room.turnExpiresAt = Date.now() + room.turnDurationSeconds * 1000;

  await saveRoomState(room);

  if (onNextRoundTimeout) {
    scheduleTurnTimeout(code, room.turnDurationSeconds * 1000, onNextRoundTimeout);
  }

  return room;
}

export async function restartMatch(
  roomCode: string,
  onTimeout: (room: RoomState) => void
): Promise<RoomState> {
  const code = roomCode.trim().toUpperCase();
  const room = await getRoomState(code);
  if (!room) throw new Error(`Room "${code}" not found.`);

  clearRoomTimer(code);
  await clearUsedWords(code);

  room.status = "active";
  room.currentRound = 1;
  room.players.forEach((p) => {
    p.score = 0;
    p.roundsWon = 0;
  });
  room.roundHistory = [];
  room.wordChain = [];
  const firstPlayer = room.players[0];
  if (!firstPlayer) throw new Error("No players in room.");
  room.currentTurnPlayerId = firstPlayer.id;
  room.requiredLetter = null;
  room.lastWord = null;
  room.turnExpiresAt = Date.now() + room.turnDurationSeconds * 1000;

  await saveRoomState(room);
  scheduleTurnTimeout(code, room.turnDurationSeconds * 1000, onTimeout);

  return room;
}

export async function handleDisconnect(socketId: string): Promise<RoomState | null> {
  const assoc = await getSocketAssociation(socketId);
  if (!assoc) return null;

  const room = await getRoomState(assoc.roomCode);
  if (!room) return null;

  const player = room.players.find((p) => p.id === assoc.playerId);
  if (player) {
    player.connected = false;
    await saveRoomState(room);
  }

  return room;
}
