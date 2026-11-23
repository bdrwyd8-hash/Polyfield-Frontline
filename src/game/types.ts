export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type Team = 'allies' | 'axis';

export type MapId = 'forest' | 'desert' | 'normandy' | 'stalingrad';

export type GameMode = 'conquest' | 'tdm' | 'hardcore';

export type GraphicsQuality = 'auto' | 'low' | 'medium' | 'high';

export type TargetFps = 'auto' | 30 | 60 | 120 | 0; // 0 = Uncapped / Max refresh rate

export type LoadoutId = 'rifleman' | 'assault' | 'heavy' | 'marksman';

export type WeaponId =
  | 'ak47'
  | 'm4a1'
  | 'ppsh41'
  | 'm1_garand'
  | 'kar98k'
  | 'thompson'
  | 'mp40'
  | 'stg44'
  | 'bar'
  | 'springfield'
  | 'rpg7'
  | 'bazooka'
  | 'panzerschreck'
  | 'm1911'
  | 'binoculars'
  | 'shovel';

export type WeaponSlotType = 'primary' | 'launcher' | 'sidearm' | 'gadget';

export type OpticAttachmentId =
  | 'iron'
  | 'red_dot'
  | 'holo'
  | 'optic_2x'
  | 'optic_3x'
  | 'scope_4x'
  | 'scope_6x'
  | 'scope_8x';

export type StockAttachmentId =
  | 'standard'
  | 'adjustable'
  | 'compact'
  | 'heavy'
  | 'tactical';

export type GripAttachmentId =
  | 'standard'
  | 'vertical'
  | 'angled'
  | 'compact';

export type MuzzleAttachmentId = 'none' | 'suppressor';

export type RailAttachmentId = 'none' | 'flashlight' | 'laser' | 'tactical_rail';

export type MagazineAttachmentId = 'standard_mag' | 'extended_mag' | 'drum_mag';

export type AttachmentCategory =
  | 'optic'
  | 'stock'
  | 'grip'
  | 'muzzle'
  | 'rail'
  | 'magazine';

export interface WeaponAttachmentLoadout {
  optic: OpticAttachmentId;
  stock: StockAttachmentId;
  grip: GripAttachmentId;
  muzzle: MuzzleAttachmentId;
  rail: RailAttachmentId;
  magazine: MagazineAttachmentId;
}

export type WeaponCustomizationsMap = Partial<Record<WeaponId, WeaponAttachmentLoadout>>;

export type VehicleKind = 'jeep' | 'tank' | 'aircraft' | 'helicopter';

export interface KillcamInfo {
  killerName: string;
  killerTeam: Team;
  killerWeaponId:
    | WeaponId
    | 'tank_cannon'
    | 'aircraft_cannon'
    | 'aircraft_bomb'
    | 'aircraft_missile'
    | 'helicopter_cannon'
    | 'helicopter_rocket'
    | 'grenade';
  killerDistanceM: number;
  killerHp: number;
  killerMaxHp: number;
  killerIsHeadshot: boolean;
}

export type BotRole = 'rusher' | 'defender' | 'marksman';

export type BotAiState = 'advance' | 'hold_cover' | 'retreat_heal' | 'flank';

export type Lang = 'ar' | 'en';

export type Stance = 'stand' | 'walk' | 'crouch' | 'prone' | 'sprint';

export type KeyAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'walk'
  | 'sprint'
  | 'crouch'
  | 'prone'
  | 'jump'
  | 'leanLeft'
  | 'leanRight'
  | 'fire'
  | 'aim'
  | 'reload'
  | 'grenade'
  | 'slot1'
  | 'slot2'
  | 'slot3'
  | 'slot4'
  | 'slot5'
  | 'interact'
  | 'armory'
  | 'toggleAccessory'
  | 'backpack'
  | 'dropBomb'
  | 'fireMissile'
  | 'flare'
  | 'toggleCamera';

export type AircraftThreatWarning = 'none' | 'pull_up' | 'missile' | 'eject';

export type HudControlId =
  | 'joystick'
  | 'fire'
  | 'aim'
  | 'crouch'
  | 'prone'
  | 'sprint'
  | 'walk'
  | 'peekLeft'
  | 'peekRight'
  | 'jump'
  | 'reload'
  | 'grenade'
  | 'slots';

export interface HudControlTransform {
  xPct: number;
  yPct: number;
  scale: number;
}

export interface ControlSettings {
  bindings: Record<KeyAction, string>;
  mouseSensitivity: number;
  adsSensitivity: number;
  fov: number;
  showOnScreenControls: boolean;
  showAimArrow: boolean;
  aimAssistEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  targetFps: TargetFps;
  hudOpacity: number;
  hudLayout: Record<HudControlId, HudControlTransform>;
}

export interface WeaponSpec {
  id: WeaponId;
  slotType: WeaponSlotType;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  damage: number;
  fireInterval: number;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  hipSpread: number;
  adsSpread: number;
  recoilPitch: number;
  recoilYaw: number;
  automatic: boolean;
  adsFov: number;
  muzzleSpeed: number;
  gravityScale: number;
  airDrag: number;
  rangeFalloffStart: number;
  isExplosive?: boolean;
  blastRadius?: number;
}

export interface ObstacleBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  blocksSight: boolean;
}

export interface FoxholeRecord {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export interface CaptureZoneConfig {
  id: string;
  label: string;
  nameEn: string;
  nameAr: string;
  x: number;
  z: number;
  radius: number;
  initialOwner: Team | null;
}

export interface CaptureZoneState {
  id: string;
  label: string;
  nameEn: string;
  nameAr: string;
  x: number;
  z: number;
  radius: number;
  owner: Team | null;
  capturingTeam: Team | null;
  progress: number;
}

export interface KillFeedItem {
  id: number;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weaponId: KillcamInfo['killerWeaponId'];
  isHeadshot: boolean;
  timestamp: number;
}

export interface MinimapActor {
  x: number;
  z: number;
  team: Team;
  isPlayer?: boolean;
  yaw?: number;
  vehicleKind?: VehicleKind;
}

export interface CampaignSubtitleState {
  speakerId: string;
  speakerNameEn: string;
  speakerNameAr: string;
  textEn: string;
  textAr: string;
}

export interface CampaignHudState {
  active: boolean;
  missionId: number;
  actNumber: number;
  titleEn: string;
  titleAr: string;
  objectiveEn: string;
  objectiveAr: string;
  locationEn: string;
  locationAr: string;
  showLetterOverlay: boolean;
  isCutscene: boolean;
  isNonCombat: boolean;
  isPassengerLock: boolean;
  canSkipCutscene: boolean;
  timeLapseTextEn: string | null;
  timeLapseTextAr: string | null;
  subtitle: CampaignSubtitleState | null;
  missionComplete: boolean;
  mudLevel: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  mapId: MapId;
  gameMode: GameMode;
  loadoutId: LoadoutId;
  playerTeam: Team;
  health: number;
  maxHealth: number;
  stamina: number;
  stance: Stance;
  lean: number;
  weaponId: WeaponId;
  slot1Id: WeaponId;
  slot2Id: WeaponId;
  secondaryId: WeaponId;
  activeSlot: 1 | 2 | 3 | 4 | 5;
  activeOptic: OpticAttachmentId;
  activeMuzzle: MuzzleAttachmentId;
  activeRail: RailAttachmentId;
  accessoryActive: boolean;
  magAmmo: number;
  magMax: number;
  reserveAmmo: number;
  grenades: number;
  foxholesUsed: number;
  foxholesMax: number;
  isReloading: boolean;
  reloadProgress: number;
  isAds: boolean;
  isBinocularsActive: boolean;
  showAimArrow: boolean;
  nearResupply: boolean;
  nearArmory: boolean;
  outOfAmmo: boolean;
  resupplyFlash: boolean;
  crosshairSpread: number;
  aimArrowX: number;
  aimArrowY: number;
  aimTargetDist: number;
  alliesTickets: number;
  axisTickets: number;
  maxTickets: number;
  timeRemaining: number;
  zones: CaptureZoneState[];
  activeZoneId: string | null;
  kills: number;
  deaths: number;
  captures: number;
  score: number;
  shotsFired: number;
  shotsHit: number;
  hitmarkerKind: 'none' | 'hit' | 'kill';
  damageFlashAlpha: number;
  damageDirectionRad: number | null;
  pointerLocked: boolean;
  muted: boolean;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  minimapActors: MinimapActor[];
  killFeed: KillFeedItem[];
  winner: Team | 'draw' | null;
  matchElapsed: number;
  respawnTimer: number;
  killcam: KillcamInfo | null;
  nearbyVehicleKind: VehicleKind | null;
  inVehicleKind: VehicleKind | null;
  vehicleHp: number;
  vehicleMaxHp: number;
  vehicleSpeedKmh: number;
  vehicleAmmo: number;
  vehicleAltitudeM: number;
  vehicleReticleX: number;
  vehicleReticleY: number;
  vehicleReticleVisible: boolean;
  aircraftBombs: number;
  aircraftBombsMax: number;
  aircraftMissiles: number;
  aircraftMissilesMax: number;
  aircraftFlares: number;
  aircraftFlaresMax: number;
  aircraftThrottlePct: number;
  aircraftLockActive: boolean;
  aircraftLockTargetName: string | null;
  aircraftThreatWarning: AircraftThreatWarning;
  flightAimX: number;
  flightAimY: number;
  isParachuting: boolean;
  parachuteAltitudeM: number;
  backpackMedkits: number;
  backpackMedkitsMax: number;
  vehicleInteriorCamera: boolean;
  matchDurationSeconds: number;
  mudLevel: number;
  resolvedGraphicsQuality: 'low' | 'medium' | 'high';
  resolvedTargetFps: 0 | 30 | 60 | 120;
  campaign?: CampaignHudState;
}
