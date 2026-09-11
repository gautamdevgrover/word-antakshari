"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, RoomState } from "../types/game";

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [lastAcceptedWord, setLastAcceptedWord] = useState<{
    word: string;
    score: number;
    nextLetter: string;
    playerName: string;
  } | null>(null);

  useEffect(() => {
    // Connect to current origin through Nginx
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setErrorMessage(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setErrorMessage("Could not connect to game server. Retrying...");
    });

    socket.on("room:created", ({ room, player }: { room: RoomState; player: Player }) => {
      setRoomState(room);
      setCurrentPlayer(player);
      setErrorMessage(null);
      setRejectedReason(null);
    });

    socket.on("room:joined", ({ room, player }: { room: RoomState; player: Player }) => {
      setRoomState(room);
      setCurrentPlayer(player);
      setErrorMessage(null);
      setRejectedReason(null);
    });

    socket.on("room:updated", (room: RoomState) => {
      setRoomState(room);
      // Keep current player updated with current score/state
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        const updated = room.players.find((p) => p.id === prev.id);
        return updated || prev;
      });
      setRejectedReason(null);
    });

    socket.on(
      "word:accepted",
      (data: {
        word: string;
        score: number;
        nextLetter: string;
        submittingPlayer: Player;
      }) => {
        setLastAcceptedWord({
          word: data.word,
          score: data.score,
          nextLetter: data.nextLetter,
          playerName: data.submittingPlayer.name,
        });
        setRejectedReason(null);
      }
    );

    socket.on("word:rejected", ({ reason }: { reason: string }) => {
      setRejectedReason(reason);
    });

    socket.on("game:error", ({ message }: { message: string }) => {
      setErrorMessage(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    if (!socketRef.current) return;
    setErrorMessage(null);
    setRejectedReason(null);
    socketRef.current.emit("room:create", { playerName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    if (!socketRef.current) return;
    setErrorMessage(null);
    setRejectedReason(null);
    socketRef.current.emit("room:join", { roomCode: roomCode.trim().toUpperCase(), playerName });
  }, []);

  const startGame = useCallback(() => {
    if (!socketRef.current || !roomState) return;
    setErrorMessage(null);
    socketRef.current.emit("game:start", { roomCode: roomState.roomCode });
  }, [roomState]);

  const submitWord = useCallback(
    (word: string) => {
      if (!socketRef.current || !roomState) return;
      setRejectedReason(null);
      socketRef.current.emit("word:submit", {
        roomCode: roomState.roomCode,
        word: word.trim(),
      });
    },
    [roomState]
  );

  const requestRematch = useCallback(() => {
    if (!socketRef.current || !roomState) return;
    setErrorMessage(null);
    setRejectedReason(null);
    socketRef.current.emit("game:rematch", { roomCode: roomState.roomCode });
  }, [roomState]);

  const leaveRoom = useCallback(() => {
    setRoomState(null);
    setCurrentPlayer(null);
    setErrorMessage(null);
    setRejectedReason(null);
    setLastAcceptedWord(null);
  }, []);

  const clearRejectedReason = useCallback(() => {
    setRejectedReason(null);
  }, []);

  return {
    isConnected,
    roomState,
    currentPlayer,
    errorMessage,
    rejectedReason,
    lastAcceptedWord,
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    requestRematch,
    leaveRoom,
    clearRejectedReason,
  };
}
