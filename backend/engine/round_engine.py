# ============================================================
# EQUILIBRIUM — Round Engine
# Trọng tài của game — điều phối toàn bộ một round
# ============================================================

from dataclasses import dataclass, field
from typing import Any
import json
import time

from payoff_matrix import PayoffMatrix, DEFAULT_MATRIX
from multiplayer import NPlayerGame, market_payoff, STRATEGIES
from zero_sum import ZeroSumGame, MARKET_PAYOFF, MARKET_STRATEGIES_A

# ============================================================
# DATA
# ============================================================

@dataclass
class Player:
    """Đại diện cho một player trong game"""
    id: str
    name: str
    industry: str = "Technology"
    is_human: bool = True
    market_share: float = 0.0
    total_payoff: float = 0.0
    strategy_history: list = field(default_factory=list)

@dataclass
class RoundResult:
    """Kết quả của một round"""
    round_number: int
    decisions: dict          # {player_id: strategy}
    payoffs: dict            # {player_id: payoff}
    market_shares: dict      # {player_id: market_share %}
    nash_equilibria: list    # Nash Equilibrium của round này
    is_nash: bool            # Decisions có phải Nash Equilibrium không
    timestamp: float = field(default_factory=time.time)
    events: list = field(default_factory=list)  # Market events xảy ra

# ============================================================
# LOGIC
# ============================================================

class RoundEngine:
    """
    Trọng tài của EQUILIBRIUM
    Điều phối toàn bộ một round từ đầu đến cuối
    Kết nối tất cả Game Theory modules lại với nhau
    """

    def __init__(self, players: list[Player]):
        self.players = players
        self.n = len(players)
        self.round_number = 0
        self.history: list[RoundResult] = []

        # Khởi tạo market share đều nhau
        equal_share = round(100.0 / self.n, 2)
        for p in self.players:
            p.market_share = equal_share

    def run_round(self, decisions: dict) -> RoundResult:
        """
        Chạy một round hoàn chỉnh

        decisions: {player_id: strategy_name}
        Ví dụ: {"p1": "Cooperate", "p2": "Defect", "p3": "Cooperate"}
        """
        self.round_number += 1

        # STEP 1: COLLECT — Validate decisions
        decisions = self._validate_decisions(decisions)

        # STEP 2: CALCULATE — Tính payoffs
        payoffs = self._calculate_payoffs(decisions)

        # STEP 3: DETECT — Tìm Nash Equilibrium
        nash_equilibria = self._find_nash(decisions)
        is_nash = self._check_is_nash(decisions, nash_equilibria)

        # STEP 4: EVOLVE — Cập nhật market share
        market_shares = self._update_market_shares(payoffs)

        # STEP 5: LOG — Lưu lịch sử
        result = RoundResult(
            round_number=self.round_number,
            decisions=decisions,
            payoffs=payoffs,
            market_shares=market_shares,
            nash_equilibria=nash_equilibria,
            is_nash=is_nash,
        )
        self.history.append(result)

        # Cập nhật player stats
        for p in self.players:
            p.total_payoff += payoffs.get(p.id, 0)
            p.strategy_history.append(decisions.get(p.id, ""))
            p.market_share = market_shares.get(p.id, p.market_share)

        return result

    def _validate_decisions(self, decisions: dict) -> dict:
        """Đảm bảo tất cả players đều có decision"""
        for p in self.players:
            if p.id not in decisions:
                # Default: Cooperate nếu không có decision
                decisions[p.id] = "Cooperate"
        return decisions

    def _calculate_payoffs(self, decisions: dict) -> dict:
        """
        Tính payoffs cho tất cả players
        Dùng N-player market_payoff function
        """
        strategy_tuple = tuple(decisions[p.id] for p in self.players)
        payoff_tuple = market_payoff(strategy_tuple)
        return {p.id: payoff_tuple[i] for i, p in enumerate(self.players)}

    def _find_nash(self, decisions: dict) -> list:
        """Tìm Nash Equilibrium của round hiện tại"""
        game = NPlayerGame(self.n, STRATEGIES, market_payoff)
        return game.find_nash_equilibria()

    def _check_is_nash(self, decisions: dict, nash_equilibria: list) -> bool:
        """Kiểm tra decisions hiện tại có phải Nash Equilibrium không"""
        current = tuple(decisions[p.id] for p in self.players)
        for ne in nash_equilibria:
            if ne["strategies"] == current:
                return True
        return False

    def _update_market_shares(self, payoffs: dict) -> dict:
        """
        Cập nhật market share dựa trên payoffs
        Player có payoff cao hơn sẽ tăng market share
        """
        total_payoff = sum(payoffs.values())
        if total_payoff <= 0:
            # Giữ nguyên nếu tổng payoff = 0
            return {p.id: p.market_share for p in self.players}

        # Tính market share mới dựa trên relative payoff
        new_shares = {}
        for p in self.players:
            relative = payoffs[p.id] / total_payoff
            # Blend 70% relative payoff + 30% current share (smooth transition)
            new_share = 0.7 * (relative * 100) + 0.3 * p.market_share
            new_shares[p.id] = round(new_share, 2)

        # Normalize để tổng = 100%
        total = sum(new_shares.values())
        return {pid: round(s / total * 100, 2) for pid, s in new_shares.items()}

    def get_leaderboard(self) -> list:
        """Xếp hạng players theo market share hiện tại"""
        return sorted(self.players, key=lambda p: p.market_share, reverse=True)

    def save_state(self, filepath: str):
        """Lưu game state ra file JSON"""
        state = {
            "round_number": self.round_number,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "industry": p.industry,
                    "market_share": p.market_share,
                    "total_payoff": p.total_payoff,
                    "strategy_history": p.strategy_history,
                }
                for p in self.players
            ],
            "history": [
                {
                    "round_number": r.round_number,
                    "decisions": r.decisions,
                    "payoffs": r.payoffs,
                    "market_shares": r.market_shares,
                    "is_nash": r.is_nash,
                    "nash_equilibria": [
                        {"strategies": list(ne["strategies"]), "payoffs": list(ne["payoffs"])}
                        for ne in r.nash_equilibria
                    ],
                }
                for r in self.history
            ]
        }
        with open(filepath, "w") as f:
            json.dump(state, f, indent=2)

    def load_state(self, filepath: str):
        """Load game state từ file JSON"""
        with open(filepath, "r") as f:
            state = json.load(f)
        self.round_number = state["round_number"]
        for p_data in state["players"]:
            for p in self.players:
                if p.id == p_data["id"]:
                    p.market_share = p_data["market_share"]
                    p.total_payoff = p_data["total_payoff"]
                    p.strategy_history = p_data["strategy_history"]

# ============================================================
# UI / DISPLAY
# ============================================================

def print_round_result(result: RoundResult, players: list[Player]):
    """In kết quả một round ra terminal"""
    print(f"\n{'='*60}")
    print(f"  ROUND {result.round_number} RESULT")
    print(f"{'='*60}")

    print(f"\n📋 DECISIONS (Quyết định):")
    for p in players:
        decision = result.decisions.get(p.id, "?")
        symbol = "🤝" if decision == "Cooperate" else "⚔️"
        print(f"   {symbol} {p.name:20} → {decision}")

    print(f"\n💰 PAYOFFS (Lợi ích):")
    for p in players:
        payoff = result.payoffs.get(p.id, 0)
        bar = "█" * int(payoff / 5)
        print(f"   {p.name:20} {bar:20} {payoff}")

    print(f"\n📊 MARKET SHARE (Thị phần):")
    for p in players:
        share = result.market_shares.get(p.id, 0)
        bar = "█" * int(share / 5)
        print(f"   {p.name:20} {bar:20} {share:.1f}%")

    print(f"\n⚖️  NASH EQUILIBRIUM:")
    if result.is_nash:
        print(f"   ✅ Round này là Nash Equilibrium!")
    else:
        print(f"   ❌ Round này KHÔNG phải Nash Equilibrium")
        if result.nash_equilibria:
            ne = result.nash_equilibria[0]
            strategies_str = ", ".join(
                f"{players[i].name}:{s}"
                for i, s in enumerate(ne["strategies"])
            )
            print(f"   💡 Nash Equilibrium thật sự: {strategies_str}")

def print_leaderboard(engine: RoundEngine):
    """In bảng xếp hạng"""
    print(f"\n🏆 LEADERBOARD (Bảng xếp hạng) — Sau round {engine.round_number}")
    print(f"{'':4}{'Tên':20}{'Market Share':15}{'Total Payoff':15}{'Trend'}")
    print("─" * 60)
    for i, p in enumerate(engine.get_leaderboard()):
        trend = ""
        if len(p.strategy_history) >= 2:
            last = p.strategy_history[-1]
            prev = p.strategy_history[-2]
            trend = "📈" if last == "Cooperate" else "📉"
        print(f"{'#'+str(i+1):4}{p.name:20}{p.market_share:>10.1f}%   {p.total_payoff:>10.0f}     {trend}")

def run_demo():
    """Demo chạy 3 rounds với 3 players"""

    # Setup players
    players = [
        Player(id="p1", name="TechCorp",    industry="Technology"),
        Player(id="p2", name="FinanceHub",  industry="Finance"),
        Player(id="p3", name="RetailKing",  industry="F&B / Retail"),
    ]

    engine = RoundEngine(players)

    print("🎮 EQUILIBRIUM — Round Engine Demo")
    print(f"   {len(players)} players | Industries: {', '.join(p.industry for p in players)}")

    # Round 1 — Cả 3 Cooperate
    result1 = engine.run_round({
        "p1": "Cooperate",
        "p2": "Cooperate",
        "p3": "Cooperate",
    })
    print_round_result(result1, players)

    # Round 2 — P2 Defect
    result2 = engine.run_round({
        "p1": "Cooperate",
        "p2": "Defect",
        "p3": "Cooperate",
    })
    print_round_result(result2, players)

    # Round 3 — Tất cả Defect (Nash Equilibrium)
    result3 = engine.run_round({
        "p1": "Defect",
        "p2": "Defect",
        "p3": "Defect",
    })
    print_round_result(result3, players)

    # Leaderboard
    print_leaderboard(engine)

    # Save state
    engine.save_state("game_state.json")
    print(f"\n💾 Game state saved → game_state.json")

if __name__ == "__main__":
    run_demo()