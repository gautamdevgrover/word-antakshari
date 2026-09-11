"use client";

import { useGameSocket } from "../hooks/useGameSocket";
import { Lobby } from "../components/Lobby";
import { Arena } from "../components/Arena";
import { GameOverModal } from "../components/GameOverModal";

export default function Home() {
  const {
    isConnected,
    roomState,
    currentPlayer,
    errorMessage,
    rejectedReason,
    createRoom,
    joinRoom,
    startGame,
    submitWord,
    requestRematch,
    leaveRoom,
    clearRejectedReason,
  } = useGameSocket();

  // If not in a room, or room is still in waiting state, show Lobby
  if (!roomState || roomState.status === "waiting" || !currentPlayer) {
    return (
      <Lobby
        roomState={roomState}
        currentPlayer={currentPlayer}
        isConnected={isConnected}
        errorMessage={errorMessage}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onStartGame={startGame}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // Active or Game Over match
  return (
    <>
      <Arena
        roomState={roomState}
        currentPlayer={currentPlayer}
        rejectedReason={rejectedReason}
        onSubmitWord={submitWord}
        onClearRejectedReason={clearRejectedReason}
      />

      {roomState.status === "game_over" && (
        <GameOverModal
          roomState={roomState}
          currentPlayer={currentPlayer}
          onRematch={requestRematch}
          onLeaveRoom={leaveRoom}
        />
      )}
    </>
  );
}
