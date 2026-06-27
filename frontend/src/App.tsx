// ============================================================
// EQUILIBRIUM — App Root
// ============================================================

import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";

// ============================================================
// DATA
// ============================================================

type Screen = "landing" | "game";

// ============================================================
// UI
// ============================================================

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [playerName, setPlayerName] = useState("Player");
  const [industry, setIndustry] = useState("Technology");

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-mono">
      {screen === "landing" ? (
        <LandingPage
          onStart={(name, ind) => {
            setPlayerName(name);
            setIndustry(ind);
            setScreen("game");
          }}
        />
      ) : (
        <Dashboard playerName={playerName} industry={industry} />
      )}
    </div>
  );
}