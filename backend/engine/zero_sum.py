# ============================================================
# EQUILIBRIUM — Zero-sum Game Engine
# Trò chơi tổng bằng không — Minimax solver
# ============================================================

import numpy as np
from typing import Tuple

# ============================================================
# LOGIC
# ============================================================

class ZeroSumGame:
    """
    Engine xử lý Zero-sum Game (Trò chơi tổng bằng không)
    Dùng Minimax Theorem để tìm chiến lược tối ưu
    
    Trong zero-sum game: payoff_A + payoff_B = constant
    → Chỉ cần lưu payoff của A, payoff của B = -payoff_A
    """

    def __init__(self, payoff_matrix: list, strategies_a: list, strategies_b: list):
        """
        payoff_matrix: ma trận lợi ích của Player A
                       payoff của B = âm của A (zero-sum)
        strategies_a : danh sách chiến lược của A
        strategies_b : danh sách chiến lược của B
        """
        self.matrix = np.array(payoff_matrix, dtype=float)
        self.strategies_a = strategies_a
        self.strategies_b = strategies_b
        self.n_a = len(strategies_a)
        self.n_b = len(strategies_b)

    def maximin(self) -> Tuple[int, float]:
        """
        Maximin strategy của Player A:
        Tìm chiến lược cho payoff nhỏ nhất cao nhất
        → Đảm bảo thua ít nhất trong trường hợp xấu nhất
        """
        # Với mỗi chiến lược của A, tìm payoff thấp nhất (worst case)
        worst_cases = np.min(self.matrix, axis=1)
        # Chọn chiến lược có worst case cao nhất
        best_idx = int(np.argmax(worst_cases))
        return best_idx, float(worst_cases[best_idx])

    def minimax(self) -> Tuple[int, float]:
        """
        Minimax strategy của Player B:
        Tìm chiến lược hạn chế A thắng nhiều nhất
        → B minimize payoff tốt nhất của A
        """
        # Với mỗi chiến lược của B, tìm payoff cao nhất của A (best case for A)
        best_cases_for_a = np.max(self.matrix, axis=0)
        # B chọn chiến lược minimize cái đó
        best_idx = int(np.argmin(best_cases_for_a))
        return best_idx, float(best_cases_for_a[best_idx])

    def find_saddle_point(self) -> dict | None:
        """
        Tìm Saddle Point (Điểm yên ngựa) — Pure Strategy Nash Equilibrium
        của zero-sum game.

        Saddle Point tồn tại khi: Maximin = Minimax
        Tức là có một ô vừa là min của hàng, vừa là max của cột
        """
        maximin_idx, maximin_val = self.maximin()
        minimax_idx, minimax_val = self.minimax()

        if abs(maximin_val - minimax_val) < 1e-9:
            return {
                "strategy_a": self.strategies_a[maximin_idx],
                "strategy_b": self.strategies_b[minimax_idx],
                "value": maximin_val,
                "idx_a": maximin_idx,
                "idx_b": minimax_idx
            }
        return None

    def solve_mixed(self) -> dict:
        """
        Giải Mixed Strategy Nash Equilibrium cho zero-sum game
        Dùng Linear Programming (Quy hoạch tuyến tính) qua numpy
        """
        # Thêm constant để đảm bảo tất cả payoff dương
        shift = abs(np.min(self.matrix)) + 1
        M = self.matrix + shift

        # Giải cho Player A: maximize game value
        # Dùng phương pháp inverse matrix
        try:
            n = self.n_a
            # Xây dựng hệ phương trình indifference cho B
            A = np.vstack([M.T, np.ones((1, n))])
            b = np.append(np.ones(self.n_b), 1.0)

            # Least squares solution
            mix_a, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
            mix_a = np.clip(mix_a, 0, None)
            if mix_a.sum() > 0:
                mix_a = mix_a / mix_a.sum()
            else:
                mix_a = np.ones(n) / n

            # Giải cho Player B tương tự
            m = self.n_b
            B = np.vstack([M, np.ones((1, m))])
            c = np.append(np.ones(self.n_a), 1.0)
            mix_b, _, _, _ = np.linalg.lstsq(B, c, rcond=None)
            mix_b = np.clip(mix_b, 0, None)
            if mix_b.sum() > 0:
                mix_b = mix_b / mix_b.sum()
            else:
                mix_b = np.ones(m) / m

            # Game value (trừ đi shift)
            game_value = float(mix_a @ self.matrix @ mix_b)

            return {
                "mix_a": dict(zip(self.strategies_a, mix_a)),
                "mix_b": dict(zip(self.strategies_b, mix_b)),
                "game_value": round(game_value, 4)
            }

        except Exception:
            return {
                "mix_a": dict(zip(self.strategies_a, np.ones(self.n_a) / self.n_a)),
                "mix_b": dict(zip(self.strategies_b, np.ones(self.n_b) / self.n_b)),
                "game_value": 0.0
            }

    def market_share_split(self, total_market: float, strategy_a: str, strategy_b: str) -> Tuple[float, float]:
        """
        Tính phân chia thị phần (market share) trong zero-sum context
        total_market: tổng thị phần (ví dụ 100%)
        """
        idx_a = self.strategies_a.index(strategy_a)
        idx_b = self.strategies_b.index(strategy_b)
        payoff_a = self.matrix[idx_a][idx_b]

        # Normalize payoff thành market share
        min_p = np.min(self.matrix)
        max_p = np.max(self.matrix)
        if max_p == min_p:
            share_a = total_market / 2
        else:
            share_a = ((payoff_a - min_p) / (max_p - min_p)) * total_market
        share_b = total_market - share_a

        return round(share_a, 2), round(share_b, 2)

# ============================================================
# CONTENT / DATA
# ============================================================

# Market share competition — zero-sum
# Hai công ty tranh nhau 100% thị phần
MARKET_STRATEGIES_A = ["Aggressive Pricing", "Premium Pricing", "Value Pricing"]
MARKET_STRATEGIES_B = ["Aggressive Pricing", "Premium Pricing", "Value Pricing"]

MARKET_PAYOFF = [
    # B: Aggressive  B: Premium  B: Value
    [  0,            30,         20],   # A: Aggressive
    [-30,             0,        -10],   # A: Premium
    [-20,            10,          0],   # A: Value
]

# ============================================================
# UI / DISPLAY
# ============================================================

def print_matrix(game: ZeroSumGame):
    """In payoff matrix ra terminal"""
    print("\n📊 ZERO-SUM PAYOFF MATRIX (Ma trận lợi ích tổng bằng không)")
    print(f"   Payoff của A | Payoff của B = âm của A\n")
    print(f"{'':22}", end="")
    for s in game.strategies_b:
        print(f"{'B:'+s:22}", end="")
    print()
    for i, s_a in enumerate(game.strategies_a):
        print(f"{'A:'+s_a:22}", end="")
        for j in range(game.n_b):
            val = game.matrix[i][j]
            cell = f"({val:+.0f}, {-val:+.0f})"
            print(f"{cell:22}", end="")
        print()

def print_solution(game: ZeroSumGame):
    """In kết quả Minimax solution"""
    print("\n🎯 MINIMAX SOLUTION")

    saddle = game.find_saddle_point()
    if saddle:
        print(f"\n   ✅ Saddle Point (Điểm yên ngựa) tìm thấy!")
        print(f"   A nên chọn: {saddle['strategy_a']}")
        print(f"   B nên chọn: {saddle['strategy_b']}")
        print(f"   Game value: {saddle['value']:+.1f} cho A")
    else:
        print(f"\n   ⚠️  Không có Saddle Point → dùng Mixed Strategy")
        mixed = game.solve_mixed()
        print(f"\n   A nên mix:")
        for s, p in mixed["mix_a"].items():
            bar = "█" * int(p * 20)
            print(f"   {s:20} {bar:20} {p*100:.1f}%")
        print(f"\n   B nên mix:")
        for s, p in mixed["mix_b"].items():
            bar = "█" * int(p * 20)
            print(f"   {s:20} {bar:20} {p*100:.1f}%")
        print(f"\n   Game value: {mixed['game_value']:+.4f} cho A")

def print_market_share(game: ZeroSumGame):
    """In market share split"""
    print(f"\n📈 MARKET SHARE SPLIT (Phân chia thị phần)")
    print(f"   Tổng thị trường = 100%\n")
    for s_a in game.strategies_a:
        for s_b in game.strategies_b:
            share_a, share_b = game.market_share_split(100, s_a, s_b)
            print(f"   A:{s_a:20} vs B:{s_b:20} → A:{share_a:5.1f}% | B:{share_b:5.1f}%")

def run_demo():
    game = ZeroSumGame(MARKET_PAYOFF, MARKET_STRATEGIES_A, MARKET_STRATEGIES_B)
    print_matrix(game)
    print_solution(game)
    print_market_share(game)

if __name__ == "__main__":
    run_demo()