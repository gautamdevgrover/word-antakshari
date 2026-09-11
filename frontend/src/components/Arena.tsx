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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isMyTurn = roomState.currentTurnPlayerId === currentPlayer.id;
  const opponent = roomState.players.find((p) => p.id !== currentPlayer.id);

  // Auto-scroll chat to bottom on new message or turn change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomState.wordChain.length, isMyTurn]);

  // Focus input when it becomes user's turn
  useEffect(() => {
    if (isMyTurn) {
      setWordInput("");
      onClearRejectedReason();
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

  const maxTime = roomState.turnDurationSeconds || 15;
  const timerPercent = Math.min(100, Math.max(0, (timeLeft / maxTime) * 100));

  // Determine required starting letter display
  const requiredLetter = roomState.requiredLetter
    ? roomState.requiredLetter.toUpperCase()
    : roomState.lastWord
    ? roomState.lastWord[roomState.lastWord.length - 1]?.toUpperCase() || ""
    : "";

  const inputPlaceholder = requiredLetter
    ? `Type a word start with ${requiredLetter}`
    : "Type any word to start...";

  // Star ratings for match rounds
  const totalStars = roomState.totalRounds || 3;
  const wonCount = currentPlayer.roundsWon || 0;

  return (
    <div className="flex h-dvh w-full flex-col bg-neutral-950 select-none overflow-hidden">
      {/* 1. TOP HEADER (Dark bar with circular timer, 3 stars, and score) */}
      <header className="relative bg-black px-4 py-2.5 text-white z-20 flex items-center justify-between shadow-md">
        {/* Left: Circular Countdown Timer */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <svg className="h-10 w-10 -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-200 ease-linear ${
                  timeLeft <= 4 ? "text-rose-500 animate-pulse" : "text-sky-400"
                }`}
                strokeDasharray={`${Math.round(timerPercent)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span
              className={`absolute font-mono text-xs font-black ${
                timeLeft <= 4 ? "text-rose-400" : "text-sky-300"
              }`}
            >
              {Math.round(timerPercent)}%
            </span>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider hidden sm:inline">
            Round {roomState.currentRound}/{roomState.totalRounds}
          </span>
        </div>

        {/* Center: Match Stars */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalStars }).map((_, i) => {
            const isWon = i < wonCount;
            return (
              <span
                key={i}
                className={`text-xl transition-transform ${
                  isWon
                    ? "text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    : "text-neutral-700 opacity-60"
                }`}
              >
                ★
              </span>
            );
          })}
        </div>

        {/* Right: Scores */}
        <div className="text-right">
          <div className="font-mono text-sm font-black text-amber-400">
            {currentPlayer.score} <span className="text-neutral-500 text-xs font-normal">pts</span>
          </div>
          <div className="text-[10px] font-semibold text-neutral-400 truncate max-w-[85px]">
            {opponent?.name || "Opponent"}: {opponent?.score || 0}
          </div>
        </div>

        {/* Thin Linear Progress Bar below header */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-neutral-900">
          <div
            className={`h-full transition-all duration-150 ease-linear ${
              timeLeft <= 4
                ? "bg-rose-500"
                : timeLeft <= 7
                ? "bg-amber-400"
                : "bg-amber-400"
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </header>

      {/* 2. CHAT STREAM (Honeycomb hexagon background) */}
      <main className="honeycomb-bg flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {roomState.wordChain.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center text-center py-16 opacity-80">
            <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-xs border border-neutral-200">
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Round {roomState.currentRound} Started!
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {isMyTurn ? "You lead this round! Send any valid word." : `Waiting for ${opponent?.name || "opponent"} to start.`}
              </p>
            </div>
          </div>
        ) : (
          roomState.wordChain.map((entry, index) => {
            const isMe = entry.playerId === currentPlayer.id;

            if (isMe) {
              // RIGHT BUBBLE: Blue speech bubble pointing to blue user avatar
              return (
                <div key={index} className="flex items-center justify-end gap-2.5">
                  <div className="flex flex-col items-end">
                    <div className="relative rounded-2xl bg-[#0284c7] px-4 py-2.5 text-base font-semibold text-white shadow-sm">
                      {entry.word}
                      {/* Triangle tail pointing right */}
                      <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-[#0284c7]" />
                    </div>
                    <span className="mt-0.5 text-[10px] font-bold text-neutral-500 mr-2">
                      +{entry.score} pts
                    </span>
                  </div>

                  {/* Player Avatar (Right) */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-sky-500 bg-sky-100 shadow-xs">
                    <svg className="h-6 w-6 text-sky-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>
              );
            } else {
              // LEFT BUBBLE: Green speech bubble pointing to green avatar
              return (
                <div key={index} className="flex items-center justify-start gap-2.5">
                  {/* Opponent Avatar (Left) */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-100 shadow-xs">
                    <svg className="h-6 w-6 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                  </div>

                  <div className="flex flex-col items-start">
                    <div className="relative rounded-2xl bg-[#059669] px-4 py-2.5 text-base font-semibold text-white shadow-sm">
                      {entry.word}
                      {/* Triangle tail pointing left */}
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-[#059669]" />
                    </div>
                    <span className="mt-0.5 text-[10px] font-bold text-neutral-500 ml-2">
                      +{entry.score} pts
                    </span>
                  </div>
                </div>
              );
            }
          })
        )}

        {/* Typing indicator when it's opponent's turn */}
        {!isMyTurn && (
          <div className="flex items-center gap-2.5 pt-1 animate-pulse">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-100 shadow-xs">
              <svg className="h-6 w-6 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
            <div className="relative rounded-2xl bg-[#059669]/90 px-4 py-3 text-white shadow-sm">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-bounce [animation-delay:0.4s]"></span>
              </span>
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-[#059669]/90" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* 3. BOTTOM INPUT BAR (Dark bar with serif letter, white input, and circular cyan send button) */}
      <footer className="relative bg-black px-3 py-2 sm:py-3 shadow-2xl border-t border-neutral-900 z-30">
        {/* Floating Rejected Toast */}
        {rejectedReason && (
          <div className="absolute -top-11 left-4 right-4 rounded-xl bg-rose-600 px-3 py-2 text-center text-xs font-bold text-white shadow-lg animate-shake">
            ⚠️ {rejectedReason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          {/* Starting Letter Badge on Left */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
            <span className="font-serif text-2xl font-black tracking-tight">
              {requiredLetter || "★"}
            </span>
          </div>

          {/* White Input Box - Configured to PREVENT AUTOCOMPLETE & SPELL SUGGESTIONS */}
          <input
            ref={inputRef}
            type="text"
            name="word_input_no_autofill"
            disabled={!isMyTurn}
            value={wordInput}
            onChange={(e) => {
              setWordInput(e.target.value.toLowerCase());
              if (rejectedReason) onClearRejectedReason();
            }}
            placeholder={isMyTurn ? inputPlaceholder : `${opponent?.name || "Opponent"} is typing...`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            className="flex-1 rounded-md bg-white px-3.5 py-2.5 text-base font-medium text-neutral-950 placeholder:text-neutral-400 focus:outline-none disabled:bg-neutral-200 disabled:text-neutral-500 shadow-inner"
          />

          {/* Send Button: Circular Blue/Cyan with Paper Airplane Icon */}
          <button
            type="submit"
            disabled={!isMyTurn || !wordInput.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0ea5e9] text-white shadow-md transition active:scale-90 disabled:opacity-40 hover:bg-[#0284c7]"
            aria-label="Send Word"
          >
            <svg
              className="h-5 w-5 transform translate-x-0.5 -rotate-45"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
