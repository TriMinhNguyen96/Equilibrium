# ============================================================
# EQUILIBRIUM — FastAPI Backend
# REST API + WebSocket cho React frontend
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import asyncio

from round_engine import RoundEngine, Player
from agents import Agent, ARCHETYPES
from simulation import Simulation

# ============================================================
# DATA
# ============================================================

app = FastAPI(title="EQUILIBRIUM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

games: dict = {}

class GameConfig(BaseModel):
    player_name: str
    industry: str
    difficulty: str = "Normal"
    n_competitors: int = 3
    ai_slots: list = []

class DecisionRequest(BaseModel):
    game_id: str
    strategy: str
    message: Optional[str] = None

# ============================================================
# LOGIC
# ============================================================

def create_game(config: GameConfig) -> dict:
    import uuid
    game_id = str(uuid.uuid4())[:8]

    players = [
        Player(
            id="human",
            name=config.player_name,
            industry=config.industry,
            is_human=True
        )
    ]

    ai_names = ["FinanceHub", "RetailKing", "TechRival", "EnergyX", "PharmaZ"]
    ai_industries = ["Finance", "F&B / Retail", "Technology", "Energy", "Healthcare"]
    ai_archetypes_default = (ARCHETYPES * 2)[:config.n_competitors]

    agents = []
    for i in range(config.n_competitors):
        if config.ai_slots and i < len(config.ai_slots):
            slot = config.ai_slots[i]
            a_name = slot.get("name", ai_names[i])
            a_industry = slot.get("industry", ai_industries[i])
            a_archetype = slot.get("archetype", ai_archetypes_default[i])
        else:
            a_name = ai_names[i]
            a_industry = ai_industries[i]
            a_archetype = ai_archetypes_default[i]

        players.append(Player(
            id=f"ai_{i}",
            name=a_name,
            industry=a_industry,
            is_human=False
        ))
        agents.append(Agent(
            id=f"ai_{i}",
            name=a_name,
            archetype=a_archetype
        ))

    engine = RoundEngine(players)

    games[game_id] = {
        "engine": engine,
        "agents": agents,
        "config": config.dict(),
        "status": "active"
    }

    return {
        "game_id": game_id,
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "industry": p.industry,
                "is_human": p.is_human,
                "market_share": p.market_share
            }
            for p in players
        ]
    }

def serialize_result(result, players) -> dict:
    return {
        "round_number": result.round_number,
        "decisions": result.decisions,
        "payoffs": result.payoffs,
        "market_shares": result.market_shares,
        "is_nash": result.is_nash,
        "nash_equilibria": [
            {
                "strategies": list(ne["strategies"]),
                "payoffs": list(ne["payoffs"])
            }
            for ne in result.nash_equilibria
        ],
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "industry": p.industry,
                "market_share": p.market_share,
                "total_payoff": p.total_payoff,
                "strategy_history": p.strategy_history
            }
            for p in players
        ]
    }

# ============================================================
# REST ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {"message": "EQUILIBRIUM API", "version": "1.0.0"}

@app.post("/game/create")
def api_create_game(config: GameConfig):
    result = create_game(config)
    return result

@app.post("/game/round")
def api_run_round(req: DecisionRequest):
    if req.game_id not in games:
        return {"error": "Game not found"}

    game = games[req.game_id]
    engine: RoundEngine = game["engine"]
    agents: list[Agent] = game["agents"]

    decisions = {"human": req.strategy}
    for agent in agents:
        decisions[agent.id] = agent.choose_strategy()

    result = engine.run_round(decisions)

    for agent in agents:
        payoff = result.payoffs.get(agent.id, 0)
        other = decisions.get("human", "Cooperate")
        agent.update(decisions[agent.id], other, payoff)

    return serialize_result(result, engine.players)

@app.get("/game/{game_id}/state")
def api_get_state(game_id: str):
    if game_id not in games:
        return {"error": "Game not found"}

    game = games[game_id]
    engine: RoundEngine = game["engine"]

    return {
        "round_number": engine.round_number,
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "industry": p.industry,
                "market_share": p.market_share,
                "total_payoff": p.total_payoff,
                "strategy_history": p.strategy_history
            }
            for p in engine.players
        ],
        "history": [
            serialize_result(r, engine.players)
            for r in engine.history
        ]
    }

@app.delete("/game/{game_id}")
def api_delete_game(game_id: str):
    if game_id in games:
        del games[game_id]
    return {"message": "Game deleted"}

# ============================================================
# WEBSOCKET
# ============================================================

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()

    if game_id not in games:
        await websocket.send_json({"error": "Game not found"})
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_json()
            strategy = data.get("strategy", "Cooperate")

            game = games[game_id]
            engine: RoundEngine = game["engine"]
            agents: list[Agent] = game["agents"]

            decisions = {"human": strategy}
            for agent in agents:
                decisions[agent.id] = agent.choose_strategy()

            result = engine.run_round(decisions)

            for agent in agents:
                payoff = result.payoffs.get(agent.id, 0)
                agent.update(decisions[agent.id], strategy, payoff)

            await websocket.send_json(serialize_result(result, engine.players))

    except WebSocketDisconnect:
        pass

@app.post("/game/spectate")
def api_create_spectate(config: GameConfig):
    """
    Tạo game AI vs AI để spectate
    Không có human player — chỉ có AI agents
    """
    import uuid
    game_id = str(uuid.uuid4())[:8]

    ai_names = ["AlphaCore", "BetaTrust", "GammaMind", "DeltaX", "EpsilonAI"]
    ai_industries = ["Finance", "F&B / Retail", "Technology", "Energy", "Healthcare"]
    ai_archetypes_default = (ARCHETYPES * 2)[:config.n_competitors]

    players = []
    agents = []

    for i in range(config.n_competitors):
        if config.ai_slots and i < len(config.ai_slots):
            slot = config.ai_slots[i]
            a_name = slot.get("name", ai_names[i])
            a_industry = slot.get("industry", ai_industries[i])
            a_archetype = slot.get("archetype", ai_archetypes_default[i])
        else:
            a_name = ai_names[i]
            a_industry = ai_industries[i]
            a_archetype = ai_archetypes_default[i]

        players.append(Player(
            id=f"ai_{i}",
            name=a_name,
            industry=a_industry,
            is_human=False
        ))
        agents.append(Agent(
            id=f"ai_{i}",
            name=a_name,
            archetype=a_archetype
        ))

    engine = RoundEngine(players)
    games[game_id] = {
        "engine": engine,
        "agents": agents,
        "config": config.dict(),
        "status": "spectate"
    }

    return {
        "game_id": game_id,
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "industry": p.industry,
                "is_human": p.is_human,
                "market_share": p.market_share
            }
            for p in players
        ]
    }

@app.websocket("/ws/spectate/{game_id}")
async def websocket_spectate(websocket: WebSocket, game_id: str):
    """
    WebSocket cho Spectator mode
    Server tự động chạy rounds, client chỉ nhận data
    """
    await websocket.accept()

    if game_id not in games:
        await websocket.send_json({"error": "Game not found"})
        await websocket.close()
        return

    try:
        game = games[game_id]
        engine: RoundEngine = game["engine"]
        agents: list[Agent] = game["agents"]

        # Nhận config từ client (speed, n_rounds)
        config_data = await websocket.receive_json()
        n_rounds = config_data.get("n_rounds", 20)
        speed_ms = config_data.get("speed_ms", 1000)  # delay giữa các rounds

        for _ in range(n_rounds):
            # AI tự quyết định
            decisions = {agent.id: agent.choose_strategy() for agent in agents}

            # Chạy round
            result = engine.run_round(decisions)

            # Update agents
            for agent in agents:
                payoff = result.payoffs.get(agent.id, 0)
                others = [decisions[a.id] for a in agents if a.id != agent.id]
                agent.update(decisions[agent.id], others[0] if others else "Cooperate", payoff)

            # Gửi kết quả
            await websocket.send_json(serialize_result(result, engine.players))

            # Delay giữa các rounds
            await asyncio.sleep(speed_ms / 1000)

        # Gửi signal kết thúc
        await websocket.send_json({"status": "completed", "total_rounds": n_rounds})

    except WebSocketDisconnect:
        pass