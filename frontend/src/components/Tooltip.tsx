// ============================================================
// EQUILIBRIUM — Theory Tooltip Component
// Giải thích Game Theory terms khi hover
// ============================================================

import { useState } from "react";

// ============================================================
// DATA
// ============================================================

export const THEORY_TIPS: Record<string, { title: string; desc: string; example?: string }> = {
  "Nash Equilibrium": {
    title: "Nash Equilibrium (Cân bằng Nash)",
    desc: "Điểm mà không ai có lý do để thay đổi quyết định — khi họ đã biết đối thủ đang chọn gì.",
    example: "Nếu tất cả đều Defect → không ai muốn đổi sang Cooperate một mình."
  },
  "Defect": {
    title: "Defect (Phản bội)",
    desc: "Chiến lược ích kỷ — tối đa hóa lợi ích cá nhân bất kể đối thủ làm gì.",
    example: "Giảm giá mạnh để cướp thị phần của đối thủ."
  },
  "Cooperate": {
    title: "Cooperate (Hợp tác)",
    desc: "Chiến lược hợp tác — tin tưởng đối thủ sẽ làm điều tương tự để cả hai cùng có lợi.",
    example: "Giữ giá cao để cả thị trường cùng có lợi nhuận tốt."
  },
  "Prisoner's Dilemma": {
    title: "Prisoner's Dilemma (Thế lưỡng nan của tù nhân)",
    desc: "Khi hai bên đều rational nhưng kết quả cuối lại tệ hơn nếu họ hợp tác.",
    example: "Cả hai Defect → (40,40). Cả hai Cooperate → (70,70). Ai cũng muốn Cooperate nhưng không ai dám đi trước."
  },
  "Dominant Strategy": {
    title: "Dominant Strategy (Chiến lược thống trị)",
    desc: "Chiến lược luôn cho kết quả tốt hơn hoặc bằng — bất kể đối thủ chọn gì.",
    example: "Defect luôn tốt hơn Cooperate trong Prisoner's Dilemma."
  },
  "ESS": {
    title: "ESS — Evolutionarily Stable Strategy (Chiến lược ổn định tiến hóa)",
    desc: "Tỉ lệ chiến lược mà thị trường tự hội tụ về sau nhiều rounds.",
    example: "Nếu 100% Defect → không ai có thể xâm nhập bằng Cooperate."
  },
  "Market Share": {
    title: "Market Share (Thị phần)",
    desc: "Phần trăm thị trường mày đang nắm giữ. Tăng khi payoff cao hơn đối thủ.",
    example: "Defect khi đối thủ Cooperate → market share tăng mạnh ngắn hạn."
  },
  "Coalition": {
    title: "Coalition (Liên minh)",
    desc: "Nhóm players thỏa thuận với nhau để cùng đạt kết quả tốt hơn Nash Equilibrium.",
    example: "OPEC — các nước dầu mỏ đồng thuận giữ sản lượng thấp để giá cao."
  },
};

// ============================================================
// UI
// ============================================================

interface Props {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export default function Tooltip({ term, children, className = "" }: Props) {
  const [visible, setVisible] = useState(false);
  const tip = THEORY_TIPS[term];

  if (!tip) return <span className={className}>{children}</span>;

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="border-b border-dashed border-indigo-500 cursor-help text-indigo-300"
      >
        {children}
      </span>

      {visible && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72
                        bg-slate-800 border border-indigo-500/30 rounded-xl p-4
                        shadow-xl shadow-black/50">
          <div className="text-xs font-bold text-indigo-400 mb-1">{tip.title}</div>
          <div className="text-xs text-slate-300 mb-2">{tip.desc}</div>
          {tip.example && (
            <div className="text-xs text-slate-500 italic border-t border-slate-700 pt-2">
              Ví dụ: {tip.example}
            </div>
          )}
          <div className="absolute bottom-[-6px] left-4 w-3 h-3
                          bg-slate-800 border-r border-b border-indigo-500/30
                          rotate-45" />
        </div>
      )}
    </span>
  );
}