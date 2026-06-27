# ============================================================
# EQUILIBRIUM — N-Player Game Engine
# Trò chơi nhiều người — xử lý 3-5 players đồng thời
# ============================================================

from itertools import product
from typing import Any

# ============================================================
# DATA
# ============================================================

STRATEGIES = ["Cooperate", "Defect"]

# ============================================================
# LOGIC
# ============================================================

class NPlayerGame:
    """
    Engine xử lý game với N players (3-5 công ty)
    Mỗi player chọn chiến lược đồng thời
    Engine tính payoff và tìm Nash Equilibrium
    """

    def __init__(self, n_players: int, strategies: list, payoff_fn):
        """
        n_players : số lượng player (3-5)
        strategies: danh sách chiến lược có thể chọn
        payoff_fn : hàm tính payoff — nhận tuple chiến lược, trả về tuple payoff
        """
        self.n = n_players
        self.strategies = strategies
        self.payoff_fn = payoff_fn
        self.n_strategies = len(strategies)

        # Tính trước toàn bộ combinations và payoff
        self.all_outcomes = self._compute_all_outcomes()

    def _compute_all_outcomes(self) -> dict:
        """
        Tính toán tất cả combinations chiến lược và payoff tương ứng
        3 players × 2 strategies = 2³ = 8 combinations
        """
        outcomes = {}
        for combo in product(range(self.n_strategies), repeat=self.n):
            strategy_names = tuple(self.strategies[i] for i in combo)
            outcomes[strategy_names] = self.payoff_fn(strategy_names)
        return outcomes

    def find_nash_equilibria(self) -> list:
        """
        Tìm tất cả Pure Strategy Nash Equilibrium
        Với mỗi combination, check từng player:
        'Nếu giữ nguyên chiến lược của người khác,
         player này có muốn đổi không?'
        """
        nash_points = []

        for combo, payoffs in self.all_outcomes.items():
            is_nash = True

            for player_idx in range(self.n):
                current_payoff = payoffs[player_idx]

                # Thử đổi chiến lược của player này
                for alt_strategy in self.strategies:
                    if alt_strategy == combo[player_idx]:
                        continue  # bỏ qua chiến lược hiện tại

                    # Tạo combination mới với chiến lược thay thế
                    new_combo = list(combo)
                    new_combo[player_idx] = alt_strategy
                    new_payoff = self.all_outcomes[tuple(new_combo)][player_idx]

                    # Nếu đổi thì tốt hơn → không phải Nash Equilibrium
                    if new_payoff > current_payoff:
                        is_nash = False
                        break

                if not is_nash:
                    break

            if is_nash:
                nash_points.append({
                    "strategies": combo,
                    "payoffs": payoffs
                })

        return nash_points

    def find_coalitions(self) -> list:
        """
        Tìm các Coalition (Liên minh) tiềm năng —
        nhóm players có thể bắt tay nhau để cùng có lợi hơn
        so với Nash Equilibrium
        """
        nash = self.find_nash_equilibria()
        if not nash:
            return []

        # Lấy payoff tại Nash Equilibrium đầu tiên làm baseline
        nash_payoffs = nash[0]["payoffs"]
        coalitions = []

        # Thử tất cả combinations của outcomes
        for combo, payoffs in self.all_outcomes.items():
            # Tìm nhóm players được lợi hơn Nash
            benefiting = [
                i for i in range(self.n)
                if payoffs[i] > nash_payoffs[i]
            ]
            # Coalition hợp lệ khi có ít nhất 2 player cùng có lợi
            if len(benefiting) >= 2:
                coalitions.append({
                    "strategies": combo,
                    "payoffs": payoffs,
                    "coalition_members": benefiting,
                    "gain_vs_nash": tuple(
                        payoffs[i] - nash_payoffs[i]
                        for i in range(self.n)
                    )
                })

        return coalitions

# ============================================================
# CONTENT / DATA
# ============================================================

def market_payoff(strategies: tuple) -> tuple:
    """
    Hàm tính payoff cho thị trường N công ty
    Logic: ai Defect (giảm giá) thì cướp khách của người Cooperate
    Càng nhiều người Defect → lợi ích của Defect giảm dần
    """
    n = len(strategies)
    n_defectors = strategies.count("Defect")
    n_cooperators = n - n_defectors

    payoffs = []
    for s in strategies:
        if s == "Cooperate":
            if n_defectors == 0:
                # Tất cả hợp tác → thị trường ổn định
                payoffs.append(70)
            else:
                # Bị Defector cướp khách
                payoffs.append(max(0, 70 - n_defectors * 20))
        else:  # Defect
            if n_cooperators == 0:
                # Tất cả đều Defect → cạnh tranh giá khốc liệt
                payoffs.append(40)
            else:
                # Chia nhau thị phần của Cooperators
                base = 90
                share_penalty = (n_defectors - 1) * 15
                payoffs.append(max(40, base - share_penalty))

    return tuple(payoffs)

# ============================================================
# UI / DISPLAY
# ============================================================

def print_all_outcomes(game: NPlayerGame, n_players: int):
    """In tất cả outcomes ra terminal"""
    print(f"\n📊 TẤT CẢ OUTCOMES — {n_players} PLAYERS")
    print(f"{'Strategies':<45} {'Payoffs'}")
    print("─" * 65)
    for combo, payoffs in game.all_outcomes.items():
        strategies_str = ", ".join(
            f"P{i+1}:{s[:1]}" for i, s in enumerate(combo)
        )
        payoffs_str = str(payoffs)
        print(f"{strategies_str:<45} {payoffs_str}")

def print_nash(nash_points: list):
    """In Nash Equilibrium ra terminal"""
    print(f"\n⚖️  NASH EQUILIBRIUM (Cân bằng Nash)")
    if not nash_points:
        print("   Không tìm thấy Pure Strategy Nash Equilibrium")
        return
    for i, point in enumerate(nash_points):
        strategies_str = ", ".join(
            f"P{j+1}:{s}" for j, s in enumerate(point["strategies"])
        )
        print(f"   [{i+1}] {strategies_str}")
        print(f"       Payoffs: {point['payoffs']}")

def print_coalitions(coalitions: list):
    """In Coalition tiềm năng ra terminal"""
    print(f"\n🤝 COALITION OPPORTUNITIES (Cơ hội liên minh)")
    if not coalitions:
        print("   Không có Coalition nào có lợi hơn Nash Equilibrium")
        return
    for i, c in enumerate(coalitions[:3]):  # chỉ show top 3
        members = [f"P{m+1}" for m in c["coalition_members"]]
        strategies_str = ", ".join(
            f"P{j+1}:{s[:1]}" for j, s in enumerate(c["strategies"])
        )
        gains = [f"P{j+1}:+{g}" for j, g in enumerate(c["gain_vs_nash"]) if g > 0]
        print(f"   [{i+1}] Coalition: {', '.join(members)}")
        print(f"       Nếu tất cả chọn: {strategies_str}")
        print(f"       Gains vs Nash: {', '.join(gains)}")

def run_demo():
    n_players = 3
    game = NPlayerGame(n_players, STRATEGIES, market_payoff)

    print_all_outcomes(game, n_players)

    nash = game.find_nash_equilibria()
    print_nash(nash)

    coalitions = game.find_coalitions()
    print_coalitions(coalitions)

if __name__ == "__main__":
    run_demo()