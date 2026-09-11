export type RoomStatus = 'waiting' | 'starting' | 'active' | 'round_over' | 'game_over';

export interface Player {
  id: string;
  name: string;
  socketId: string;
  score: number;
  roundsWon: number;
  connected: boolean;
}

export interface WordEntry {
  word: string;
  playerId: string;
  playerName: string;
  score: number;
  timestamp: number;
}

export interface RoundResult {
  roundNumber: number;
  winnerId: string;
  winnerName: string;
  reason: string;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  currentRound: number;
  totalRounds: number; // default 3 (best of 3: first to 2 round wins)
  targetWins: number; // 2
  currentTurnPlayerId: string | null;
  requiredLetter: string | null;
  lastWord: string | null;
  turnExpiresAt: number | null; // epoch ms
  turnDurationSeconds: number; // default 15
  roundHistory: RoundResult[];
  wordChain: WordEntry[];
}
