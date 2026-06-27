# ============================================================
# EQUILIBRIUM — AI Agents
# Các archetype AI với chiến lược khác nhau
# ============================================================

import random
from dataclasses import dataclass, field

# ============================================================
# DATA
# ============================================================

ARCHETYPES = ["Cooperator", "Defector", "TitForTat", "Random", "Adaptive"]

# ============================================================
# LOGIC
# ============================================================

@dataclass
class Agent:
    """
    Đại diện cho một AI agent trong thị trường
    Mỗi agent có một archetype quyết định cách chọn chiến lược
    """
    id: str
    name: str
    archetype: str
    market_share: float = 0.0
    total_payoff: float = 0.0
    history: list = field(default_factory=list)  # lịch sử chiến lược đã chọn
    opponent_history: list = field(default_factory=list)  # lịch sử của đối thủ

    def choose_strategy(self) -> str:
        """
        Chọn chiến lược dựa trên archetype
        """
        if self.archetype == "Cooperator":
            return self._cooperator()
        elif self.archetype == "Defector":
            return self._defector()
        elif self.archetype == "TitForTat":
            return self._tit_for_tat()
        elif self.archetype == "Random":
            return self._random()
        elif self.archetype == "Adaptive":
            return self._adaptive()
        return "Cooperate"

    def update(self, own_strategy: str, opponent_strategy: str, payoff: float):
        """Cập nhật lịch sử sau mỗi round"""
        self.history.append(own_strategy)
        self.opponent_history.append(opponent_strategy)
        self.total_payoff += payoff

    # ── Archetype implementations ──────────────────────────

    def _cooperator(self) -> str:
        """Luôn hợp tác — tin tưởng tuyệt đối"""
        return "Cooperate"

    def _defector(self) -> str:
        """Luôn phản bội — ích kỷ tuyệt đối"""
        return "Defect"

    def _tit_for_tat(self) -> str:
        """
        Tit-for-Tat (Ăn miếng trả miếng):
        - Round đầu: Cooperate
        - Các round sau: làm gương đối thủ round trước
        """
        if not self.opponent_history:
            return "Cooperate"
        return self.opponent_history[-1]

    def _random(self) -> str:
        """Random 50/50 — không đoán được"""
        return random.choice(["Cooperate", "Defect"])

    def _adaptive(self) -> str:
        """
        Adaptive (Thích nghi):
        - Tính average payoff của Cooperate vs Defect trong lịch sử
        - Chọn cái nào cho payoff trung bình cao hơn
        - Nếu chưa có đủ data → Cooperate
        """
        if len(self.history) < 4:
            return "Cooperate"

        # Tính average payoff theo từng chiến lược
        coop_rounds = [i for i, s in enumerate(self.history) if s == "Cooperate"]
        defect_rounds = [i for i, s in enumerate(self.history) if s == "Defect"]

        # Dùng opponent history để estimate payoff
        coop_score = sum(
            70 if self.opponent_history[i] == "Cooperate" else 20
            for i in coop_rounds
        ) / max(len(coop_rounds), 1)

        defect_score = sum(
            90 if self.opponent_history[i] == "Cooperate" else 40
            for i in defect_rounds
        ) / max(len(defect_rounds), 1)

        return "Cooperate" if coop_score >= defect_score else "Defect"