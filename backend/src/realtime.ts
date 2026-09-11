import type { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { config } from "./config.js";
import {
  createRoom,
  joinRoom,
  startMatch,
  submitWord,
  restartMatch,
  handleDisconnect,
} from "./lib/gameEngine.js";
import type { RoomState } from "./lib/types.js";

export function isAllowedOrigin(origin: string | undefined, hostHeader?: string): boolean {
  if (!origin) return true;
  if (origin === config.origin) return true;

  try {
    const url = new URL(origin);

    // Legitimate same-origin request forwarded by proxy (Origin host matches Host header)
    if (hostHeader && url.host.toLowerCase() === hostHeader.toLowerCase()) {
      return true;
    }

    // Localhost / Loopback
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }

    // Local network IPs for phones playing over Wi-Fi (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const hostname = url.hostname;
    if (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function attachRealtime(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: (requestOrigin, callback) => {
        callback(null, isAllowedOrigin(requestOrigin));
      },
      methods: ["GET", "POST"],
    },
    allowRequest: (request, callback) => {
      callback(null, isAllowedOrigin(request.headers.origin, request.headers.host));
    },
    maxHttpBufferSize: 16 * 1024,
  });

  io.on("connection", (socket: Socket) => {
    // Helper to broadcast room updates with onTimeout support
    const broadcastTimeout = (updatedRoom: RoomState) => {
      io.to(updatedRoom.roomCode).emit("room:updated", updatedRoom);
    };

    socket.on("room:create", async ({ playerName }: { playerName: string }) => {
      try {
        const { room, player } = await createRoom(playerName, socket.id);
        socket.join(room.roomCode);
        socket.emit("room:created", { room, player });
        io.to(room.roomCode).emit("room:updated", room);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create room";
        socket.emit("game:error", { message });
      }
    });

    socket.on(
      "room:join",
      async ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
        try {
          const { room, player } = await joinRoom(roomCode, playerName, socket.id);
          socket.join(room.roomCode);
          socket.emit("room:joined", { room, player });
          io.to(room.roomCode).emit("room:updated", room);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to join room";
          socket.emit("game:error", { message });
        }
      }
    );

    socket.on("game:start", async ({ roomCode }: { roomCode: string }) => {
      try {
        const room = await startMatch(roomCode, socket.id, broadcastTimeout);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to start match";
        socket.emit("game:error", { message });
      }
    });

    socket.on(
      "word:submit",
      async ({ roomCode, word }: { roomCode: string; word: string }) => {
        try {
          const result = await submitWord(roomCode, socket.id, word, broadcastTimeout);
          io.to(result.room.roomCode).emit("word:accepted", {
            word: result.acceptedWord,
            score: result.score,
            nextLetter: result.nextLetter,
            submittingPlayer: result.submittingPlayer,
          });
          io.to(result.room.roomCode).emit("room:updated", result.room);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Invalid word";
          socket.emit("word:rejected", { reason: message });
        }
      }
    );

    socket.on("game:rematch", async ({ roomCode }: { roomCode: string }) => {
      try {
        const room = await restartMatch(roomCode, broadcastTimeout);
        io.to(room.roomCode).emit("room:updated", room);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to restart match";
        socket.emit("game:error", { message });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const room = await handleDisconnect(socket.id);
        if (room) {
          io.to(room.roomCode).emit("room:updated", room);
        }
      } catch (err) {
        console.error("Error on socket disconnect:", err);
      }
    });
  });

  return io;
}
