// ============================================================
// EQUILIBRIUM — Landing Page
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

// ============================================================
// UI
// ============================================================

interface Props {
  onStart: (name: string, industry: string) => void;
  loading?: boolean;
}

export default function LandingPage({ onStart, loading }: Props) {
  const [name, setName] = useState("Player");
  const [industry, setIndustry] = useState("Technology");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">

      <div className="text-center mb-12">
        <div className="text-xs tracking-[0.3em] text-indigo-400 mb-3 uppercase">
          Game Theory Strategy Game
        </div>
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
          EQUILIBRIUM
        </h1>
        <p className="text-slate-400 text-lg max-w-md">
          Thị trường không có kẻ tốt hay xấu.<br />
          Chỉ có chiến lược thắng và chiến lược thua.
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="text-xs tracking-widest text-slate-500 uppercase mb-2 block">
            Tên công ty
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3
                       text-white placeholder-slate-600 focus:outline-none
                       focus:border-indigo-500 transition-colors"
            placeholder="Nhập tên công ty..."
          />
        </div>

        <div>
          <label className="text-xs tracking-widest text-slate-500 uppercase mb-2 block">
            Ngành
          </label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3
                       text-white focus:outline-none focus:border-indigo-500
                       transition-colors cursor-pointer"
          >
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onStart(name || "Player", industry)}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900
                     disabled:text-indigo-600 text-white font-semibold
                     py-4 rounded-lg transition-colors tracking-widest uppercase text-sm"
        >
          {loading ? "Đang khởi tạo..." : "Bắt đầu →"}
        </button>
      </div>

      <div className="mt-16 text-xs text-slate-700 tracking-widest uppercase">
        Nash Equilibrium · Evolutionary Dynamics · Mechanism Design
      </div>

    </div>
  );
}