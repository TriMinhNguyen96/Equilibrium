// ============================================================
// RoomLobby.tsx — Tạo / Join phòng multiplayer
// ============================================================

import { useState, useEffect, useRef } from "react";
import { roomApi, RoomWebSocket } from "../services/api";
import type { RoomState, Player } from "../services/api";

// ============================================================
// TYPES
// ============================================================

type LobbyMode = "menu" | "create" | "join" | "waiting";

interface Props {
  onBack: () => void;
  onGameStart: (gameId: string, players: Player[], playerName: string, industry: string) => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Energy", "Retail",
  "Manufacturing", "Media", "Real Estate", "Food & Beverage", "Logistics",
];

const POLL_INTERVAL = 3000;

// ============================================================
// HELPERS
// ============================================================

function StatusDot({ status }: { status: RoomState["status"] }) {
  const color = status === "waiting" ? "bg-yellow-400" : status === "in_game" ? "bg-green-400" : "bg-gray-500";
  const label = status === "waiting" ? "Waiting" : status === "in_game" ? "In Game" : "Finished";
  return (
    <span className="flex items-center gap-2 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      {label}
    </span>
  );
}

function PlayerCard({ player, isMe }: { player: RoomState["players"][0]; isMe: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded border ${isMe ? "border-indigo-500 bg-indigo-950/40" : "border-gray-700 bg-gray-900/40"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${player.is_host ? "bg-yellow-500 text-black" : "bg-indigo-700 text-white"}`}>
          {player.name[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {player.name} {isMe && <span className="text-indigo-400 text-xs">(you)</span>}
          </p>
          <p className="text-xs text-gray-500">{player.industry}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {player.is_host && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded">HOST</span>}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RoomLobby({ onBack, onGameStart }: Props) {
  const [mode, setMode] = useState<LobbyMode>("menu");

  // Form fields
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Room state
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<RoomWebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling fallback (WebSocket cho room chưa setup) ──
  useEffect(() => {
    if (mode !== "waiting" || !roomCode) return;

    const poll = async () => {
      try {
        const updated = await roomApi.getRoom(roomCode);
        setRoom(updated);
        if (updated.status === "playing" && (updated as any).game_id) {
          const roomPlayers = updated.players.map((p: any) => ({
            id: p.id ?? p.player_id,
            name: p.name,
            industry: p.industry,
            is_human: true,
            market_share: 1 / updated.players.length,
            total_payoff: 0,
            strategy_history: [],
          }));
          const me = updated.players.find((p: any) => ((p as any).id ?? p.player_id) === myPlayerId);
          onGameStart((updated as any).game_id, roomPlayers, me?.name ?? "", me?.industry ?? "");
        }
      } catch { /* silent */ }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mode, roomCode]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      wsRef.current?.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Create Room ──
  const handleCreate = async () => {
    if (!name.trim()) { setError("Nhập tên đi mày"); return; }
    setLoading(true); setError("");
    try {
      const res = await roomApi.createRoom({ host_name: name.trim(), industry });
      setRoomCode(res.room_code);
      setMyPlayerId(res.player_id);
      setRoom(res.room);
      setMode("waiting");
    } catch {
      setError("Không tạo được phòng — kiểm tra backend");
    } finally {
      setLoading(false);
    }
  };

  // ── Join Room ──
  const handleJoin = async () => {
    if (!name.trim()) { setError("Nhập tên đi mày"); return; }
    if (!joinCode.trim()) { setError("Nhập room code đi"); return; }
    setLoading(true); setError("");
    try {
      const res = await roomApi.joinRoom({ room_code: joinCode.trim().toUpperCase(), player_name: name.trim(), industry });
      setRoomCode(joinCode.trim().toUpperCase());
      setMyPlayerId(res.player_id);
      setRoom(res.room);
      setMode("waiting");
    } catch {
      setError("Không tìm thấy phòng — kiểm tra lại room code");
    } finally {
      setLoading(false);
    }
  };

  // ── Start Game (host only) ──
  const handleStart = async () => {
    if (!room || !roomCode) return;
    setLoading(true); setError("");
    try {
      const res = await roomApi.startRoom(roomCode, myPlayerId);
      const me = room.players.find(p => ((p as any).id ?? p.player_id) === myPlayerId);
      const roomPlayers = (res as any).room?.players ?? res.players ?? [];
      const gamePlayers = roomPlayers.map((p: any) => ({
        id: p.id ?? p.player_id,
        name: p.name,
        industry: p.industry,
        is_human: true,
        market_share: 1 / roomPlayers.length,
        total_payoff: 0,
        strategy_history: [],
      }));
      if (gamePlayers.length === 0) { setError("Backend không trả players"); setLoading(false); return; }
      onGameStart(res.game_id, gamePlayers, me?.name ?? name, me?.industry ?? industry);
    } catch {
      setError("Không start được — cần ít nhất 2 người");
    } finally {
      setLoading(false);
    }
  };

  // ── Copy room code ──
  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room?.players.find(p => (p.player_id ?? (p as any).id) === myPlayerId)?.is_host ?? false;
  console.log("myPlayerId:", myPlayerId, "players:", JSON.stringify(room?.players));
  const canStart = isHost && (room?.players.length ?? 0) >= 2;

  // ============================================================
  // RENDER — Menu
  // ============================================================

  if (mode === "menu") return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-widest">MULTIPLAYER</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time Game Theory vs Human Players</p>
        </div>

        <button onClick={() => setMode("create")}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded border border-indigo-500 transition-colors">
          CREATE ROOM
        </button>
        <button onClick={() => setMode("join")}
          className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded border border-gray-600 transition-colors">
          JOIN ROOM
        </button>
        <button onClick={onBack}
          className="w-full py-3 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to Menu
        </button>
      </div>
    </div>
  );

  // ============================================================
  // RENDER — Create Form
  // ============================================================

  if (mode === "create") return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-white tracking-widest mb-6">CREATE ROOM</h2>

        <div>
          <label className="text-xs text-gray-400 block mb-1">YOUR NAME</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="CEO name..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">INDUSTRY</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button onClick={handleCreate} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded transition-colors">
          {loading ? "Creating..." : "CREATE →"}
        </button>
        <button onClick={() => { setMode("menu"); setError(""); }}
          className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );

  // ============================================================
  // RENDER — Join Form
  // ============================================================

  if (mode === "join") return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold text-white tracking-widest mb-6">JOIN ROOM</h2>

        <div>
          <label className="text-xs text-gray-400 block mb-1">ROOM CODE</label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB12CD"
            maxLength={8}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">YOUR NAME</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="CEO name..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">INDUSTRY</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button onClick={handleJoin} disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded transition-colors">
          {loading ? "Joining..." : "JOIN →"}
        </button>
        <button onClick={() => { setMode("menu"); setError(""); }}
          className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );

  // ============================================================
  // RENDER — Waiting Room
  // ============================================================

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 font-mono">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-widest">ROOM LOBBY</h2>
          {room && <StatusDot status={room.status} />}
        </div>

        {/* Room Code */}
        <div className="bg-gray-900 border border-gray-700 rounded p-4 text-center">
          <p className="text-xs text-gray-500 mb-2">ROOM CODE — share với bạn bè</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold tracking-[0.3em] text-indigo-400">{roomCode}</span>
            <button onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 tracking-widest">PLAYERS ({room?.players.length ?? 0})</p>
          {room?.players.map(p => (
            <PlayerCard key={(p as any).id ?? p.player_id} player={p} isMe={((p as any).id ?? p.player_id) === myPlayerId} />
          ))}
          {(room?.players.length ?? 0) < 2 && (
            <div className="border border-dashed border-gray-700 rounded px-4 py-3 text-center text-gray-600 text-sm">
              Waiting for players to join...
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        {/* Actions */}
        <div className="space-y-2">
          {isHost ? (
            <button onClick={handleStart} disabled={!canStart || loading}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded transition-colors">
              {loading ? "Starting..." : canStart ? "START GAME →" : "Need 2+ players to start"}
            </button>
          ) : (
            <div className="w-full py-3 text-center text-gray-500 text-sm border border-gray-800 rounded">
              Waiting for host to start...
            </div>
          )}
          <button onClick={onBack}
            className="w-full py-2 text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Leave Room
          </button>
        </div>

      </div>
    </div>
  );
}