// ============================================================
// RoundLimitPicker.tsx — Chọn giới hạn số round cho cả ván
// ============================================================

interface Props {
  onSelect: (rounds: number | null) => void;
  onBack: () => void;
}

const OPTIONS = [
  { label: "No limit", value: null },
  { label: "10 rounds", value: 10 },
  { label: "20 rounds", value: 20 },
  { label: "30 rounds", value: 30 },
];

export default function RoundLimitPicker({ onSelect, onBack }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-widest">ROUND LIMIT</h1>
          <p className="text-gray-500 text-sm mt-1">How many rounds should this match run?</p>
        </div>

        {OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.value)}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700
                       hover:border-indigo-500 text-white font-semibold rounded-xl
                       transition-colors text-sm tracking-wide"
          >
            {opt.label}
          </button>
        ))}

        <button onClick={onBack}
          className="w-full py-3 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}