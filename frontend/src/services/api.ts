const BASE_URL = "http://localhost:8000";

export interface GameConfig {
  player_name: string;
  industry: string;
  difficulty?: string;
  n_competitors?: number;
}

export interface Player {
  id: string;
  name: string;
  industry: string;
  is_human: boolean;
  market_share: number;
  total_payoff: number;
  strategy_history: string[];
}

export interface RoundResult {
  round_number: number;
  decisions: Record<string, string>;
  payoffs: Record<string, number>;
  market_shares: Record<string, number>;
  is_nash: boolean;
  nash_equilibria: Array<{ strategies: string[]; payoffs: number[] }>;
  players: Player[];
}

export interface GameState {
  round_number: number;
  players: Player[];
  history: RoundResult[];
}

export const api = {
  createGame: async (config: GameConfig) => {
    const res = await fetch(`${BASE_URL}/game/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.json() as Promise<{ game_id: string; players: Player[] }>;
  },

  runRound: async (game_id: string, strategy: string) => {
    const res = await fetch(`${BASE_URL}/game/round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id, strategy }),
    });
    return res.json() as Promise<RoundResult>;
  },

  getState: async (game_id: string) => {
    const res = await fetch(`${BASE_URL}/game/${game_id}/state`);
    return res.json() as Promise<GameState>;
  },
};

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  connect(onMessage: (result: RoundResult) => void) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/${this.gameId}`);
    this.ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    this.ws.onerror = (e) => console.error("WebSocket error:", e);
  }

  send(strategy: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ strategy }));
    }
  }

  disconnect() {
    this.ws?.close();
  }
}