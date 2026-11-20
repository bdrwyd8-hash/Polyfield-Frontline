import type {
  FoxholeRecord,
  GameMode,
  MapId,
  MultiplayerStatus,
  RemotePlayerSnapshot,
  Team,
  WeaponId,
} from './types';

export interface MultiplayerCallbacks {
  onStatusChange: (status: MultiplayerStatus, playerCount: number) => void;
  onWelcome: (info: {
    playerId: string;
    team: Team;
    roomCode: string;
    mapId: MapId;
    gameMode: GameMode;
  }) => void;
  onRoster: (info: {
    players: RemotePlayerSnapshot[];
    foxholes: FoxholeRecord[];
    alliesTickets: number;
    axisTickets: number;
  }) => void;
  onRemotePose: (pose: RemotePlayerSnapshot) => void;
  onRemoteFire: (ev: {
    id: string;
    team: Team;
    name: string;
    weaponId: WeaponId;
    ox: number;
    oy: number;
    oz: number;
    vx: number;
    vy: number;
    vz: number;
  }) => void;
  onDamaged: (ev: {
    amount: number;
    attackerName: string;
    attackerTeam: Team;
    weaponId: WeaponId;
    fromX: number;
    fromZ: number;
  }) => void;
  onPlayerKilled: (ev: {
    killerId: string;
    killerName: string;
    killerTeam: Team;
    victimId: string;
    victimName: string;
    victimTeam: Team;
    weaponId: WeaponId;
    isHeadshot: boolean;
    alliesTickets: number;
    axisTickets: number;
  }) => void;
  onFoxhole: (hole: FoxholeRecord) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private status: MultiplayerStatus = 'offline';
  private localId = '';
  private playerCount = 0;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public getStatus(): MultiplayerStatus {
    return this.status;
  }

  public getLocalId(): string {
    return this.localId;
  }

  public getPlayerCount(): number {
    return this.playerCount;
  }

  public connect(params: {
    roomCode: string;
    name: string;
    mapId: MapId;
    gameMode: GameMode;
    weaponId: WeaponId;
    preferredTeam?: Team | null;
  }): void {
    this.disconnect();
    this.status = 'connecting';
    this.callbacks.onStatusChange('connecting', 0);

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;
      ws.send(
        JSON.stringify({
          type: 'join',
          roomCode: params.roomCode,
          name: params.name,
          mapId: params.mapId,
          gameMode: params.gameMode,
          weaponId: params.weaponId,
          preferredTeam: params.preferredTeam ?? null,
        }),
      );
    });

    ws.addEventListener('message', (evt) => {
      if (this.ws !== ws) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'welcome') {
        this.localId = String(msg.playerId || '');
        this.status = 'connected';
        this.callbacks.onWelcome({
          playerId: this.localId,
          team: msg.team === 'axis' ? 'axis' : 'allies',
          roomCode: String(msg.roomCode || params.roomCode),
          mapId: (msg.mapId as MapId) || params.mapId,
          gameMode: (msg.gameMode as GameMode) || params.gameMode,
        });
        this.callbacks.onStatusChange('connected', Math.max(1, this.playerCount));
      } else if (type === 'roster') {
        const players = Array.isArray(msg.players)
          ? (msg.players as RemotePlayerSnapshot[])
          : [];
        this.playerCount = players.length;
        this.callbacks.onStatusChange(this.status, this.playerCount);
        this.callbacks.onRoster({
          players,
          foxholes: Array.isArray(msg.foxholes) ? (msg.foxholes as FoxholeRecord[]) : [],
          alliesTickets: Number(msg.alliesTickets) || 250,
          axisTickets: Number(msg.axisTickets) || 250,
        });
      } else if (type === 'remote_pose') {
        this.callbacks.onRemotePose(msg as unknown as RemotePlayerSnapshot);
      } else if (type === 'remote_fire') {
        this.callbacks.onRemoteFire({
          id: String(msg.id || ''),
          team: msg.team === 'axis' ? 'axis' : 'allies',
          name: String(msg.name || 'Soldier'),
          weaponId: (msg.weaponId as WeaponId) || 'm1_garand',
          ox: Number(msg.ox) || 0,
          oy: Number(msg.oy) || 0,
          oz: Number(msg.oz) || 0,
          vx: Number(msg.vx) || 0,
          vy: Number(msg.vy) || 0,
          vz: Number(msg.vz) || 0,
        });
      } else if (type === 'damaged') {
        this.callbacks.onDamaged({
          amount: Number(msg.amount) || 0,
          attackerName: String(msg.attackerName || 'Enemy'),
          attackerTeam: msg.attackerTeam === 'allies' ? 'allies' : 'axis',
          weaponId: (msg.weaponId as WeaponId) || 'm1_garand',
          fromX: Number(msg.fromX) || 0,
          fromZ: Number(msg.fromZ) || 0,
        });
      } else if (type === 'player_killed') {
        this.callbacks.onPlayerKilled({
          killerId: String(msg.killerId || ''),
          killerName: String(msg.killerName || ''),
          killerTeam: msg.killerTeam === 'axis' ? 'axis' : 'allies',
          victimId: String(msg.victimId || ''),
          victimName: String(msg.victimName || ''),
          victimTeam: msg.victimTeam === 'axis' ? 'axis' : 'allies',
          weaponId: (msg.weaponId as WeaponId) || 'm1_garand',
          isHeadshot: Boolean(msg.isHeadshot),
          alliesTickets: Number(msg.alliesTickets) || 0,
          axisTickets: Number(msg.axisTickets) || 0,
        });
      } else if (type === 'foxhole') {
        this.callbacks.onFoxhole({
          x: Number(msg.x) || 0,
          z: Number(msg.z) || 0,
          radius: Number(msg.radius) || 2.5,
          depth: Number(msg.depth) || 1.15,
        });
      }
    });

    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.status = 'offline';
      this.playerCount = 0;
      this.callbacks.onStatusChange('offline', 0);
    });

    ws.addEventListener('error', () => {
      if (this.ws !== ws) return;
      this.status = 'offline';
      this.callbacks.onStatusChange('offline', 0);
    });
  }

  public sendPose(pose: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    crouching: boolean;
    alive: boolean;
    weaponId: WeaponId;
    animPhase: number;
    respawned?: boolean;
  }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'state', ...pose }));
    }
  }

  public sendFire(ev: {
    weaponId: WeaponId;
    ox: number;
    oy: number;
    oz: number;
    vx: number;
    vy: number;
    vz: number;
  }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'fire', ...ev }));
    }
  }

  public sendHit(ev: {
    targetId: string;
    dmg: number;
    isHead: boolean;
    weaponId: WeaponId;
    fx: number;
    fz: number;
  }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'hit', ...ev }));
    }
  }

  public sendFoxhole(hole: FoxholeRecord): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'foxhole', ...hole }));
    }
  }

  public disconnect(): void {
    const prev = this.ws;
    this.ws = null;
    this.localId = '';
    this.status = 'offline';
    this.playerCount = 0;
    if (prev) {
      try {
        prev.close();
      } catch {
        // ignore
      }
    }
    this.callbacks.onStatusChange('offline', 0);
  }
}
