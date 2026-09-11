import { redis } from "./services.js";
import type { RoomState } from "./types.js";

const ROOM_TTL_SECONDS = 7200; // 2 hours

function roomKey(roomCode: string): string {
  return `room:${roomCode.toUpperCase()}`;
}

function wordsKey(roomCode: string): string {
  return `room:${roomCode.toUpperCase()}:words`;
}

function socketKey(socketId: string): string {
  return `socket:${socketId}`;
}

export async function saveRoomState(room: RoomState): Promise<void> {
  const key = roomKey(room.roomCode);
  await redis.set(key, JSON.stringify(room), { EX: ROOM_TTL_SECONDS });
}

export async function getRoomState(roomCode: string): Promise<RoomState | null> {
  const key = roomKey(roomCode);
  const data = await redis.get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as RoomState;
  } catch {
    return null;
  }
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await Promise.all([
    redis.del(roomKey(roomCode)),
    redis.del(wordsKey(roomCode)),
  ]);
}

export async function addUsedWord(roomCode: string, word: string): Promise<void> {
  const key = wordsKey(roomCode);
  await redis.sAdd(key, word.toLowerCase());
  await redis.expire(key, ROOM_TTL_SECONDS);
}

export async function getUsedWords(roomCode: string): Promise<string[]> {
  const key = wordsKey(roomCode);
  return await redis.sMembers(key);
}

export async function clearUsedWords(roomCode: string): Promise<void> {
  await redis.del(wordsKey(roomCode));
}

export async function associateSocket(
  socketId: string,
  roomCode: string,
  playerId: string
): Promise<void> {
  const payload = JSON.stringify({ roomCode: roomCode.toUpperCase(), playerId });
  await redis.set(socketKey(socketId), payload, { EX: ROOM_TTL_SECONDS });
}

export async function getSocketAssociation(
  socketId: string
): Promise<{ roomCode: string; playerId: string } | null> {
  const data = await redis.get(socketKey(socketId));
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function removeSocketAssociation(socketId: string): Promise<void> {
  await redis.del(socketKey(socketId));
}
