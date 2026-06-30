// ============================================================
// EQUILIBRIUM — Dashboard
// BI Observer Screen — live data from FastAPI
// ============================================================

import { useState, useEffect, useRef } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import type { Player, RoundResult } from "../services/api";
import { GameWebSocket } from "../services/api";
import TheoryTip from "./Tooltip";

// ============================================================
// DATA
// ============================================================

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

interface Props {
    gameId: string;
    players: Player[];
    playerName: string;
    industry: string;
}

// ============================================================
// UI
// ============================================================

export default function Dashboard({ gameId, players: initialPlayers, playerName, industry }: Props) {
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [history, setHistory] = useState<RoundResult[]>([]);
    const [round, setRound] = useState(0);
    const [lastResult, setLastResult] = useState<RoundResult | null>(null);
    const [strategy, setStrategy] = useState("");
    const [thinking, setThinking] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [showReveal, setShowReveal] = useState(false);
    const wsRef = useRef<GameWebSocket | null>(null);

    const startCountdown = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setCountdown(60);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(countdownRef.current!);
                    setCountdown(null);
                    setStrategy(s => {
                        const finalStrategy = s.trim() || "Cooperate";
                        setThinking(true);
                        wsRef.current?.send(finalStrategy);
                        return "";
                    });
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        wsRef.current = new GameWebSocket(gameId);
        wsRef.current.connect((result) => {
            setLastResult(result);
            setPlayers(result.players);
            setRound(result.round_number);
            setHistory(prev => [...prev, result]);
            setThinking(false);
            setShowReveal(true);
        });
        return () => {
            wsRef.current?.disconnect();
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [gameId]);

    const handleSubmit = () => {
        if (!strategy.trim()) return;
        setThinking(true);
        wsRef.current?.send(strategy);
        setStrategy("");
    };

    // Chart data
    const pieData = players.map(p => ({ name: p.name, value: p.market_share }));
    const lineData = history.map(r => {
        const obj: Record<string, number | string> = { round: r.round_number };
        players.forEach(p => { obj[p.name] = r.payoffs[p.id] || 0; });
        return obj;
    });

    const humanPlayer = players.find(p => p.id === "human");
    const competitors = players.filter(p => p.id !== "human");

    return (
        <div className="min-h-screen bg-[#0a0e1a] p-6">

            {showReveal && lastResult && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in">
                    <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl p-8 text-center max-w-md animate-reveal-pop relative">
                        <button
                            onClick={() => {
                                setShowReveal(false);
                                startCountdown();
                            }}
                            className="absolute top-3 right-3 text-slate-500 hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-800 transition-colors"
                        >
                            ×
                        </button>
                        <div className="text-xs text-indigo-400 uppercase tracking-widest mb-2">
                            Round {lastResult.round_number} complete
                        </div>
                        <div className={`text-3xl font-bold mb-3 ${lastResult.is_nash ? "text-emerald-400" : "text-amber-400"}`}>
                            {lastResult.is_nash ? "✅ Nash Equilibrium!" : "Market shifted"}
                        </div>
                        <div className="text-slate-400 text-sm mb-1">Your payoff</div>
                        <div className="text-4xl font-bold text-white">
                            {lastResult.payoffs["human"] || 0}
                        </div>
                        <button
                            onClick={() => {
                                setShowReveal(false);
                                startCountdown();
                            }}
                            className="mt-5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-xs tracking-[0.3em] text-indigo-400 uppercase mb-1">EQUILIBRIUM</div>
                    <h1 className="text-xl font-bold text-white">{playerName} · {industry}</h1>
                </div>
                <div className="flex items-center gap-6">
                    {humanPlayer && (
                        <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase tracking-widest">Market Share</div>
                            <div className="text-2xl font-bold text-indigo-400">
                                {humanPlayer.market_share.toFixed(1)}%
                            </div>
                        </div>
                    )}
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Round</div>
                        <div className={`text-3xl font-bold text-indigo-400 ${round > 0 ? "animate-pulse-glow rounded" : ""}`}>
                            {round}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                {/* Market Share Pie */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">Market Share</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
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
                    <div className="space-y-1 mt-2">
                        {players.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                                    <span className="text-slate-400">{p.name}</span>
                                </div>
                                <span className="text-white font-mono">{p.market_share.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payoff History */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">Payoff History</div>
                    {lineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={lineData}>
                                <XAxis dataKey="round" stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
                                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }} />
                                {players.map((p, i) => (
                                    <Line key={p.id} type="monotone" dataKey={p.name}
                                        stroke={COLORS[i]} strokeWidth={2} dot={false} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-52 flex items-center justify-center text-slate-600 text-sm">
                            No data yet — play the first round
                        </div>
                    )}
                </div>

                {/* Competitor Behavior */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                        Competitor Behavior
                    </div>
                    <div className="space-y-4">
                        {competitors.map((c) => {
                            const cHistory = (c.strategy_history || []).slice(-5);
                            const defectCount = cHistory.filter(s => s === "Defect").length;
                            const defectPct = cHistory.length > 0
                                ? Math.round(defectCount / cHistory.length * 100) : 50;

                            return (
                                <div key={c.id}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{c.name}</span>
                                        <span className="text-slate-500">{c.industry}</span>
                                    </div>
                                    <div className="flex gap-1 mb-2">
                                        {cHistory.length > 0 ? cHistory.map((s, j) => (
                                            <div key={`${c.id}-${j}`}
                                                className={`flex-1 h-6 rounded text-xs flex items-center justify-center font-bold
            transition-all duration-300
            ${s === "Cooperate" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>
                                                {s === "Cooperate" ? "C" : "D"}
                                            </div>
                                        )) : (
                                            <div className="text-xs text-slate-600">No history yet</div>
                                        )}
                                    </div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <TheoryTip term="Dominant Strategy">Defect probability</TheoryTip>
                                        <span className="text-amber-400">{defectPct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full transition-all"
                                            style={{ width: `${defectPct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Market Summary */}
            {lastResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 animate-fade-in">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Market Summary</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <div className="text-xs text-slate-600 mb-1">
                                <TheoryTip term="Nash Equilibrium">Nash Equilibrium</TheoryTip>
                            </div>
                            <div className={`text-sm font-bold ${lastResult.is_nash ? "text-emerald-400" : "text-red-400"}`}>
                                {lastResult.is_nash ? "✅ Current round" : "❌ Not reached"}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-amber-400">
                                {Object.values(lastResult.decisions).map((d, i) => (
                                    <span key={i}>
                                        {i > 0 && " · "}
                                        <TheoryTip term={d}>{d}</TheoryTip>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Your Payoff</div>
                            <div className="text-sm font-bold text-indigo-400">
                                {lastResult.payoffs["human"] || 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Total Payoff</div>
                            <div className="text-sm font-bold text-slate-300">
                                {humanPlayer?.total_payoff || 0}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Your Stats Panel */}
            {humanPlayer && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                        Your Stats
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Total Payoff</div>
                            <div className="text-lg font-bold text-indigo-400">
                                {humanPlayer.total_payoff}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Trend</div>
                            <div className="text-lg font-bold">
                                {history.length >= 2 ? (
                                    (history[history.length - 1].payoffs["human"] || 0) >
                                    (history[history.length - 2].payoffs["human"] || 0)
                                        ? <span className="text-emerald-400">↑ Up</span>
                                        : (history[history.length - 1].payoffs["human"] || 0) < 
                                          (history[history.length - 2].payoffs["human"] || 0)
                                        ? <span className="text-red-400">↓ Down</span>
                                        : <span className="text-slate-400">→ Stable</span>
                                ) : (
                                    <span className="text-slate-600">—</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Rounds Played</div>
                            <div className="text-lg font-bold text-slate-300">
                                {history.length}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-600 mb-1">Nash Reached</div>
                            <div className="text-lg font-bold text-amber-400">
                                {history.length > 0
                                    ? `${Math.round(history.filter(r => r.is_nash).length / history.length * 100)}%`
                                    : "—"}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-600 mb-2">Strategy History (last 5 rounds)</div>
                        <div className="flex gap-1">
                            {(humanPlayer.strategy_history || []).slice(-5).length > 0 ? (
                                (humanPlayer.strategy_history || []).slice(-5).map((s, j) => (
                                    <div key={j}
                                        className={`flex-1 h-8 rounded text-xs flex items-center justify-center font-bold
                                        transition-all duration-300
                                        ${s === "Cooperate" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>
                                        {s === "Cooperate" ? "C" : "D"}
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-slate-600">No history yet</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Strategy Chat */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
                    Chief Strategy Advisor
                </div>
                <div className="bg-slate-950 rounded-lg p-3 mb-3 min-h-16 text-sm text-slate-400">
                    {thinking ? (
                        <span className="text-indigo-400 animate-pulse">Analyzing market...</span>
                    ) : lastResult ? (
                        <span>
                            Round {lastResult.round_number} complete.
                            {lastResult.is_nash
                                ? " ✅ This is Nash Equilibrium."
                                : " Market hasn't reached Nash Equilibrium."}
                            {" "}Your payoff: {lastResult.payoffs["human"] || 0}.
                            {" "}What's your move for next round?
                        </span>
                    ) : (
                        <span>Welcome to EQUILIBRIUM. Enter your strategy to start the first round.</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={strategy}
                        onChange={e => setStrategy(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                        placeholder='Enter your strategy (e.g. "Cooperate" or "Defect" or describe your intent...'
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3
                       text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500
                       transition-colors text-sm"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={thinking || !strategy.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800
                       disabled:text-slate-600 text-white px-6 py-3 rounded-lg
                       transition-colors text-sm font-semibold min-w-[100px]"
                    >
                        {countdown !== null
                            ? <span className={countdown <= 10 ? "text-red-300" : ""}>{countdown}s →</span>
                            : "Submit →"}
                    </button>
                </div>
                <div className="flex gap-2 mt-2">
                    {["Cooperate", "Defect", "Negotiate"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStrategy(s)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400
                         px-3 py-1.5 rounded transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}