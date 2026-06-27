# ============================================================
# EQUILIBRIUM — AI vs AI Simulation
# Kết hợp Round Engine + Evolution Engine
# Difficulty scaling + Market share tracking
# ============================================================

from round_engine import RoundEngine, Player
from agents import Agent, ARCHETYPES
from evolution import EvolutionEngine

# ============================================================
# DATA
# ============================================================

DIFFICULTY = {
    "Easy":     {"n_agents": 3,  "generations": 20,  "mutation_rate": 0.3},
    "Normal":   {"n_agents": 4,  "generations": 50,  "mutation_rate": 0.15},
    "Hard":     {"n_agents": 5,  "generations": 100, "mutation_rate": 0.05},
    "Research": {"n_agents": 5,  "generations": 200, "mutation_rate": 0.01},
}

# ============================================================
# LOGIC
# ============================================================

class Simulation:
    """
    AI vs AI Simulation — chạy nhiều rounds tự động
    Kết hợp Round Engine (payoffs) + Evolution Engine (population dynamics)
    """

    def __init__(self, difficulty: str = "Normal"):
        cfg = DIFFICULTY[difficulty]
        self.difficulty = difficulty
        self.n_agents = cfg["n_agents"]
        self.generations = cfg["generations"]
        self.mutation_rate = cfg["mutation_rate"]

        # Tạo players từ AI agents
        archetypes = (ARCHETYPES * 2)[:self.n_agents]
        self.players = [
            Player(id=f"p{i}", name=f"{a[:4]}_{i}", industry="Technology")
            for i, a in enumerate(archetypes)
        ]
        self.agents = [
            Agent(id=f"p{i}", name=f"{a[:4]}_{i}", archetype=a)
            for i, a in enumerate(archetypes)
        ]

        self.engine = RoundEngine(self.players)
        self.market_share_history = []
        self.strategy_distribution_history = []

    def run(self, n_rounds: int = None) -> dict:
        """Chạy simulation"""
        n_rounds = n_rounds or self.generations

        print(f"\n🤖 AI vs AI Simulation — {self.difficulty} mode")
        print(f"   {self.n_agents} agents | {n_rounds} rounds\n")

        for round_num in range(n_rounds):
            # Lấy decisions từ AI agents
            decisions = {
                agent.id: agent.choose_strategy()
                for agent in self.agents
            }

            # Chạy round
            result = self.engine.run_round(decisions)

            # Update agents với kết quả
            for i, agent in enumerate(self.agents):
                payoff = result.payoffs.get(agent.id, 0)
                others = [decisions[a.id] for a in self.agents if a.id != agent.id]
                agent.update(decisions[agent.id], others[0] if others else "Cooperate", payoff)

            # Track market share
            self.market_share_history.append({
                "round": round_num + 1,
                "shares": result.market_shares.copy()
            })

            # Track strategy distribution
            dist = {}
            for agent in self.agents:
                dist[agent.archetype] = dist.get(agent.archetype, 0) + 1
            self.strategy_distribution_history.append({
                "round": round_num + 1,
                "distribution": {k: round(v/self.n_agents*100, 1) for k, v in dist.items()}
            })

            # Print progress mỗi 10 rounds
            if (round_num + 1) % 10 == 0:
                self._print_progress(round_num + 1, result)

        return self._summary()

    def _print_progress(self, round_num: int, result):
        """In tiến độ simulation"""
        shares = " | ".join(
            f"{self.players[i].name}:{result.market_shares.get(p.id, 0):.1f}%"
            for i, p in enumerate(self.players)
        )
        nash = "✅ Nash" if result.is_nash else "❌"
        print(f"   Round {round_num:3d} | {shares} | {nash}")

    def _summary(self) -> dict:
        """Tổng kết simulation"""
        final_shares = self.market_share_history[-1]["shares"]
        winner = max(final_shares, key=final_shares.get)
        winner_name = next(p.name for p in self.players if p.id == winner)

        nash_rounds = sum(1 for r in self.engine.history if r.is_nash)
        nash_pct = round(nash_rounds / len(self.engine.history) * 100, 1)

        return {
            "difficulty": self.difficulty,
            "total_rounds": len(self.engine.history),
            "winner": winner_name,
            "winner_share": final_shares[winner],
            "nash_equilibrium_pct": nash_pct,
            "final_market_shares": {
                p.name: final_shares.get(p.id, 0)
                for p in self.players
            },
            "final_agent_archetypes": {
                a.name: a.archetype for a in self.agents
            }
        }

# ============================================================
# UI / DISPLAY
# ============================================================

def print_summary(summary: dict):
    """In tổng kết simulation"""
    print(f"\n{'='*55}")
    print(f"  SIMULATION SUMMARY — {summary['difficulty']} mode")
    print(f"{'='*55}")
    print(f"\n🏆 Winner: {summary['winner']} ({summary['winner_share']:.1f}% market share)")
    print(f"⚖️  Nash Equilibrium: {summary['nash_equilibrium_pct']}% of rounds")
    print(f"\n📊 Final Market Shares:")
    for name, share in sorted(summary["final_market_shares"].items(), key=lambda x: -x[1]):
        bar = "█" * int(share / 5)
        print(f"   {name:15} {bar:20} {share:.1f}%")
    print(f"\n🤖 Final Agent Archetypes:")
    for name, archetype in summary["final_agent_archetypes"].items():
        print(f"   {name:15} → {archetype}")

def run_demo():
    sim = Simulation(difficulty="Normal")
    summary = sim.run(n_rounds=30)
    print_summary(summary)

if __name__ == "__main__":
    run_demo()