# ============================================================
# EQUILIBRIUM — FastAPI Backend
# REST API + WebSocket cho React frontend
# ============================================================

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'engine'))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import json
import asyncio
import pathlib
import random as _random
import string
import uuid

from round_engine import RoundEngine, Player
from agents import Agent, ARCHETYPES
from simulation import Simulation

# ============================================================
# DATA
# ============================================================

app = FastAPI(title="EQUILIBRIUM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

games: dict = {}
rooms: dict = {}

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

class RoomConfig(BaseModel):
    host_name: str
    industry: str
    max_players: int = 4
    n_ai: int = 0
    time_limit: Optional[int] = None

class JoinRequest(BaseModel):
    room_code: str
    player_name: str
    industry: str

# ============================================================
# LOGIC
# ============================================================

def create_game(config: GameConfig) -> dict:
    game_id = str(uuid.uuid4())[:8]

    players = [
        Player(id="human", name=config.player_name, industry=config.industry, is_human=True)
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

        players.append(Player(id=f"ai_{i}", name=a_name, industry=a_industry, is_human=False))
        agents.append(Agent(id=f"ai_{i}", name=a_name, archetype=a_archetype))

    engine = RoundEngine(players)
    games[game_id] = {"engine": engine, "agents": agents, "config": config.dict(), "status": "active"}

    return {
        "game_id": game_id,
        "players": [
            {"id": p.id, "name": p.name, "industry": p.industry, "is_human": p.is_human, "market_share": p.market_share}
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
            {"strategies": list(ne["strategies"]), "payoffs": list(ne["payoffs"])}
            for ne in result.nash_equilibria
        ],
        "players": [
            {
                "id": p.id, "name": p.name, "industry": p.industry,
                "market_share": p.market_share, "total_payoff": p.total_payoff,
                "strategy_history": p.strategy_history
            }
            for p in players
        ]
    }

def generate_room_code() -> str:
    return "".join(_random.choices(string.ascii_uppercase + string.digits, k=6))

# ============================================================
# REST ENDPOINTS
# ============================================================

@app.get("/api")
def root():
    return {"message": "EQUILIBRIUM API", "version": "1.0.0"}

@app.post("/game/create")
def api_create_game(config: GameConfig):
    return create_game(config)

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
        agent.update(decisions[agent.id], decisions.get("human", "Cooperate"), payoff)
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
            {"id": p.id, "name": p.name, "industry": p.industry,
             "market_share": p.market_share, "total_payoff": p.total_payoff,
             "strategy_history": p.strategy_history}
            for p in engine.players
        ],
        "history": [serialize_result(r, engine.players) for r in engine.history]
    }

@app.delete("/game/{game_id}")
def api_delete_game(game_id: str):
    if game_id in games:
        del games[game_id]
    return {"message": "Game deleted"}

@app.post("/game/spectate")
def api_create_spectate(config: GameConfig):
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
        players.append(Player(id=f"ai_{i}", name=a_name, industry=a_industry, is_human=False))
        agents.append(Agent(id=f"ai_{i}", name=a_name, archetype=a_archetype))
    engine = RoundEngine(players)
    games[game_id] = {"engine": engine, "agents": agents, "config": config.dict(), "status": "spectate"}
    return {
        "game_id": game_id,
        "players": [
            {"id": p.id, "name": p.name, "industry": p.industry, "is_human": p.is_human, "market_share": p.market_share}
            for p in players
        ]
    }

# ============================================================
# ROOM SYSTEM
# ============================================================

@app.post("/room/create")
def api_create_room(config: RoomConfig):
    room_code = generate_room_code()
    while room_code in rooms:
        room_code = generate_room_code()
    rooms[room_code] = {
        "code": room_code,
        "host": config.host_name,
        "status": "waiting",
        "max_players": config.max_players,
        "players": [
            {"id": "human_0", "name": config.host_name, "industry": config.industry,
             "is_host": True, "is_ready": False, "decision": None}
        ],
        "n_ai": config.n_ai,
        "game_id": None,
        "round_decisions": {},
        "time_limit": config.time_limit,
    }
    return {"room_code": room_code, "player_id": "human_0", "room": rooms[room_code]}

@app.post("/room/join")
def api_join_room(req: JoinRequest):
    if req.room_code not in rooms:
        return {"error": "Room not found"}
    room = rooms[req.room_code]
    if room["status"] != "waiting":
        return {"error": "Game already started"}
    if len(room["players"]) >= room["max_players"]:
        return {"error": "Room is full"}
    player_id = f"human_{len(room['players'])}"
    room["players"].append({
        "id": player_id, "name": req.player_name, "industry": req.industry,
        "is_host": False, "is_ready": False, "decision": None
    })
    return {"room_code": req.room_code, "player_id": player_id, "room": room}

@app.get("/room/{room_code}")
def api_get_room(room_code: str):
    if room_code not in rooms:
        return {"error": "Room not found"}
    return rooms[room_code]

@app.post("/room/{room_code}/start")
def api_start_room(room_code: str):
    if room_code not in rooms:
        return {"error": "Room not found"}
    room = rooms[room_code]
    if room["status"] != "waiting":
        return {"error": "Game already started"}
    players = [
        Player(id=p["id"], name=p["name"], industry=p["industry"], is_human=True)
        for p in room["players"]
    ]
    ai_names = ["AlphaCore", "BetaTrust", "GammaMind"]
    ai_archetypes = ["Defector", "Cooperator", "TitForTat"]
    agents = []
    for i in range(room["n_ai"]):
        players.append(Player(id=f"ai_{i}", name=ai_names[i], industry="Technology", is_human=False))
        agents.append(Agent(id=f"ai_{i}", name=ai_names[i], archetype=ai_archetypes[i]))
    game_id = str(uuid.uuid4())[:8]
    engine = RoundEngine(players)
    games[game_id] = {"engine": engine, "agents": agents, "config": {}, "status": "active"}
    room["status"] = "playing"
    room["game_id"] = game_id
    return {"game_id": game_id, "room": room}

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

@app.websocket("/ws/spectate/{game_id}")
async def websocket_spectate(websocket: WebSocket, game_id: str):
    await websocket.accept()
    if game_id not in games:
        await websocket.send_json({"error": "Game not found"})
        await websocket.close()
        return
    try:
        game = games[game_id]
        engine: RoundEngine = game["engine"]
        agents: list[Agent] = game["agents"]
        config_data = await websocket.receive_json()
        n_rounds = config_data.get("n_rounds", 20)
        speed_ms = config_data.get("speed_ms", 1000)
        for _ in range(n_rounds):
            decisions = {agent.id: agent.choose_strategy() for agent in agents}
            result = engine.run_round(decisions)
            for agent in agents:
                payoff = result.payoffs.get(agent.id, 0)
                others = [decisions[a.id] for a in agents if a.id != agent.id]
                agent.update(decisions[agent.id], others[0] if others else "Cooperate", payoff)
            await websocket.send_json(serialize_result(result, engine.players))
            await asyncio.sleep(speed_ms / 1000)
        await websocket.send_json({"status": "completed", "total_rounds": n_rounds})
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/room/{room_code}/{player_id}")
async def websocket_room(websocket: WebSocket, room_code: str, player_id: str):
    await websocket.accept()
    if room_code not in rooms:
        await websocket.send_json({"error": "Room not found"})
        await websocket.close()
        return
    room = rooms[room_code]
    await websocket.send_json({"type": "room_update", "room": room})
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "ready":
                for p in room["players"]:
                    if p["id"] == player_id:
                        p["is_ready"] = True
                await websocket.send_json({"type": "room_update", "room": room})
            elif msg_type == "decision":
                if room["status"] != "playing" or not room["game_id"]:
                    continue
                strategy = data.get("strategy", "Cooperate")
                room["round_decisions"][player_id] = strategy
                game = games[room["game_id"]]
                engine: RoundEngine = game["engine"]
                agents: list[Agent] = game["agents"]
                human_ids = [p["id"] for p in room["players"]]
                all_submitted = all(pid in room["round_decisions"] for pid in human_ids)
                if all_submitted:
                    decisions = dict(room["round_decisions"])
                    for agent in agents:
                        decisions[agent.id] = agent.choose_strategy()
                    result = engine.run_round(decisions)
                    for agent in agents:
                        payoff = result.payoffs.get(agent.id, 0)
                        agent.update(decisions[agent.id], decisions.get("human_0", "Cooperate"), payoff)
                    room["round_decisions"] = {}
                    await websocket.send_json({"type": "round_result", "result": serialize_result(result, engine.players)})
                else:
                    submitted = list(room["round_decisions"].keys())
                    await websocket.send_json({"type": "waiting", "submitted": submitted, "total": len(human_ids)})
    except WebSocketDisconnect:
        room["players"] = [p for p in room["players"] if p["id"] != player_id]

# ============================================================
# SERVE REACT FRONTEND (must be last)
# ============================================================

FRONTEND_DIR = pathlib.Path(__file__).parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

@app.get("/{full_path:path}", response_class=FileResponse)
def serve_frontend(full_path: str):
    return str(FRONTEND_DIR / "index.html")