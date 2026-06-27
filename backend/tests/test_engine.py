# ============================================================
# EQUILIBRIUM — Unit Tests
# Kiểm tra toàn bộ Game Theory engine
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

import numpy as np
from payoff_matrix import PayoffMatrix, DEFAULT_MATRIX
from mixed_strategy import MixedStrategySolver
from multiplayer import NPlayerGame, market_payoff, STRATEGIES
from zero_sum import ZeroSumGame, MARKET_PAYOFF, MARKET_STRATEGIES_A, MARKET_STRATEGIES_B
from round_engine import RoundEngine, Player

# ============================================================
# LOGIC
# ============================================================

passed = 0
failed = 0

def test(name: str, condition: bool, detail: str = ""):
    """Helper function để chạy một test"""
    global passed, failed
    if condition:
        print(f"   ✅ PASS — {name}")
        passed += 1
    else:
        print(f"   ❌ FAIL — {name} {f'| {detail}' if detail else ''}")
        failed += 1

# ============================================================
# TEST SUITES
# ============================================================

def test_payoff_matrix():
    print("\n📊 PayoffMatrix Tests")

    matrix = PayoffMatrix(
        strategies=DEFAULT_MATRIX["strategies"],
        payoffs=DEFAULT_MATRIX["payoffs"]
    )

    # Test get_payoff
    pa, pb = matrix.get_payoff(0, 0)
    test("get_payoff (Cooperate, Cooperate) = (70, 70)",
         pa == 70 and pb == 70, f"got ({pa}, {pb})")

    pa, pb = matrix.get_payoff(1, 0)
    test("get_payoff (Defect, Cooperate) = (90, 20)",
         pa == 90 and pb == 20, f"got ({pa}, {pb})")

    pa, pb = matrix.get_payoff(1, 1)
    test("get_payoff (Defect, Defect) = (40, 40)",
         pa == 40 and pb == 40, f"got ({pa}, {pb})")

    # Test Dominant Strategy
    dom_a = matrix.find_dominant_strategy("A")
    test("Dominant Strategy của A là Defect",
         dom_a == "Defect", f"got {dom_a}")

    dom_b = matrix.find_dominant_strategy("B")
    test("Dominant Strategy của B là Defect",
         dom_b == "Defect", f"got {dom_b}")

    # Test Nash Equilibrium
    nash = matrix.find_nash_equilibrium()
    test("Nash Equilibrium là (Defect, Defect)",
         len(nash) == 1 and nash[0] == ("Defect", "Defect"),
         f"got {nash}")

def test_mixed_strategy():
    print("\n🎲 MixedStrategy Tests")

    # Rock Paper Scissors — kết quả phải là 1/3 mỗi cái
    strategies = ["Rock", "Paper", "Scissors"]
    payoff_a = [[ 0,-1, 1],[ 1, 0,-1],[-1, 1, 0]]
    payoff_b = [[ 0, 1,-1],[-1, 0, 1],[ 1,-1, 0]]

    solver = MixedStrategySolver(payoff_a, payoff_b, strategies)
    result = solver.solve()

    for s in strategies:
        p = result["player_a"][s]
        test(f"Mix A — {s} ≈ 33.3%",
             abs(p - 1/3) < 0.01, f"got {p:.4f}")

    for s in strategies:
        p = result["player_b"][s]
        test(f"Mix B — {s} ≈ 33.3%",
             abs(p - 1/3) < 0.01, f"got {p:.4f}")

    # Expected payoff của zero-sum game phải = 0
    mix_a = np.array(list(result["player_a"].values()))
    mix_b = np.array(list(result["player_b"].values()))
    ep_a, ep_b = solver.expected_payoff(mix_a, mix_b)
    test("Expected Payoff RPS = 0 cho cả hai",
         abs(ep_a) < 0.01 and abs(ep_b) < 0.01,
         f"got A:{ep_a}, B:{ep_b}")

def test_multiplayer():
    print("\n👥 Multiplayer Tests")

    game = NPlayerGame(3, STRATEGIES, market_payoff)

    # Test số lượng outcomes = 2^3 = 8
    test("3 players × 2 strategies = 8 outcomes",
         len(game.all_outcomes) == 8,
         f"got {len(game.all_outcomes)}")

    # Test Nash Equilibrium = (Defect, Defect, Defect)
    nash = game.find_nash_equilibria()
    test("Nash Equilibrium là (Defect, Defect, Defect)",
         len(nash) == 1 and nash[0]["strategies"] == ("Defect", "Defect", "Defect"),
         f"got {[n['strategies'] for n in nash]}")

    # Test payoff tại Nash = (40, 40, 40)
    nash_payoffs = nash[0]["payoffs"]
    test("Payoff tại Nash = (40, 40, 40)",
         nash_payoffs == (40, 40, 40),
         f"got {nash_payoffs}")

    # Test Coalition — (Cooperate, Cooperate, Cooperate) tốt hơn Nash
    coop_payoff = game.all_outcomes[("Cooperate", "Cooperate", "Cooperate")]
    test("(Cooperate×3) cho payoff tốt hơn Nash",
         all(c > n for c, n in zip(coop_payoff, nash_payoffs)),
         f"Coop:{coop_payoff} vs Nash:{nash_payoffs}")

def test_zero_sum():
    print("\n⚖️  ZeroSum Tests")

    game = ZeroSumGame(MARKET_PAYOFF, MARKET_STRATEGIES_A, MARKET_STRATEGIES_B)

    # Test Saddle Point
    saddle = game.find_saddle_point()
    test("Saddle Point tồn tại",
         saddle is not None, "got None")

    if saddle:
        test("Saddle Point = (Aggressive, Aggressive)",
             saddle["strategy_a"] == "Aggressive Pricing" and
             saddle["strategy_b"] == "Aggressive Pricing",
             f"got ({saddle['strategy_a']}, {saddle['strategy_b']})")

        test("Game value tại Saddle Point = 0",
             abs(saddle["value"]) < 0.01,
             f"got {saddle['value']}")

    # Test Maximin = Minimax (tính chất zero-sum)
    maximin_idx, maximin_val = game.maximin()
    minimax_idx, minimax_val = game.minimax()
    test("Maximin = Minimax (tính chất zero-sum)",
         abs(maximin_val - minimax_val) < 0.01,
         f"Maximin:{maximin_val}, Minimax:{minimax_val}")

    # Test market share tổng = 100%
    share_a, share_b = game.market_share_split(100, "Aggressive Pricing", "Premium Pricing")
    test("Market share tổng = 100%",
         abs(share_a + share_b - 100) < 0.01,
         f"got {share_a} + {share_b} = {share_a + share_b}")

def test_round_engine():
    print("\n🎮 RoundEngine Tests")

    players = [
        Player(id="p1", name="Alpha"),
        Player(id="p2", name="Beta"),
        Player(id="p3", name="Gamma"),
    ]
    engine = RoundEngine(players)

    # Test market share ban đầu đều nhau
    for p in players:
        test(f"Market share ban đầu của {p.name} ≈ 33.3%",
             abs(p.market_share - 33.33) < 0.1,
             f"got {p.market_share}")

    # Test round 1 — tất cả Cooperate
    result1 = engine.run_round({"p1": "Cooperate", "p2": "Cooperate", "p3": "Cooperate"})
    test("Round 1 — round_number = 1",
         result1.round_number == 1)
    test("Round 1 — payoff Cooperate×3 = (70, 70, 70)",
         list(result1.payoffs.values()) == [70, 70, 70],
         f"got {list(result1.payoffs.values())}")
    test("Round 1 — không phải Nash Equilibrium",
         result1.is_nash == False)

    # Test round 2 — tất cả Defect = Nash
    result2 = engine.run_round({"p1": "Defect", "p2": "Defect", "p3": "Defect"})
    test("Round 2 — là Nash Equilibrium",
         result2.is_nash == True)
    test("Round 2 — payoff Defect×3 = (40, 40, 40)",
         list(result2.payoffs.values()) == [40, 40, 40],
         f"got {list(result2.payoffs.values())}")

    # Test history
    test("History có 2 rounds",
         len(engine.history) == 2)

    # Test save/load state
    engine.save_state("test_state.json")
    import os
    test("Save state tạo ra file JSON",
         os.path.exists("test_state.json"))
    os.remove("test_state.json")

    # Test leaderboard
    lb = engine.get_leaderboard()
    test("Leaderboard trả về đúng số players",
         len(lb) == 3)

# ============================================================
# UI / DISPLAY
# ============================================================

def run_all_tests():
    print("🧪 EQUILIBRIUM — Unit Test Suite")
    print("=" * 50)

    test_payoff_matrix()
    test_mixed_strategy()
    test_multiplayer()
    test_zero_sum()
    test_round_engine()

    print(f"\n{'='*50}")
    print(f"  KẾT QUẢ: {passed} passed | {failed} failed | {passed+failed} total")
    if failed == 0:
        print(f"  🎉 Tất cả tests đều pass!")
    else:
        print(f"  ⚠️  {failed} test(s) cần fix")
    print(f"{'='*50}")

if __name__ == "__main__":
    run_all_tests()