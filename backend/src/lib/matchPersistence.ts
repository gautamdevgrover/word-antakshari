import { prisma } from "./services.js";
import type { RoomState } from "./types.js";

export async function persistMatchResult(room: RoomState): Promise<string | null> {
  try {
    if (room.players.length < 2) return null;

    const p1 = room.players[0];
    const p2 = room.players[1];
    if (!p1 || !p2) return null;

    let winnerName = "Tie";
    if (p1.roundsWon > p2.roundsWon) {
      winnerName = p1.name;
    } else if (p2.roundsWon > p1.roundsWon) {
      winnerName = p2.name;
    } else if (p1.score > p2.score) {
      winnerName = p1.name;
    } else if (p2.score > p1.score) {
      winnerName = p2.name;
    }

    const created = await prisma.match.create({
      data: {
        roomCode: room.roomCode,
        player1Name: p1.name,
        player2Name: p2.name,
        player1Score: p1.score,
        player2Score: p2.score,
        winnerName,
        roundsPlayed: room.roundHistory.length,
        totalWords: room.wordChain.length,
        rounds: {
          create: room.roundHistory.map((rh) => ({
            roundNumber: rh.roundNumber,
            winnerName: rh.winnerName,
            reason: rh.reason,
          })),
        },
      },
    });

    return created.id;
  } catch (error) {
    console.error("Failed to persist match result:", error);
    return null;
  }
}
