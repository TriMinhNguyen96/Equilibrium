// ============================================================
// EQUILIBRIUM — Landing Page
// Game setup screen — choose industry, AI count, archetype
// ============================================================

import { useState } from "react";

// ============================================================
// DATA
// ============================================================

const INDUSTRIES = [
  "Technology", "Finance", "F&B / Retail", "Manufacturing",
  "Healthcare", "Real Estate", "Energy", "Logistics & Supply Chain",
  "Media & Entertainment", "Education & EdTech", "Agriculture & Food",
  "Telecommunications", "Automotive", "Pharmaceuticals", "Tourism & Hospitality"
];

const ARCHETYPES = [
  { id: "Defector", label: "Defector", desc: "Always betrays — pure self-interest", color: "text-red-400", bg: "bg-red-950 border-red-800" },
  { id: "Cooperator", label: "Cooperator", desc: "Always cooperates — absolute trust", color: "text-emerald-400", bg: "bg-emerald-950 border-emerald-800" },
  { id: "TitForTat", label: "Tit-for-Tat", desc: "Mirrors the opponent — eye for an eye", color: "text-blue-400", bg: "bg-blue-950 border-blue-800" },
  { id: "Random", label: "Random", desc: "Random 50/50 — unpredictable", color: "text-amber-400", bg: "bg-amber-950 border-amber-800" },
  { id: "Adaptive", label: "Adaptive", desc: "Learns from history — optimizes over time", color: "text-purple-400", bg: "bg-purple-950 border-purple-800" },
];

const AI_NAMES = ["AlphaCore", "BetaTrust", "GammaMind", "DeltaX", "EpsilonAI"];
const AI_INDUSTRIES = ["Finance", "F&B / Retail", "Technology", "Energy", "Healthcare"];

const DEFAULT_ARCHETYPES = ["Defector", "Cooperator", "TitForTat", "Random", "Adaptive"];

interface AISlot {
  name: string;
  industry: string;
  archetype: string;
}

interface Props {
  onStart: (name: string, industry: string, aiSlots: AISlot[]) => void;
  onSpectate: () => void;
  onMultiplayer: () => void;
  loading?: boolean;
}

// ============================================================
// UI
// ============================================================

export default function LandingPage({ onStart, onSpectate, onMultiplayer, loading }: Props) {
  const [name, setName] = useState("Player");
  const [industry, setIndustry] = useState("Technology");
  const [nCompetitors, setNCompetitors] = useState(3);
  const [aiSlots, setAiSlots] = useState<AISlot[]>(
    Array.from({ length: 5 }, (_, i) => ({
      name: AI_NAMES[i],
      industry: AI_INDUSTRIES[i],
      archetype: DEFAULT_ARCHETYPES[i],
    }))
  );

  const updateArchetype = (idx: number, archetype: string) => {
    setAiSlots(prev => prev.map((s, i) => i === idx ? { ...s, archetype } : s));
  };

  const activeSlots = aiSlots.slice(0, nCompetitors);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Title */}
      <div className="text-center mb-10">
        <div className="text-xs tracking-[0.3em] text-indigo-400 mb-3 uppercase">
          Game Theory Strategy Game
        </div>
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
          EQUILIBRIUM
        </h1>
        <p className="text-slate-400 text-lg max-w-md">
          The market has no good guys or bad guys.<br />
          Only winning strategies and losing strategies.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">

        {/* Player setup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs tracking-widest text-indigo-400 uppercase mb-4">
            Company info
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-slate-500 uppercase mb-2 block">
                Company name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3
                           text-white placeholder-slate-600 focus:outline-none
                           focus:border-indigo-500 transition-colors"
                placeholder="Enter company name..."
              />
            </div>
            <div>
              <label className="text-xs tracking-widest text-slate-500 uppercase mb-2 block">
                Industry
              </label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3
                           text-white focus:outline-none focus:border-indigo-500
                           transition-colors cursor-pointer"
              >
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AI Competitors setup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs tracking-widest text-indigo-400 uppercase">
              AI Competitors
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Companies:</span>
              <div className="flex gap-1">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setNCompetitors(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors
                      ${nCompetitors === n
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {activeSlots.map((slot, i) => {
              const archetype = ARCHETYPES.find(a => a.id === slot.archetype)!;
              return (
                <div key={i} className={`border rounded-xl p-4 transition-colors ${archetype.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-bold text-white">{slot.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{slot.industry}</span>
                    </div>
                    <span className={`text-xs font-bold ${archetype.color}`}>
                      {archetype.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{archetype.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {ARCHETYPES.map(a => (
                      <button
                        key={a.id}
                        onClick={() => updateArchetype(i, a.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium
                          ${slot.archetype === a.id
                            ? `${a.color} bg-slate-800 border border-current`
                            : "text-slate-500 bg-slate-800 hover:text-slate-300"
                          }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(name || "Player", industry, activeSlots)}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900
                     disabled:text-indigo-600 text-white font-semibold
                     py-4 rounded-xl transition-colors tracking-widest uppercase text-sm"
        >
          {loading ? "Initializing..." : "Start →"}
        </button>
        <button
          onClick={onMultiplayer}
          className="w-full bg-indigo-950 hover:bg-indigo-900 border border-indigo-700
                     text-indigo-300 font-semibold py-3 rounded-xl transition-colors
                     tracking-widest uppercase text-sm"
        >
          ⚔ Multiplayer — PvP Real-time
        </button>
        <button
          onClick={onSpectate}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold
             py-3 rounded-xl transition-colors tracking-widest uppercase text-sm"
        >
          👁 Spectator Mode — Watch AI vs AI
        </button>
      </div>

      <div className="mt-10 text-xs text-slate-700 tracking-widest uppercase">
        Nash Equilibrium · Evolutionary Dynamics · Mechanism Design
      </div>
    </div>
  );
}