// ============================================================
// EQUILIBRIUM — Spectator Mode
// Xem AI vs AI chạy real-time — Research tool
// ============================================================

import { useState, useRef } from "react";
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import type { RoundResult, Player } from "../services/api";
import { exportData } from "../services/api";

// ============================================================
// DATA
// ============================================================

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
const BASE_URL = "https://equilibrium-backend-p5st.onrender.com";

const ARCHETYPES = [
    { id: "Defector", label: "Defector", color: "#ef4444", bg: "bg-red-950 border-red-800" },
    { id: "Cooperator", label: "Cooperator", color: "#10b981", bg: "bg-emerald-950 border-emerald-800" },
    { id: "TitForTat", label: "Tit-for-Tat", color: "#0ea5e9", bg: "bg-blue-950 border-blue-800" },
    { id: "Random", label: "Random", color: "#f59e0b", bg: "bg-amber-950 border-amber-800" },
    { id: "Adaptive", label: "Adaptive", color: "#8b5cf6", bg: "bg-purple-950 border-purple-800" },
];

const AI_PRESETS = [
    { name: "AlphaCore", industry: "Finance", archetype: "Defector" },
    { name: "BetaTrust", industry: "F&B / Retail", archetype: "Cooperator" },
    { name: "GammaMind", industry: "Technology", archetype: "TitForTat" },
    { name: "DeltaX", industry: "Energy", archetype: "Random" },
    { name: "EpsilonAI", industry: "Healthcare", archetype: "Adaptive" },
];

interface Props {
    onBack: () => void;
}

// ============================================================
// UI
// ============================================================

export default function SpectatorMode({ onBack }: Props) {
    const [status, setStatus] = useState<"setup" | "running" | "completed">("setup");
    const [players, setPlayers] = useState<Player[]>([]);
    const [history, setHistory] = useState<RoundResult[]>([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [totalRounds, setTotalRounds] = useState(20);
    const [speed, setSpeed] = useState(800);
    const [nAgents, setNAgents] = useState(4);
    const [slots, setSlots] = useState(AI_PRESETS.slice(0, 4));
    const wsRef = useRef<WebSocket | null>(null);

    const updateSlotArchetype = (idx: number, archetype: string) => {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, archetype } : s));
    };

    const startSimulation = async () => {
        // Tạo spectate game
        const res = await fetch(`${BASE_URL}/game/spectate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                player_name: "spectator",
                industry: "Technology",
                n_competitors: nAgents,
                ai_slots: slots.slice(0, nAgents),
            }),
        });
        const data = await res.json();
        setPlayers(data.players);
        setStatus("running");

        // Connect WebSocket
        const ws = new WebSocket(`wss://equilibrium-backend-p5st.onrender.com/ws/spectate/${data.game_id}`);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ n_rounds: totalRounds, speed_ms: speed }));
        };

        ws.onmessage = (e) => {
            const result = JSON.parse(e.data);
            if (result.status === "completed") {
                setStatus("completed");
                return;
            }
            setPlayers(result.players);
            setCurrentRound(result.round_number);
            setHistory(prev => [...prev, result]);
        };
    };

    const stopSimulation = () => {
        wsRef.current?.close();
        setStatus("completed");
    };

    // Chart data
    const marketShareData = history.map(r => {
        const obj: Record<string, number | string> = { round: r.round_number };
        players.forEach(p => { obj[p.name] = r.market_shares[p.id] || 0; });
        return obj;
    });

    const payoffData = history.map(r => {
        const obj: Record<string, number | string> = { round: r.round_number };
        players.forEach(p => { obj[p.name] = r.payoffs[p.id] || 0; });
        return obj;
    });

    const nashCount = history.filter(r => r.is_nash).length;
    const nashPct = history.length > 0 ? Math.round(nashCount / history.length * 100) : 0;

    const pieData = players.map(p => ({ name: p.name, value: p.market_share }));

    // Strategy distribution
    const strategyDist = players.map(p => {
        const hist = p.strategy_history || [];
        const coop = hist.filter(s => s === "Cooperate").length;
        const defect = hist.filter(s => s === "Defect").length;
        return { name: p.name, Cooperate: coop, Defect: defect };
    });

    return (
        <div className="min-h-screen bg-[#0a0e1a] p-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button
                        onClick={onBack}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2 block"
                    >
                        ← Back
                    </button>
                    <div className="text-xs tracking-[0.3em] text-indigo-400 uppercase mb-1">
                        EQUILIBRIUM — SPECTATOR MODE
                    </div>
                    <h1 className="text-xl font-bold text-white">AI vs AI Simulation</h1>
                </div>
                <div className="flex items-center gap-4">
                    {status === "running" && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-widest">Round</div>
                                <div className="text-3xl font-bold text-indigo-400">
                                    {currentRound}/{totalRounds}
                                </div>
                            </div>
                            <button
                                onClick={stopSimulation}
                                className="bg-red-900 hover:bg-red-800 text-red-300 px-4 py-2 rounded-lg text-xs transition-colors"
                            >
                                Stop
                            </button>
                        </>
                    )}
                    {status === "completed" && (
                        <div className="text-emerald-400 text-sm font-bold">
                            ✅ Simulation Complete
                        </div>
                    )}
                </div>
            </div>

            {/* Setup screen */}
            {status === "setup" && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="text-xs tracking-widest text-indigo-400 uppercase mb-4">
                            Simulation Config
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">
                                    Số agents
                                </label>
                                <div className="flex gap-1">
                                    {[2, 3, 4, 5].map(n => (
                                        <button key={n} onClick={() => {
                                            setNAgents(n);
                                            setSlots(AI_PRESETS.slice(0, n));
                                        }}
                                            className={`flex-1 h-9 rounded-lg text-sm font-bold transition-colors
                                                ${nAgents === n ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">
                                    Số rounds
                                </label>
                                <div className="flex gap-1">
                                    {[10, 20, 50, 100].map(n => (
                                        <button key={n} onClick={() => setTotalRounds(n)}
                                            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors
                                                ${totalRounds === n ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-widest mb-2 block">
                                    Tốc độ
                                </label>
                                <div className="flex gap-1">
                                    {[{ label: "Fast", ms: 300 }, { label: "Med", ms: 800 }, { label: "Slow", ms: 2000 }].map(s => (
                                        <button key={s.ms} onClick={() => setSpeed(s.ms)}
                                            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-colors
                                                ${speed === s.ms ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agent slots */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="text-xs tracking-widest text-indigo-400 uppercase mb-4">
                            AI Agents
                        </div>
                        <div className="space-y-3">
                            {slots.slice(0, nAgents).map((slot, i) => {
                                const arch = ARCHETYPES.find(a => a.id === slot.archetype)!;
                                return (
                                    <div key={i} className={`border rounded-xl p-3 ${arch.bg}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-white">{slot.name}</span>
                                            <span className="text-xs font-bold" style={{ color: arch.color }}>
                                                {arch.label}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {ARCHETYPES.map(a => (
                                                <button key={a.id}
                                                    onClick={() => updateSlotArchetype(i, a.id)}
                                                    className={`text-xs px-2 py-1 rounded transition-colors
                                                        ${slot.archetype === a.id
                                                            ? "bg-slate-700 text-white border border-slate-500"
                                                            : "text-slate-500 bg-slate-800 hover:text-slate-300"}`}>
                                                    {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={startSimulation}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold
                                   py-4 rounded-xl transition-colors tracking-widest uppercase text-sm"
                    >
                        Start Simulation →
                    </button>
                </div>
            )}

            {/* Live / Completed view */}
            {(status === "running" || status === "completed") && (
                <div className="space-y-4">

                    {/* Stats bar */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Nash Equilibrium</div>
                            <div className="text-2xl font-bold text-indigo-400">{nashPct}%</div>
                            <div className="text-xs text-slate-600">{nashCount}/{history.length} rounds</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Rounds Run</div>
                            <div className="text-2xl font-bold text-emerald-400">{currentRound}</div>
                            <div className="text-xs text-slate-600">of {totalRounds} total</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Market Leader</div>
                            <div className="text-lg font-bold text-amber-400">
                                {players.length > 0
                                    ? players.reduce((a, b) => a.market_share > b.market_share ? a : b).name
                                    : "—"}
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Agents</div>
                            <div className="text-2xl font-bold text-slate-300">{players.length}</div>
                        </div>
                    </div>

                    {/* Export buttons */}
                    {status === "completed" && history.length > 0 && (
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => exportData.download(
                                    exportData.toCSV(history, players),
                                    `equilibrium_${Date.now()}.csv`,
                                    "text/csv"
                                )}
                                className="bg-emerald-900 hover:bg-emerald-800 text-emerald-300
                       px-4 py-2 rounded-lg text-xs transition-colors font-semibold"
                            >
                                ↓ Export CSV
                            </button>
                            <button
                                onClick={() => exportData.download(
                                    exportData.toJSON(history, players),
                                    `equilibrium_${Date.now()}.json`,
                                    "application/json"
                                )}
                                className="bg-indigo-900 hover:bg-indigo-800 text-indigo-300
                       px-4 py-2 rounded-lg text-xs transition-colors font-semibold"
                            >
                                ↓ Export JSON
                            </button>
                        </div>
                    )}

                    {/* Charts */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Market Share over time */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                                Market Share Over Time
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={marketShareData}>
                                    <XAxis dataKey="round" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }} />
                                    {players.map((p, i) => (
                                        <Area key={p.id} type="monotone" dataKey={p.name}
                                            stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1}
                                            strokeWidth={2} />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Payoff over time */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                                Payoff Per Round
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={payoffData}>
                                    <XAxis dataKey="round" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }} />
                                    {players.map((p, i) => (
                                        <Line key={p.id} type="monotone" dataKey={p.name}
                                            stroke={COLORS[i]} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Current Market Share Pie */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                                Current Market Share
                            </div>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="60%" height={160}>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65}>
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
                                            formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2">
                                    {players.map((p, i) => (
                                        <div key={p.id} className="flex items-center gap-2 text-xs">
                                            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                            <span className="text-slate-400 w-20">{p.name}</span>
                                            <span className="text-white font-mono">{p.market_share.toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Strategy Distribution */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                                Strategy Distribution
                            </div>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={strategyDist}>
                                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }} />
                                    <Bar dataKey="Cooperate" fill="#10b981" stackId="a" />
                                    <Bar dataKey="Defect" fill="#ef4444" stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}