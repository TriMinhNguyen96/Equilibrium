# ============================================================
# EQUILIBRIUM — Evolutionary Dynamics Engine
# Population shift theo ESS — Evolutionarily Stable Strategy
# ============================================================

import random
from dataclasses import dataclass, field
from agents import Agent, ARCHETYPES
from multiplayer import market_payoff, STRATEGIES

# ============================================================
# DATA
# ============================================================

@dataclass
class Population:
    """
    Đại diện cho toàn bộ population của thị trường
    Theo dõi tỉ lệ từng archetype qua thời gian
    """
    agents: list[Agent]
    history: list = field(default_factory=list)

    def get_distribution(self) -> dict:
        """Tính tỉ lệ % từng archetype trong population"""
        total = len(self.agents)
        dist = {a: 0 for a in ARCHETYPES}
        for agent in self.agents:
            dist[agent.archetype] += 1
        return {k: round(v / total * 100, 1) for k, v in dist.items()}

# ============================================================
# LOGIC
# ============================================================

class EvolutionEngine:
    """
    Engine mô phỏng Evolutionary Dynamics
    Sau mỗi generation, agents với payoff thấp bị thay thế
    bởi agents copy chiến lược của agents thành công hơn
    """

    def __init__(self, n_agents: int = 20, initial_dist: dict = None):
        """
        n_agents    : tổng số agents trong population
        initial_dist: tỉ lệ ban đầu {archetype: pct}
                      ví dụ {"Cooperator": 50, "Defector": 50}
        """
        self.n_agents = n_agents
        self.population = self._init_population(initial_dist)
        self.generation = 0
        self.history = []  # lịch sử distribution qua từng generation

    def _init_population(self, dist: dict = None) -> Population:
        """Khởi tạo population với distribution cho trước"""
        if dist is None:
            # Default: chia đều
            dist = {a: 100 // len(ARCHETYPES) for a in ARCHETYPES}

        agents = []
        idx = 0
        for archetype, pct in dist.items():
            count = round(self.n_agents * pct / 100)
            for _ in range(count):
                agents.append(Agent(
                    id=f"agent_{idx}",
                    name=f"{archetype}_{idx}",
                    archetype=archetype
                ))
                idx += 1

        # Fill nếu thiếu do rounding
        while len(agents) < self.n_agents:
            agents.append(Agent(
                id=f"agent_{idx}",
                name=f"Cooperator_{idx}",
                archetype="Cooperator"
            ))
            idx += 1

        return Population(agents=agents[:self.n_agents])

    def run_generation(self) -> dict:
        """
        Chạy một generation:
        1. Agents gặp nhau ngẫu nhiên và thi đấu
        2. Tính average payoff của từng archetype
        3. Agents thua bị thay thế bởi copy của agents thắng
        """
        self.generation += 1

        # STEP 1: Tournament — agents gặp nhau ngẫu nhiên
        payoffs = {agent.id: 0.0 for agent in self.population.agents}
        matches = 0

        shuffled = self.population.agents.copy()
        random.shuffle(shuffled)

        for i in range(0, len(shuffled) - 2, 3):
            group = shuffled[i:i+3]
            if len(group) < 3:
                continue

            strategies = tuple(a.choose_strategy() for a in group)
            round_payoffs = market_payoff(strategies)

            for j, agent in enumerate(group):
                payoffs[agent.id] += round_payoffs[j]
                # Update agent history
                other_strategies = [s for k, s in enumerate(strategies) if k != j]
                agent.update(strategies[j], other_strategies[0], round_payoffs[j])

            matches += 1

        # STEP 2: Tính average payoff theo archetype
        archetype_payoffs = {a: [] for a in ARCHETYPES}
        for agent in self.population.agents:
            archetype_payoffs[agent.archetype].append(payoffs[agent.id])

        avg_payoffs = {
            a: sum(v) / len(v) if v else 0
            for a, v in archetype_payoffs.items()
        }

        # STEP 3: Evolutionary selection
        # Agents có payoff thấp hơn average bị replace
        self._evolve(avg_payoffs)

        # Lưu distribution
        dist = self.population.get_distribution()
        self.history.append({
            "generation": self.generation,
            "distribution": dist,
            "avg_payoffs": {k: round(v, 2) for k, v in avg_payoffs.items() if v > 0}
        })

        return self.history[-1]

    def _evolve(self, avg_payoffs: dict):
        """
        Replication dynamics:
        Archetype có payoff cao hơn average → tăng tỉ lệ
        Archetype có payoff thấp hơn average → giảm tỉ lệ
        """
        total_avg = sum(avg_payoffs.values()) / max(len([v for v in avg_payoffs.values() if v > 0]), 1)

        for agent in self.population.agents:
            agent_avg = avg_payoffs.get(agent.archetype, 0)
            # Xác suất bị replace tỉ lệ nghịch với performance
            if agent_avg < total_avg * 0.8:
                # Tìm archetype thành công nhất để copy
                best_archetype = max(avg_payoffs, key=avg_payoffs.get)
                agent.archetype = best_archetype
                agent.history = []
                agent.opponent_history = []

    def run_simulation(self, n_generations: int = 50) -> list:
        """Chạy simulation nhiều generations liên tiếp"""
        results = []
        for _ in range(n_generations):
            result = self.run_generation()
            results.append(result)
        return results

    def find_ess(self) -> dict:
        """
        Tìm ESS (Evolutionarily Stable Strategy) —
        distribution mà population hội tụ về sau nhiều generations
        Chạy 100 generations rồi lấy average của 20 cuối
        """
        self.run_simulation(100)
        last_20 = self.history[-20:]
        ess = {}
        for archetype in ARCHETYPES:
            avg = sum(g["distribution"].get(archetype, 0) for g in last_20) / 20
            if avg > 1:
                ess[archetype] = round(avg, 1)
        return ess

# ============================================================
# UI / DISPLAY
# ============================================================

def print_generation(result: dict):
    """In kết quả một generation"""
    print(f"\n  Generation {result['generation']:3d} |", end="")
    for archetype, pct in result["distribution"].items():
        if pct > 0:
            bar = "█" * int(pct / 5)
            print(f"  {archetype[:4]}:{pct:4.1f}% {bar}", end="")

def print_ess(ess: dict):
    """In ESS distribution"""
    print(f"\n\n🧬 ESS — Evolutionarily Stable Strategy")
    print(f"   (Chiến lược ổn định tiến hóa — thị trường hội tụ về)\n")
    for archetype, pct in sorted(ess.items(), key=lambda x: -x[1]):
        bar = "█" * int(pct / 5)
        print(f"   {archetype:15} {bar:20} {pct:.1f}%")

def run_demo():
    print("🧬 EQUILIBRIUM — Evolutionary Dynamics Demo")
    print(f"   20 agents | 5 archetypes | 50 generations\n")

    # Bắt đầu với 60% Cooperator, 40% Defector
    engine = EvolutionEngine(
        n_agents=20,
        initial_dist={
            "Cooperator": 40,
            "Defector":   40,
            "TitForTat":  10,
            "Random":      5,
            "Adaptive":    5,
        }
    )

    print("📊 Population evolution:")
    results = engine.run_simulation(30)
    for i, r in enumerate(results):
        if i % 5 == 0:  # Print mỗi 5 generations
            print_generation(r)

    ess = engine.find_ess()
    print_ess(ess)

if __name__ == "__main__":
    run_demo()