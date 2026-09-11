"use client";

import { useState, useEffect } from "react";
import type { Player, RoomState } from "../types/game";

interface LobbyProps {
  roomState: RoomState | null;
  currentPlayer: Player | null;
  isConnected: boolean;
  errorMessage: string | null;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function Lobby({
  roomState,
  currentPlayer,
  isConnected,
  errorMessage,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: LobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  // Load saved name from localStorage and read ?room= URL parameter
  useEffect(() => {
    const saved = localStorage.getItem("word_antakshari_name");
    if (saved) setPlayerName(saved);

    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) {
      setRoomCodeInput(code.toUpperCase());
      setMode("join");
    }
  }, []);

  const handleNameChange = (val: string) => {
    setPlayerName(val);
    localStorage.setItem("word_antakshari_name", val);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    onCreateRoom(playerName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCodeInput.trim()) return;
    onJoinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim());
  };

  const handleCopyLink = async () => {
    if (!roomState) return;
    const shareUrl = `${window.location.origin}/?room=${roomState.roomCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Word Antakshari",
          text: `Join my Word Antakshari game! Room code: ${roomState.roomCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard fallback
    }
  };

  // If in a room that is waiting to start
  if (roomState && roomState.status === "waiting") {
    const isHost = currentPlayer?.id === roomState.hostId;
    const hasTwoPlayers = roomState.players.length >= 2;
    const opponent = roomState.players.find((p) => p.id !== currentPlayer?.id);

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4 py-8">
        <header className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-800 uppercase">
            Word Antakshari • Room Lobby
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-emerald-950">Room Code</h1>
          <div className="mt-3 inline-flex items-center justify-center gap-1 rounded-2xl border-2 border-emerald-800/30 bg-white px-6 py-3 shadow-sm">
            <span className="font-mono text-3xl font-black tracking-wider text-emerald-900">
              {roomState.roomCode}
            </span>
          </div>

          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={handleCopyLink}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {copied ? "Link Copied!" : "Invite Sister / Share Link"}
            </button>
          </div>
        </header>

        {/* Players in Room */}
        <section className="my-auto space-y-4">
          <div className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold tracking-wider text-emerald-900/70 uppercase">
              Players (2 Max)
            </h2>
            <div className="mt-3 space-y-2.5">
              {/* Player 1 (Host) */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white">
                    P1
                  </span>
                  <div>
                    <span className="font-semibold text-emerald-950">
                      {roomState.players[0]?.name}
                    </span>
                    {roomState.players[0]?.id === currentPlayer?.id && (
                      <span className="ml-2 text-xs font-medium text-emerald-700">(You)</span>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Host
                </span>
              </div>

              {/* Player 2 (Challenger) */}
              {hasTwoPlayers && opponent ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                      P2
                    </span>
                    <div>
                      <span className="font-semibold text-emerald-950">{opponent.name}</span>
                      {opponent.id === currentPlayer?.id && (
                        <span className="ml-2 text-xs font-medium text-emerald-700">(You)</span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                    Ready
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-emerald-800/30 bg-emerald-50/40 px-3.5 py-3 text-emerald-900/60">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full border border-emerald-700/30 bg-white text-xs font-bold">
                      ...
                    </span>
                    <span className="text-sm font-medium">Waiting for player 2 to join...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            💡 <strong>Game rules</strong>: Best of 3 rounds. 15 seconds per turn. Each word must start with the last letter of the previous word. No repeats!
          </div>
        </section>

        {/* Footer Actions */}
        <footer className="space-y-3">
          {hasTwoPlayers ? (
            isHost ? (
              <button
                onClick={onStartGame}
                type="button"
                className="w-full rounded-2xl bg-emerald-800 py-4 text-center text-lg font-bold text-white shadow-md transition active:scale-98 hover:bg-emerald-900"
              >
                Start Game 🚀
              </button>
            ) : (
              <div className="rounded-xl bg-emerald-100 py-3 text-center text-sm font-semibold text-emerald-900">
                Waiting for host to start the game...
              </div>
            )
          ) : (
            <div className="rounded-xl bg-emerald-50 py-3 text-center text-xs font-semibold text-emerald-900/80">
              Share the room code or link above so your sister can join!
            </div>
          )}

          <button
            onClick={onLeaveRoom}
            type="button"
            className="w-full rounded-xl py-2.5 text-xs font-semibold text-emerald-950/60 hover:text-emerald-950"
          >
            ← Leave Room
          </button>
        </footer>
      </main>
    );
  }

  // Lobby Home Screen
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-4 py-8">
      {/* Header */}
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold tracking-widest text-emerald-900 uppercase">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
          2 Players • Online Multiplayer
        </div>
        <h1 className="mt-3 text-4xl font-black text-emerald-950 sm:text-5xl leading-tight">
          Word<br />Antakshari
        </h1>
        <p className="mt-2 text-sm text-emerald-950/80 leading-relaxed">
          The classic word chain game. Take turns finding a word that starts with the last letter of the previous word!
        </p>
      </header>

      {/* Main Form */}
      <div className="my-auto space-y-5">
        {errorMessage && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Player Name Input */}
        <div className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-sm">
          <label htmlFor="playerName" className="block text-xs font-bold text-emerald-900 uppercase">
            Your Name / Nickname
          </label>
          <input
            id="playerName"
            type="text"
            required
            maxLength={18}
            placeholder="e.g. Gautam or Di"
            value={playerName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-emerald-900/20 bg-emerald-50/30 px-3.5 py-3 text-base font-semibold text-emerald-950 placeholder:text-emerald-950/40 focus:border-emerald-700 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-950/5 p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-xl py-2.5 text-sm font-bold transition ${
              mode === "create"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-emerald-950/60 hover:text-emerald-950"
            }`}
          >
            Create Game
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-xl py-2.5 text-sm font-bold transition ${
              mode === "join"
                ? "bg-white text-emerald-950 shadow-sm"
                : "text-emerald-950/60 hover:text-emerald-950"
            }`}
          >
            Join Game
          </button>
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <button
              type="submit"
              disabled={!playerName.trim() || !isConnected}
              className="w-full rounded-2xl bg-emerald-800 py-4 text-center text-lg font-bold text-white shadow-md transition active:scale-98 disabled:opacity-50 hover:bg-emerald-900"
            >
              Create New Room 🎮
            </button>
            <p className="text-center text-xs text-emerald-900/60">
              Creates a private room and generates a code/link to share with your sister.
            </p>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-sm">
              <label htmlFor="roomCode" className="block text-xs font-bold text-emerald-900 uppercase">
                5-Letter Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                required
                maxLength={5}
                placeholder="e.g. TIGER"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="mt-2 w-full text-center tracking-widest font-mono rounded-xl border border-emerald-900/20 bg-emerald-50/30 px-3.5 py-3 text-2xl font-black text-emerald-950 placeholder:text-emerald-950/30 focus:border-emerald-700 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!playerName.trim() || roomCodeInput.length < 5 || !isConnected}
              className="w-full rounded-2xl bg-emerald-800 py-4 text-center text-lg font-bold text-white shadow-md transition active:scale-98 disabled:opacity-50 hover:bg-emerald-900"
            >
              Join Room →
            </button>
          </form>
        )}
      </div>

      {/* Example Chain Card */}
      <footer className="mt-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 text-center shadow-xs">
        <p className="text-xs text-emerald-950/60 font-medium">Example Chain:</p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-900">
          <span>Apple</span>
          <span className="text-emerald-500 font-bold">→</span>
          <span>Elephant</span>
          <span className="text-emerald-500 font-bold">→</span>
          <span>Tiger</span>
        </p>
      </footer>
    </main>
  );
}
