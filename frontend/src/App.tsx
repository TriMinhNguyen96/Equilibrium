// ============================================================
// EQUILIBRIUM — App Root
// ============================================================

import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import { api } from "./services/api";
import type { Player } from "./services/api";

type Screen = "landing" | "game";

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

  const handleStart = async (name: string, ind: string, aiSlots: AISlot[]) => {
    setLoading(true);
    try {
      const result = await api.createGame({
        player_name: name,
        industry: ind,
        difficulty: "Normal",
        n_competitors: aiSlots.length,
        ai_slots: aiSlots,
      });
      setGameId(result.game_id);
      setPlayers(result.players);
      setPlayerName(name);
      setIndustry(ind);
      setScreen("game");
    } catch (err) {
      console.error("Failed to create game:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      {screen === "landing" ? (
        <LandingPage onStart={handleStart} loading={loading} />
      ) : (
        <Dashboard
          gameId={gameId}
          players={players}
          playerName={playerName}
          industry={industry}
        />
      )}
    </div>
  );
}