const BASE_URL = "https://equilibrium-backend-p5st.onrender.com";

const NGROK_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

export interface AISlot {
  name: string;
  industry: string;
  archetype: string;
}

export interface GameConfig {
  player_name: string;
  industry: string;
  difficulty?: string;
  n_competitors?: number;
  ai_slots?: AISlot[];
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
      headers: NGROK_HEADERS,
      body: JSON.stringify(config),
    });
    return res.json() as Promise<{ game_id: string; players: Player[] }>;
  },

  runRound: async (game_id: string, strategy: string) => {
    const res = await fetch(`${BASE_URL}/game/round`, {
      method: "POST",
      headers: NGROK_HEADERS,
      body: JSON.stringify({ game_id, strategy }),
    });
    return res.json() as Promise<RoundResult>;
  },

  getState: async (game_id: string) => {
    const res = await fetch(`${BASE_URL}/game/${game_id}/state`, {
      headers: NGROK_HEADERS,
    });
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
    this.ws = new WebSocket(`wss://equilibrium-backend-p5st.onrender.com/ws/${this.gameId}`);
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

// ============================================================
// EXPORT UTILITIES
// ============================================================

export const exportData = {

  toCSV: (history: RoundResult[], players: Player[]): string => {
    const headers = [
      "round",
      ...players.map(p => `${p.name}_payoff`),
      ...players.map(p => `${p.name}_market_share`),
      ...players.map(p => `${p.name}_decision`),
      "is_nash"
    ].join(",");

    const rows = history.map(r => [
      r.round_number,
      ...players.map(p => r.payoffs[p.id] || 0),
      ...players.map(p => r.market_shares[p.id] || 0),
      ...players.map(p => r.decisions[p.id] || ""),
      r.is_nash ? 1 : 0
    ].join(","));

    return [headers, ...rows].join("\n");
  },

  toJSON: (history: RoundResult[], players: Player[]): string => {
    return JSON.stringify({ players, history }, null, 2);
  },

  download: (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ============================================================
// ROOM / MULTIPLAYER API
// ============================================================

export interface RoomPlayer {
  player_id: string;
  name: string;
  industry: string;
  is_host: boolean;
  is_ready: boolean;
}

export interface RoomState {
  room_code: string;
  host_id: string;
  players: RoomPlayer[];
  status: "waiting" | "in_game" | "finished";
  created_at: string;
}

export interface RoomConfig {
  host_name: string;
  industry: string;
  max_players?: number;
  time_limit?: number | null;
}

export interface JoinRequest {
  room_code: string;
  player_name: string;
  industry: string;
}

export const roomApi = {
  createRoom: async (config: RoomConfig): Promise<{ room_code: string; player_id: string; room: RoomState }> => {
    const res = await fetch(`${BASE_URL}/room/create`, {
      method: "POST",
      headers: NGROK_HEADERS,
      body: JSON.stringify(config),
    });
    return res.json();
  },

  joinRoom: async (req: JoinRequest): Promise<{ player_id: string; room: RoomState }> => {
    const res = await fetch(`${BASE_URL}/room/join`, {
      method: "POST",
      headers: NGROK_HEADERS,
      body: JSON.stringify(req),
    });
    return res.json();
  },

  getRoom: async (room_code: string): Promise<RoomState> => {
    const res = await fetch(`${BASE_URL}/room/${room_code}`, {
      headers: NGROK_HEADERS,
    });
    return res.json();
  },

  startRoom: async (room_code: string, player_id: string): Promise<{ game_id: string; players: Player[] }> => {
    const res = await fetch(`${BASE_URL}/room/${room_code}/start`, {
      method: "POST",
      headers: NGROK_HEADERS,
      body: JSON.stringify({ player_id }),
    });
    return res.json();
  },
};

export class RoomWebSocket {
  private ws: WebSocket | null = null;

  connect(room_code: string, onUpdate: (room: RoomState) => void, onGameStart: (data: { game_id: string; players: Player[] }) => void) {
    this.ws = new WebSocket(`wss://equilibrium-backend-p5st.onrender.com/ws/room/${room_code}`);

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "room_update") onUpdate(msg.room);
      if (msg.type === "game_start") onGameStart(msg);
    };

    this.ws.onerror = (e) => console.error("Room WebSocket error:", e);
  }

  disconnect() {
    this.ws?.close();
  }
}