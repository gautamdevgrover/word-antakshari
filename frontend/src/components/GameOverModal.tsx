"use client";

import type { Player, RoomState } from "../types/game";

interface GameOverModalProps {
  roomState: RoomState;
  currentPlayer: Player;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export function GameOverModal({
  roomState,
  currentPlayer,
  onRematch,
  onLeaveRoom,
}: GameOverModalProps) {
  const opponent = roomState.players.find((p) => p.id !== currentPlayer.id);

  let winnerPlayer: Player | null = null;
  if (currentPlayer.roundsWon > (opponent?.roundsWon || 0)) {
    winnerPlayer = currentPlayer;
  } else if ((opponent?.roundsWon || 0) > currentPlayer.roundsWon) {
    winnerPlayer = opponent || null;
  } else if (currentPlayer.score > (opponent?.score || 0)) {
    winnerPlayer = currentPlayer;
  } else if ((opponent?.score || 0) > currentPlayer.score) {
    winnerPlayer = opponent || null;
  }

  const isWinner = winnerPlayer?.id === currentPlayer.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border-2 border-emerald-900/20">
        {/* Celebration Banner */}
        <div className="text-5xl">{isWinner ? "🏆" : "👏"}</div>
        <h2 className="mt-3 text-2xl font-black text-emerald-950">
          {isWinner ? "Victory!" : `${winnerPlayer?.name || "Player"} Won!`}
        </h2>
        <p className="mt-1 text-sm text-emerald-950/70">
          {isWinner
            ? "Outstanding word knowledge! You took the match."
            : "Great battle! Next time is your turn to shine."}
        </p>

        {/* Score Comparison */}
        <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200">
          <div className="text-center">
            <span className="text-xs font-bold text-emerald-900/60 uppercase">
              {currentPlayer.name}
            </span>
            <p className="font-mono text-2xl font-black text-emerald-950">
              {currentPlayer.score} <span className="text-xs font-normal">pts</span>
            </p>
            <span className="text-xs font-semibold text-emerald-800">
              {currentPlayer.roundsWon} {currentPlayer.roundsWon === 1 ? "win" : "wins"}
            </span>
          </div>
          <div className="text-center border-l border-emerald-900/10">
            <span className="text-xs font-bold text-emerald-900/60 uppercase">
              {opponent?.name || "Opponent"}
            </span>
            <p className="font-mono text-2xl font-black text-emerald-950">
              {opponent?.score || 0} <span className="text-xs font-normal">pts</span>
            </p>
            <span className="text-xs font-semibold text-emerald-800">
              {opponent?.roundsWon || 0} {(opponent?.roundsWon || 0) === 1 ? "win" : "wins"}
            </span>
          </div>
        </div>

        {/* Round History List */}
        {roomState.roundHistory.length > 0 && (
          <div className="mb-5 text-left text-xs">
            <p className="mb-2 font-bold text-emerald-900/60 uppercase">Match Rounds</p>
            <div className="space-y-1.5 rounded-xl bg-gray-50 p-2.5 border border-gray-200">
              {roomState.roundHistory.map((rh, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Round {rh.roundNumber}</span>
                  <span className="text-emerald-800 font-medium">
                    Won by {rh.winnerName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onRematch}
            type="button"
            className="w-full rounded-2xl bg-emerald-800 py-3.5 text-base font-bold text-white shadow-md transition active:scale-98 hover:bg-emerald-900"
          >
            Play Rematch 🔄
          </button>
          <button
            onClick={onLeaveRoom}
            type="button"
            className="w-full rounded-xl py-2 text-xs font-semibold text-emerald-950/60 hover:text-emerald-950"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
