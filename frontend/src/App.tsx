// ============================================================
// EQUILIBRIUM — App Root
// ============================================================

import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import SpectatorMode from "./components/SpectatorMode";
import RoomLobby from "./components/RoomLobby";
import TimeLimitPicker from "./components/TimeLimitPicker";
import RoundLimitPicker from "./components/RoundLimitPicker";
import { api } from "./services/api";
import type { Player } from "./services/api";

type Screen = "landing" | "time-picker-solo" | "round-picker-solo" | "time-picker-room" | "game" | "spectator" | "room";

interface AISlot {
  name: string;
  industry: string;
  archetype: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [gameId, setGameId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerName, setPlayerName] = useState("Player");
  const [industry, setIndustry] = useState("Technology");
  const [loading, setLoading] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [_roundLimit, setRoundLimit] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  // Pending solo game config (waiting for time limit selection)
  const [pendingSolo, setPendingSolo] = useState<{ name: string; ind: string; aiSlots: AISlot[] } | null>(null);

  // ── Solo game: go to time picker first ──
  const handleStartRequest = (name: string, ind: string, aiSlots: AISlot[]) => {
    setPendingSolo({ name, ind, aiSlots });
    setScreen("time-picker-solo");
  };

  const handleSoloTimeSelected = (seconds: number | null) => {
    if (!pendingSolo) return;
    setTimeLimit(seconds);
    setScreen("round-picker-solo");
  };

  const handleSoloRoundSelected = async (rounds: number | null) => {
    if (!pendingSolo) return;
    setRoundLimit(rounds);
    setRoomCode(null);
    setMyPlayerId(null);
    setLoading(true);
    try {
      const result = await api.createGame({
        player_name: pendingSolo.name,
        industry: pendingSolo.ind,
        difficulty: "Normal",
        n_competitors: pendingSolo.aiSlots.length,
        ai_slots: pendingSolo.aiSlots,
      });
      setGameId(result.game_id);
      setPlayers(result.players);
      setPlayerName(pendingSolo.name);
      setIndustry(pendingSolo.ind);
      setScreen("game");
    } catch (err) {
      console.error("Failed to create game:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Multiplayer game start (from RoomLobby) ──
  const handleRoomGameStart = (
    gId: string,
    ps: Player[],
    pName: string,
    ind: string,
    roomTimeLimit: number | null,
    rCode?: string,
    pId?: string
  ) => {
    setGameId(gId);
    setPlayers(ps);
    setPlayerName(pName);
    setIndustry(ind);
    setTimeLimit(roomTimeLimit);
    setRoomCode(rCode ?? null);
    setMyPlayerId(pId ?? null);
    setScreen("game");
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      {screen === "landing" && (
        <LandingPage
          onStart={handleStartRequest}
          onSpectate={() => setScreen("spectator")}
          onMultiplayer={() => setScreen("room")}
          loading={loading}
        />
      )}
      {screen === "time-picker-solo" && (
        <TimeLimitPicker
          onSelect={handleSoloTimeSelected}
          onBack={() => setScreen("landing")}
        />
      )}
      {screen === "round-picker-solo" && (
        <RoundLimitPicker
          onSelect={handleSoloRoundSelected}
          onBack={() => setScreen("time-picker-solo")}
        />
      )}
      {screen === "game" && (
        <Dashboard
          gameId={gameId}
          players={players}
          playerName={playerName}
          industry={industry}
          timeLimit={timeLimit}
          roomCode={roomCode}
          myPlayerId={myPlayerId}
        />
      )}
      {screen === "spectator" && (
        <SpectatorMode onBack={() => setScreen("landing")} />
      )}
      {screen === "room" && (
        <RoomLobby
          onBack={() => setScreen("landing")}
          onGameStart={handleRoomGameStart}
        />
      )}
    </div>
  );
}