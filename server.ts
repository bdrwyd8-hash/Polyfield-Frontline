import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

type Team = 'allies' | 'axis';
type MapId = 'forest' | 'desert' | 'normandy' | 'stalingrad';
type GameMode = 'conquest' | 'tdm' | 'hardcore';

interface FoxholeSync {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

interface RoomPlayer {
  id: string;
  ws: WebSocket;
  name: string;
  team: Team;
  weaponId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  crouching: boolean;
  alive: boolean;
  hp: number;
  kills: number;
  deaths: number;
  animPhase: number;
}

interface RoomState {
  code: string;
  mapId: MapId;
  gameMode: GameMode;
  alliesTickets: number;
  axisTickets: number;
  players: Map<string, RoomPlayer>;
  foxholes: FoxholeSync[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

const rooms = new Map<string, RoomState>();
let nextPlayerSeq = 1;

function sanitizeRoomCode(raw: unknown): string {
  const cleaned = String(raw || 'FRONTLINE')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 14);
  return cleaned || 'FRONTLINE';
}

function sanitizeName(raw: unknown, id: string): string {
  const cleaned = String(raw || '')
    .trim()
    .slice(0, 18);
  return cleaned || `Soldier-${id.slice(1)}`;
}

function getOrCreateRoom(code: string, mapId: MapId, gameMode: GameMode): RoomState {
  let room = rooms.get(code);
  if (!room) {
    const startTickets = gameMode === 'tdm' ? 50 : 250;
    room = {
      code,
      mapId,
      gameMode,
      alliesTickets: startTickets,
      axisTickets: startTickets,
      players: new Map(),
      foxholes: [],
    };
    rooms.set(code, room);
  }
  return room;
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room: RoomState, payload: unknown, excludeId?: string): void {
  const raw = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (excludeId && player.id === excludeId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(raw);
    }
  }
}

function buildRosterPayload(room: RoomState) {
  return {
    type: 'roster',
    roomCode: room.code,
    mapId: room.mapId,
    gameMode: room.gameMode,
    alliesTickets: room.alliesTickets,
    axisTickets: room.axisTickets,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      weaponId: p.weaponId,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      pitch: p.pitch,
      crouching: p.crouching,
      alive: p.alive,
      hp: p.hp,
      kills: p.kills,
      deaths: p.deaths,
      animPhase: p.animPhase,
    })),
    foxholes: room.foxholes,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = sanitizeRoomCode(req.params.code);
    const room = rooms.get(code);
    res.json({
      code,
      exists: Boolean(room),
      playerCount: room ? room.players.size : 0,
      mapId: room?.mapId ?? 'forest',
      gameMode: room?.gameMode ?? 'conquest',
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoom: RoomState | null = null;
    let currentPlayer: RoomPlayer | null = null;

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(rawBuf)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'join') {
        if (currentRoom && currentPlayer) {
          currentRoom.players.delete(currentPlayer.id);
          broadcast(currentRoom, buildRosterPayload(currentRoom));
          if (currentRoom.players.size === 0) rooms.delete(currentRoom.code);
        }

        const roomCode = sanitizeRoomCode(msg.roomCode);
        const reqMap = String(msg.mapId || 'forest') as MapId;
        const mapId: MapId =
          reqMap === 'desert' || reqMap === 'normandy' || reqMap === 'stalingrad'
            ? reqMap
            : 'forest';
        const reqMode = String(msg.gameMode || 'conquest') as GameMode;
        const gameMode: GameMode =
          reqMode === 'tdm' || reqMode === 'hardcore' ? reqMode : 'conquest';

        const room = getOrCreateRoom(roomCode, mapId, gameMode);
        const id = `p${nextPlayerSeq++}`;

        let alliesCount = 0;
        let axisCount = 0;
        for (const p of room.players.values()) {
          if (p.team === 'allies') alliesCount++;
          else axisCount++;
        }
        const preferred = msg.preferredTeam === 'allies' || msg.preferredTeam === 'axis'
          ? msg.preferredTeam
          : null;
        const team: Team = preferred ?? (alliesCount <= axisCount ? 'allies' : 'axis');

        const player: RoomPlayer = {
          id,
          ws,
          name: sanitizeName(msg.name, id),
          team,
          weaponId: String(msg.weaponId || 'm1_garand'),
          x: team === 'allies' ? -126 : 126,
          y: 0,
          z: team === 'allies' ? 44 : -44,
          yaw: team === 'allies' ? -Math.PI * 0.4 : Math.PI * 0.6,
          pitch: 0,
          crouching: false,
          alive: true,
          hp: 100,
          kills: 0,
          deaths: 0,
          animPhase: 0,
        };

        room.players.set(id, player);
        currentRoom = room;
        currentPlayer = player;

        sendJson(ws, {
          type: 'welcome',
          playerId: id,
          team,
          roomCode: room.code,
          mapId: room.mapId,
          gameMode: room.gameMode,
        });
        broadcast(room, buildRosterPayload(room));
        return;
      }

      if (!currentRoom || !currentPlayer) return;

      if (type === 'state') {
        currentPlayer.x = Number(msg.x) || 0;
        currentPlayer.y = Number(msg.y) || 0;
        currentPlayer.z = Number(msg.z) || 0;
        currentPlayer.yaw = Number(msg.yaw) || 0;
        currentPlayer.pitch = Number(msg.pitch) || 0;
        currentPlayer.crouching = Boolean(msg.crouching);
        currentPlayer.alive = msg.alive !== false;
        if (typeof msg.weaponId === 'string') {
          currentPlayer.weaponId = msg.weaponId;
        }
        if (typeof msg.animPhase === 'number') {
          currentPlayer.animPhase = msg.animPhase;
        }
        if (typeof msg.respawned === 'boolean' && msg.respawned) {
          currentPlayer.hp = 100;
          currentPlayer.alive = true;
        }

        broadcast(
          currentRoom,
          {
            type: 'remote_pose',
            id: currentPlayer.id,
            name: currentPlayer.name,
            team: currentPlayer.team,
            weaponId: currentPlayer.weaponId,
            x: currentPlayer.x,
            y: currentPlayer.y,
            z: currentPlayer.z,
            yaw: currentPlayer.yaw,
            pitch: currentPlayer.pitch,
            crouching: currentPlayer.crouching,
            alive: currentPlayer.alive,
            hp: currentPlayer.hp,
            animPhase: currentPlayer.animPhase,
          },
          currentPlayer.id,
        );
        return;
      }

      if (type === 'fire') {
        broadcast(
          currentRoom,
          {
            type: 'remote_fire',
            id: currentPlayer.id,
            team: currentPlayer.team,
            name: currentPlayer.name,
            weaponId: String(msg.weaponId || currentPlayer.weaponId),
            ox: Number(msg.ox) || currentPlayer.x,
            oy: Number(msg.oy) || currentPlayer.y + 1.4,
            oz: Number(msg.oz) || currentPlayer.z,
            vx: Number(msg.vx) || 0,
            vy: Number(msg.vy) || 0,
            vz: Number(msg.vz) || 0,
          },
          currentPlayer.id,
        );
        return;
      }

      if (type === 'hit') {
        const targetId = String(msg.targetId || '');
        const target = currentRoom.players.get(targetId);
        if (!target || !target.alive || target.team === currentPlayer.team) return;

        const dmg = Math.max(1, Math.min(200, Math.round(Number(msg.dmg) || 0)));
        const isHead = Boolean(msg.isHead);
        const weaponId = String(msg.weaponId || currentPlayer.weaponId);
        target.hp = Math.max(0, target.hp - dmg);

        sendJson(target.ws, {
          type: 'damaged',
          amount: dmg,
          newHp: target.hp,
          attackerId: currentPlayer.id,
          attackerName: currentPlayer.name,
          attackerTeam: currentPlayer.team,
          weaponId,
          fromX: Number(msg.fx) || currentPlayer.x,
          fromZ: Number(msg.fz) || currentPlayer.z,
        });

        if (target.hp <= 0) {
          target.alive = false;
          target.deaths += 1;
          currentPlayer.kills += 1;
          const cost = currentRoom.gameMode === 'tdm' ? 1 : 2;
          if (target.team === 'axis') {
            currentRoom.axisTickets = Math.max(0, currentRoom.axisTickets - cost);
          } else {
            currentRoom.alliesTickets = Math.max(0, currentRoom.alliesTickets - cost);
          }
          broadcast(currentRoom, {
            type: 'player_killed',
            killerId: currentPlayer.id,
            killerName: currentPlayer.name,
            killerTeam: currentPlayer.team,
            victimId: target.id,
            victimName: target.name,
            victimTeam: target.team,
            weaponId,
            isHeadshot: isHead,
            alliesTickets: currentRoom.alliesTickets,
            axisTickets: currentRoom.axisTickets,
          });
        }
        return;
      }

      if (type === 'foxhole') {
        const hole: FoxholeSync = {
          x: Number(msg.x) || 0,
          z: Number(msg.z) || 0,
          radius: Math.max(1.5, Math.min(3.5, Number(msg.radius) || 2.5)),
          depth: Math.max(0.5, Math.min(1.6, Number(msg.depth) || 1.15)),
        };
        currentRoom.foxholes.push(hole);
        if (currentRoom.foxholes.length > 12) {
          currentRoom.foxholes.shift();
        }
        broadcast(currentRoom, { type: 'foxhole', ...hole }, currentPlayer.id);
      }
    });

    ws.on('close', () => {
      if (currentRoom && currentPlayer) {
        currentRoom.players.delete(currentPlayer.id);
        if (currentRoom.players.size === 0) {
          rooms.delete(currentRoom.code);
        } else {
          broadcast(currentRoom, buildRosterPayload(currentRoom));
        }
      }
      currentRoom = null;
      currentPlayer = null;
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Polyfield Frontline server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
