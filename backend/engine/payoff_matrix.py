# ============================================================
# EQUILIBRIUM — Payoff Matrix Engine
# Ma trận lợi ích — nền tảng của toàn bộ Game Theory engine
# ============================================================

import numpy as np
from typing import Tuple

# ============================================================
# DATA
# ============================================================

# Ma trận lợi ích mặc định — Prisoner's Dilemma
# (lợi ích player A, lợi ích player B)
# Hàng = Player A chọn, Cột = Player B chọn
DEFAULT_MATRIX = {
    "strategies": ["Cooperate", "Defect"],
    "payoffs": [
        [(70, 70), (20, 90)],   # A chọn Cooperate
        [(90, 20), (40, 40)],   # A chọn Defect
    ]
}

# ============================================================
# LOGIC
# ============================================================

class PayoffMatrix:
    """
    Ma trận lợi ích — đại diện cho một game 2 người
    Mỗi ô chứa (payoff_A, payoff_B)
    """

    def __init__(self, strategies: list, payoffs: list):
        self.strategies = strategies        # danh sách chiến lược
        self.payoffs = payoffs              # ma trận lợi ích
        self.n = len(strategies)            # số chiến lược

    def get_payoff(self, move_a: int, move_b: int) -> Tuple[int, int]:
        """Trả về (payoff_A, payoff_B) khi A chọn move_a, B chọn move_b"""
        return self.payoffs[move_a][move_b]

    def find_dominant_strategy(self, player: str) -> str | None:
        """
        Tìm Dominant Strategy (Chiến lược thống trị) của player A hoặc B
        Trả về tên chiến lược nếu tìm thấy, None nếu không có
        """
        player_idx = 0 if player == "A" else 1

        for i in range(self.n):
            is_dominant = True
            for j in range(self.n):
                if i == j:
                    continue
                if player_idx == 0:
                    payoff_i = [self.payoffs[i][k][0] for k in range(self.n)]
                    payoff_j = [self.payoffs[j][k][0] for k in range(self.n)]
                else:
                    payoff_i = [self.payoffs[k][i][1] for k in range(self.n)]
                    payoff_j = [self.payoffs[k][j][1] for k in range(self.n)]

                if not all(a >= b for a, b in zip(payoff_i, payoff_j)):
                    is_dominant = False
                    break
            if is_dominant:
                return self.strategies[i]
        return None
    
    def find_nash_equilibrium(self) -> list:
        """
        Tìm Nash Equilibrium (Cân bằng Nash) — pure strategy
        Trả về list các (strategy_A, strategy_B) là Nash Equilibrium
        """
        nash_points = []

        for i in range(self.n):
            for j in range(self.n):
                payoff_a, payoff_b = self.payoffs[i][j]

                # Kiểm tra A có muốn đổi không
                best_response_a = max(self.payoffs[k][j][0] for k in range(self.n))
                # Kiểm tra B có muốn đổi không
                best_response_b = max(self.payoffs[i][k][1] for k in range(self.n))

                if payoff_a == best_response_a and payoff_b == best_response_b:
                    nash_points.append((self.strategies[i], self.strategies[j]))

        return nash_points

# ============================================================
# UI / DISPLAY
# ============================================================

def print_matrix(matrix: PayoffMatrix):
    """In ma trận lợi ích ra terminal cho dễ đọc"""
    print("\n📊 PAYOFF MATRIX (Ma trận lợi ích)")
    print(f"{'':15}", end="")
    for s in matrix.strategies:
        print(f"{'B: ' + s:20}", end="")
    print()
    for i, s_a in enumerate(matrix.strategies):
        print(f"{'A: ' + s_a:15}", end="")
        for j in range(matrix.n):
            cell = str(matrix.payoffs[i][j])
            print(f"{cell:20}", end="")
        print()

def run_demo():
    """Demo chạy thử — xóa sau khi build xong UI"""
    matrix = PayoffMatrix(
        strategies=DEFAULT_MATRIX["strategies"],
        payoffs=DEFAULT_MATRIX["payoffs"]
    )

    print_matrix(matrix)

    dom_a = matrix.find_dominant_strategy("A")
    dom_b = matrix.find_dominant_strategy("B")
    print(f"\n🎯 Dominant Strategy của A: {dom_a}")
    print(f"🎯 Dominant Strategy của B: {dom_b}")

    nash = matrix.find_nash_equilibrium()
    print(f"\n⚖️  Nash Equilibrium: {nash}")

if __name__ == "__main__":
    run_demo()