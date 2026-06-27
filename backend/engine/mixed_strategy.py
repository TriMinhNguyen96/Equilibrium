# ============================================================
# EQUILIBRIUM — Mixed Strategy Nash Equilibrium Solver
# Giải Cân bằng Nash chiến lược hỗn hợp
# ============================================================

import numpy as np
from itertools import combinations

# ============================================================
# LOGIC
# ============================================================

class MixedStrategySolver:
    """
    Tìm Mixed Strategy Nash Equilibrium (Cân bằng Nash chiến lược hỗn hợp)
    cho game 2 người với n chiến lược mỗi người
    
    Dùng Indifference Principle (Nguyên tắc thờ ơ):
    Tại Nash Equilibrium, expected payoff của mọi chiến lược phải bằng nhau
    """

    def __init__(self, payoff_a: list, payoff_b: list, strategies: list):
        """
        payoff_a: ma trận lợi ích của Player A
        payoff_b: ma trận lợi ích của Player B  
        strategies: danh sách tên chiến lược
        """
        self.payoff_a = np.array(payoff_a, dtype=float)
        self.payoff_b = np.array(payoff_b, dtype=float)
        self.strategies = strategies
        self.n = len(strategies)

    def solve(self) -> dict:
        """
        Tìm Mixed Strategy Nash Equilibrium
        Trả về dict chứa xác suất tối ưu cho mỗi player
        """
        mix_a = self._find_mix(self.payoff_b.T)  # B thờ ơ với chiến lược của mình
        mix_b = self._find_mix(self.payoff_a)     # A thờ ơ với chiến lược của mình

        return {
            "player_a": dict(zip(self.strategies, mix_a)),
            "player_b": dict(zip(self.strategies, mix_b)),
        }

    def _find_mix(self, payoff_matrix: np.ndarray) -> np.ndarray:
        """
        Giải hệ phương trình để tìm xác suất mix tối ưu
        Dùng Indifference Principle: E(s1) = E(s2) = ... = E(sn)
        """
        n = self.n

        # Xây dựng hệ phương trình Ax = b
        # Mỗi hàng: E(strategy_i) - E(strategy_i+1) = 0
        A = np.zeros((n, n))
        b = np.zeros(n)

        # Indifference conditions: E(s_i) = E(s_{i+1})
        for i in range(n - 1):
            A[i] = payoff_matrix[i] - payoff_matrix[i + 1]

        # Probability sums to 1: p1 + p2 + ... + pn = 1
        A[n - 1] = np.ones(n)
        b[n - 1] = 1.0

        try:
            mix = np.linalg.solve(A, b)
            # Nếu có xác suất âm → không có Mixed Strategy NE thuần túy
            if np.any(mix < -1e-10):
                return np.ones(n) / n  # fallback: equal mix
            mix = np.clip(mix, 0, 1)  # làm tròn sai số nhỏ
            return mix
        except np.linalg.LinAlgError:
            return np.ones(n) / n  # fallback nếu không giải được

    def expected_payoff(self, mix_a: np.ndarray, mix_b: np.ndarray) -> tuple:
        """
        Tính Expected Payoff (Lợi ích kỳ vọng) tại điểm mix cho trước
        """
        ep_a = mix_a @ self.payoff_a @ mix_b
        ep_b = mix_a @ self.payoff_b @ mix_b
        return round(float(ep_a), 4), round(float(ep_b), 4)

# ============================================================
# UI / DISPLAY
# ============================================================

def print_mix_result(result: dict, ep: tuple, strategies: list):
    """In kết quả Mixed Strategy ra terminal"""
    print("\n🎲 MIXED STRATEGY NASH EQUILIBRIUM")
    print("   (Cân bằng Nash chiến lược hỗn hợp)\n")

    print("   Player A nên chọn:")
    for s, p in result["player_a"].items():
        bar = "█" * int(p * 20)
        print(f"   {s:12} {bar:20} {p*100:.1f}%")

    print("\n   Player B nên chọn:")
    for s, p in result["player_b"].items():
        bar = "█" * int(p * 20)
        print(f"   {s:12} {bar:20} {p*100:.1f}%")

    print(f"\n⚖️  Expected Payoff (Lợi ích kỳ vọng):")
    print(f"   Player A: {ep[0]}")
    print(f"   Player B: {ep[1]}")

def run_demo():
    """Demo với Rock Paper Scissors (Oẳn tù tì)"""

    strategies = ["Rock", "Paper", "Scissors"]

    # Payoff matrix cho A và B riêng biệt
    payoff_a = [
        [ 0, -1,  1],   # Rock
        [ 1,  0, -1],   # Paper
        [-1,  1,  0],   # Scissors
    ]
    payoff_b = [
        [ 0,  1, -1],   # Rock
        [-1,  0,  1],   # Paper
        [ 1, -1,  0],   # Scissors
    ]

    solver = MixedStrategySolver(payoff_a, payoff_b, strategies)
    result = solver.solve()

    # Tính expected payoff tại điểm cân bằng
    mix_a = np.array(list(result["player_a"].values()))
    mix_b = np.array(list(result["player_b"].values()))
    ep = solver.expected_payoff(mix_a, mix_b)

    print_mix_result(result, ep, strategies)

if __name__ == "__main__":
    run_demo()