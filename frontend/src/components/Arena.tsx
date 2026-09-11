"use client";

import { useState, useEffect, useRef } from "react";
import type { Player, RoomState } from "../types/game";

interface ArenaProps {
  roomState: RoomState;
  currentPlayer: Player;
  rejectedReason: string | null;
  onSubmitWord: (word: string) => void;
  onClearRejectedReason: () => void;
}

export function Arena({
  roomState,
  currentPlayer,
  rejectedReason,
  onSubmitWord,
  onClearRejectedReason,
}: ArenaProps) {
  const [wordInput, setWordInput] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(roomState.turnDurationSeconds);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMyTurn = roomState.currentTurnPlayerId === currentPlayer.id;
  const opponent = roomState.players.find((p) => p.id !== currentPlayer.id);

  // Focus input when it becomes user's turn
  useEffect(() => {
    if (isMyTurn) {
      setWordInput("");
      onClearRejectedReason();
      // On mobile, slight delay ensures keyboard triggers smoothly
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, onClearRejectedReason]);

  // Real-time countdown timer sync
  useEffect(() => {
    if (!roomState.turnExpiresAt) return;

    const updateRemaining = () => {
      const remainingMs = roomState.turnExpiresAt! - Date.now();
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(seconds);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 100);
    return () => clearInterval(interval);
  }, [roomState.turnExpiresAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !wordInput.trim()) return;
    onSubmitWord(wordInput.trim());
  };

  // Compute timer bar percentage and styling
  const maxTime = roomState.turnDurationSeconds || 15;
  const timerPercent = Math.min(100, Math.max(0, (timeLeft / maxTime) * 100));

  let timerColor = "bg-emerald-500";
  let timerTextColor = "text-emerald-900";
  if (timeLeft <= 4) {
    timerColor = "bg-rose-500 animate-pulse";
    timerTextColor = "text-rose-600 animate-pulse";
  } else if (timeLeft <= 8) {
    timerColor = "bg-amber-500";
    timerTextColor = "text-amber-700";
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4 py-4 sm:py-6">
      {/* Top Header: Round badge and Score Cards */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-black tracking-wider text-emerald-950 uppercase">
            Round {roomState.currentRound} of {roomState.totalRounds}
          </span>
          <span className="text-xs font-bold text-emerald-950/60">
            Target: {roomState.targetWins} wins
          </span>
        </div>

        {/* Players Scoreboard */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Current Player Card */}
          <div
            className={`rounded-2xl p-3 border transition ${
              isMyTurn
                ? "bg-emerald-50 border-emerald-500 shadow-sm"
                : "bg-white border-emerald-900/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900/70 truncate max-w-[90px]">
                {currentPlayer.name} (You)
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: currentPlayer.roundsWon }).map((_, i) => (
                  <span key={i} className="text-amber-500 text-xs">⭐</span>
                ))}
              </div>
            </div>
            <p className="mt-1 font-mono text-2xl font-black text-emerald-950">
              {currentPlayer.score} <span className="text-xs font-normal text-emerald-800">pts</span>
            </p>
          </div>

          {/* Opponent Card */}
          <div
            className={`rounded-2xl p-3 border transition ${
              !isMyTurn
                ? "bg-amber-50/70 border-amber-400 shadow-sm"
                : "bg-white border-emerald-900/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900/70 truncate max-w-[90px]">
                {opponent?.name || "Opponent"}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: opponent?.roundsWon || 0 }).map((_, i) => (
                  <span key={i} className="text-amber-500 text-xs">⭐</span>
                ))}
              </div>
            </div>
            <p className="mt-1 font-mono text-2xl font-black text-emerald-950">
              {opponent?.score || 0} <span className="text-xs font-normal text-emerald-800">pts</span>
            </p>
          </div>
        </div>

        {/* Countdown Timer Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-950/60 uppercase tracking-wider">Turn Timer</span>
            <span className={`font-mono text-sm font-black ${timerTextColor}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-900/15">
            <div
              className={`h-full transition-all duration-200 ease-linear ${timerColor}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Center Arena Card */}
      <section className="my-auto space-y-4 py-2">
        <div
          className={`rounded-3xl border-2 p-5 text-center shadow-sm transition ${
            isMyTurn
              ? "bg-white border-emerald-600 ring-4 ring-emerald-500/10"
              : "bg-white/80 border-emerald-900/10"
          }`}
        >
          {isMyTurn ? (
            <div className="space-y-3">
              <span className="inline-block rounded-full bg-emerald-700 px-3 py-1 text-xs font-extrabold tracking-widest text-white uppercase animate-pulse">
                Your Turn!
              </span>

              {roomState.requiredLetter ? (
                <div>
                  <p className="text-xs font-bold text-emerald-900/60 uppercase">
                    Word must begin with
                  </p>
                  <div className="my-2 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-900 font-mono text-5xl font-black text-white shadow-md">
                    {roomState.requiredLetter.toUpperCase()}
                  </div>
                  {roomState.lastWord && (
                    <p className="text-xs text-emerald-950/70">
                      Previous: <span className="font-semibold text-emerald-950">{roomState.lastWord}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-3">
                  <p className="text-base font-bold text-emerald-950">Lead Round {roomState.currentRound}!</p>
                  <p className="mt-1 text-xs text-emerald-900/70">
                    Submit ANY valid English word to kick off the chain.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping"></span>
                {opponent?.name || "Opponent"} is thinking...
              </div>

              {roomState.requiredLetter ? (
                <div>
                  <p className="text-xs font-bold text-emerald-900/60 uppercase">
                    Must begin with
                  </p>
                  <div className="my-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 font-mono text-3xl font-black text-amber-900 border border-amber-300">
                    {roomState.requiredLetter.toUpperCase()}
                  </div>
                  {roomState.lastWord && (
                    <p className="text-xs text-emerald-950/70">
                      Previous: <span className="font-semibold text-emerald-950">{roomState.lastWord}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-950/70 py-2">
                  Waiting for {opponent?.name || "opponent"} to pick the opening word.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Word Input Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              disabled={!isMyTurn}
              value={wordInput}
              onChange={(e) => {
                setWordInput(e.target.value.toUpperCase());
                if (rejectedReason) onClearRejectedReason();
              }}
              placeholder={isMyTurn ? "Type your word..." : "Waiting for turn..."}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              className="flex-1 rounded-2xl border-2 border-emerald-900/20 bg-white px-4 py-3.5 text-lg font-bold tracking-wider text-emerald-950 placeholder:text-emerald-950/30 focus:border-emerald-700 focus:outline-none disabled:opacity-50 disabled:bg-emerald-50/50"
            />
            <button
              type="submit"
              disabled={!isMyTurn || !wordInput.trim()}
              className="rounded-2xl bg-emerald-800 px-6 py-3.5 text-base font-black tracking-wide text-white shadow-md transition active:scale-95 disabled:opacity-40 hover:bg-emerald-900"
            >
              SEND
            </button>
          </div>

          {/* Validation Feedback Bubble */}
          {rejectedReason && (
            <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-center text-xs font-bold text-rose-700 border border-rose-200 animate-shake">
              ⚠️ {rejectedReason}
            </div>
          )}
        </form>
      </section>

      {/* Word Chain History Drawer */}
      <footer className="space-y-2">
        <p className="text-xs font-bold tracking-wider text-emerald-900/60 uppercase">
          Word Chain ({roomState.wordChain.length})
        </p>
        <div className="max-h-36 overflow-y-auto rounded-2xl border border-emerald-900/10 bg-white/70 p-3 space-y-1.5 shadow-xs">
          {roomState.wordChain.length === 0 ? (
            <p className="text-center text-xs text-emerald-950/40 py-2">
              No words submitted yet in this round.
            </p>
          ) : (
            [...roomState.wordChain].reverse().map((entry, index) => {
              const isMine = entry.playerId === currentPlayer.id;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                    isMine ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"
                  }`}
                >
                  <span className="font-mono font-bold tracking-wider uppercase">
                    {entry.word}
                  </span>
                  <span className="font-medium text-emerald-800/80">
                    +{entry.score} pts • {entry.playerName}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </footer>
    </main>
  );
}
