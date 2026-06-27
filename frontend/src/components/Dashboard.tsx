// ============================================================
// EQUILIBRIUM — Dashboard (BI Observer Screen)
// Màn hình quan sát thị trường — Business Intelligence style
// ============================================================

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ============================================================
// DATA
// ============================================================

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

const MOCK_COMPANIES = [
  { id: "p1", name: "Player",     industry: "Technology",  share: 33.3, payoff: 0, strategy: "-" },
  { id: "p2", name: "FinanceHub", industry: "Finance",     share: 33.3, payoff: 0, strategy: "-" },
  { id: "p3", name: "RetailKing", industry: "F&B / Retail",share: 33.3, payoff: 0, strategy: "-" },
];

const MOCK_HISTORY = [
  { round: 1, Player: 70, FinanceHub: 70, RetailKing: 70 },
  { round: 2, Player: 50, FinanceHub: 90, RetailKing: 50 },
  { round: 3, Player: 40, FinanceHub: 40, RetailKing: 40 },
];

interface Props {
  playerName: string;
  industry: string;
}

// ============================================================
// UI
// ============================================================

export default function Dashboard({ playerName, industry }: Props) {
  const [round, setRound] = useState(3);
  const [companies, setCompanies] = useState(MOCK_COMPANIES);

  const pieData = companies.map(c => ({ name: c.name, value: c.share }));

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-[0.3em] text-indigo-400 uppercase mb-1">
            EQUILIBRIUM
          </div>
          <h1 className="text-xl font-bold text-white">
            {playerName} · {industry}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-widest">Round</div>
          <div className="text-3xl font-bold text-indigo-400">{round}</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* Market Share — Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
            Market Share
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {companies.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-slate-400">{c.name}</span>
                </div>
                <span className="text-white font-mono">{c.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payoff History — Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
            Payoff History
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_HISTORY}>
              <XAxis dataKey="round" stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis stroke="#334155" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
              />
              {companies.map((c, i) => (
                <Line
                  key={c.id} type="monotone" dataKey={c.name}
                  stroke={COLORS[i]} strokeWidth={2} dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Competitor Behavior */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">
            Competitor Behavior
          </div>
          <div className="space-y-3">
            {companies.filter(c => c.id !== "p1").map((c, i) => (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{c.name}</span>
                  <span className="text-slate-500">{c.industry}</span>
                </div>
                <div className="flex gap-1">
                  {["C", "D", "C"].map((s, j) => (
                    <div
                      key={j}
                      className={`flex-1 h-6 rounded text-xs flex items-center justify-center font-bold
                        ${s === "C" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Risk Indicator */}
          <div className="mt-6">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
              Defect Probability
            </div>
            {companies.filter(c => c.id !== "p1").map((c, i) => (
              <div key={c.id} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{c.name}</span>
                  <span className="text-amber-400">67%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "67%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom — Market Summary */}
      <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
          Market Summary
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Nash Equilibrium", value: "Defect × 3", color: "text-red-400" },
            { label: "Dominant Strategy", value: "Defect", color: "text-amber-400" },
            { label: "Market Event", value: "None", color: "text-slate-400" },
            { label: "Coalition Opportunity", value: "P1 + P3", color: "text-emerald-400" },
          ].map(item => (
            <div key={item.label}>
              <div className="text-xs text-slate-600 mb-1">{item.label}</div>
              <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}