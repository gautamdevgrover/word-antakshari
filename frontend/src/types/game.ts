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
  totalRounds: number;
  targetWins: number;
  currentTurnPlayerId: string | null;
  requiredLetter: string | null;
  lastWord: string | null;
  turnExpiresAt: number | null;
  turnDurationSeconds: number;
  roundHistory: RoundResult[];
  wordChain: WordEntry[];
}
