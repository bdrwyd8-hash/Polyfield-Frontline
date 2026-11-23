import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  animateSoldierExpression,
  createBattleTank,
  createCombatAircraft,
  createCombatHelicopter,
  createFirstPersonWeaponRig,
  createFoxholeVisual,
  createLowPolySoldier,
  createMilitaryJeep,
  createParachuteCanopy,
  setSoldierMudLevel,
  type BattleTankRig,
  type CombatAircraftRig,
  type CombatHelicopterRig,
  type FirstPersonWeaponRig,
  type MilitaryJeepRig,
  type SoldierRig,
} from './models';
import {
  computeWeaponWithAttachments,
  loadCareerProgress,
  loadWeaponCustomizations,
  saveCareerProgress,
  type CareerProgress,
  type EffectiveWeaponStats,
} from './attachments';
import {
  CAMPAIGN_CAST,
  getCampaignMission,
  type CampaignDialogueBeat,
  type CampaignMissionSpec,
} from './campaignData';
import {
  applyCampaignWeather,
  buildCampaignSet,
  type CampaignSetHandle,
} from './campaignWorld';
import {
  ALLY_AIRFIELD_CENTER,
  ARENA_RADIUS,
  AXIS_AIRFIELD_CENTER,
  LOADOUT_PRIMARY,
  MATCH_DURATION_SECONDS,
  MAX_PLAYER_FOXHOLES,
  MAX_TICKETS,
  TDM_MAX_TICKETS,
  WEAPONS,
  calculateTicketBleed,
  checkMatchOutcome,
  chooseBotTacticalAction,
  computeBallisticDrop,
  computeDirectionalDeathPose,
  computeFlightInstructorInputs,
  computeHitDamage,
  computeLightAimAssist,
  computeWeaponWallTuck,
  createInitialZones,
  evaluateAircraftThreats,
  groundHeightAt,
  groundNormalAt,
  intersectObstaclesRay,
  isPointBlockedByObstacles,
  resolveAutoGraphicsConfig,
  resolveCircleEntities,
  resolveCircleObstacles,
  steerAroundObstacles,
  stepBallisticProjectile,
  stepBombDrop,
  stepCaptureZone,
  stepFlightPhysics,
  stepHelicopterPhysics,
  stepMissileHoming,
  stepParachutePhysics,
  stepSuspensionArticulation,
  stepVehicleDriving,
  testSoldierHitbox,
  type AimAssistCandidate,
  type AutoHardwareCapabilities,
  type HelicopterFlightState,
  type SuspensionState,
} from './rules';
import { applyTextureAnisotropy, getGunmetalPbrSet } from './pbrTextures';
import { DEFAULT_SETTINGS } from './settings';
import type {
  AircraftThreatWarning,
  BotAiState,
  BotRole,
  CampaignHudState,
  CampaignSubtitleState,
  CaptureZoneState,
  ControlSettings,
  FoxholeRecord,
  GameMode,
  GamePhase,
  GraphicsQuality,
  HudSnapshot,
  KeyAction,
  KillFeedItem,
  KillcamInfo,
  LoadoutId,
  MapId,
  MinimapActor,
  Stance,
  Team,
  VehicleKind,
  WeaponCustomizationsMap,
  WeaponId,
  WeaponSpec,
} from './types';
import { buildBattlefieldWorld, type BuiltWorld } from './world';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

interface BotEntity {
  id: number;
  name: string;
  team: Team;
  role: BotRole;
  rig: SoldierRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  crouching: boolean;
  koTimer: number;
  koVx: number;
  koVz: number;
  koFallDir: number;
  respawnTimer: number;
  fireCooldown: number;
  telegraphTimer: number;
  hitFlashTimer: number;
  seekCoverTimer: number;
  coverX: number;
  coverZ: number;
  targetZoneIdx: number;
  strafeDir: number;
  strafeTimer: number;
  walkPhase: number;
  muzzleTimer: number;
  aiState: BotAiState;
  healTimer: number;
  spottedTimer: number;
  stuckCheckTimer: number;
  lastCheckX: number;
  lastCheckZ: number;
  detourTimer: number;
  detourDir: number;
  weaponPitch: number;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  gravity: number;
}

interface BallisticBullet {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravityScale: number;
  airDrag: number;
  life: number;
  distTraveled: number;
  ownerTeam: Team;
  ownerName: string;
  fromPlayer: boolean;
  weaponId: WeaponId;
  isExplosive: boolean;
  color: number;
}

interface ShellCasing {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  life: number;
  grounded: boolean;
}

interface AmbientMote {
  ox: number;
  oy: number;
  oz: number;
  phase: number;
  speed: number;
  size: number;
}

interface GrenadeEntity {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuse: number;
}

interface ExplosionVfx {
  active: boolean;
  life: number;
  maxLife: number;
  radius: number;
  fireball: THREE.Mesh;
  fireballMat: THREE.MeshBasicMaterial;
  shockwave: THREE.Mesh;
  shockMat: THREE.MeshBasicMaterial;
}

interface GroundVehicleEntity {
  id: number;
  kind: 'jeep' | 'tank';
  team: Team;
  rig: MilitaryJeepRig | BattleTankRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  turretYaw: number;
  gunPitch: number;
  speed: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  fireCooldown: number;
  muzzleTimer: number;
  wheelSpin: number;
  steerAngle: number;
  barrelRecoil: number;
  patrolPhase: number;
  patrolCenterX: number;
  patrolCenterZ: number;
  occupantIsPlayer: boolean;
  ammo: number;
  maxAmmo: number;
  suspension: SuspensionState;
  prevSpeed: number;
}

interface CombatAircraftEntity {
  id: number;
  variant: 'fighter' | 'attacker';
  team: Team;
  rig: CombatAircraftRig;
  mode: 'parked' | 'ai_orbit' | 'player' | 'abandoned' | 'crashing';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  vy: number;
  orbitAngle: number;
  orbitRadius: number;
  centerOffsetZ: number;
  altitude: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  fireCooldown: number;
  rocketCooldown: number;
  bombCooldown: number;
  bombsLeft: number;
  bombsMax: number;
  missilesLeft: number;
  missilesMax: number;
  flaresLeft: number;
  flaresMax: number;
  throttlePct: number;
  muzzleTimer: number;
  ammo: number;
  maxAmmo: number;
  bankRoll: number;
  homeX: number;
  homeZ: number;
  homeYaw: number;
  smokeAccum: number;
  crashKillerName: string;
  crashKillerTeam: Team;
  crashWeaponId: KillcamInfo['killerWeaponId'];
}

interface AirBombEntity {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ownerTeam: Team;
  ownerName: string;
  fromPlayer: boolean;
  life: number;
}

interface HomingMissileEntity {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetAircraftId: number | null;
  targetVehicleId: number | null;
  divertedByFlare: boolean;
  ownerTeam: Team;
  ownerName: string;
  fromPlayer: boolean;
  life: number;
  smokeAccum: number;
}

interface FlareDecoyEntity {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  smokeAccum: number;
}

interface CombatHelicopterEntity {
  id: number;
  team: Team;
  rig: CombatHelicopterRig;
  mode: 'parked' | 'ai_orbit' | 'player' | 'crashing';
  flight: HelicopterFlightState;
  orbitAngle: number;
  orbitRadius: number;
  centerOffsetZ: number;
  altitude: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  fireCooldown: number;
  rocketCooldown: number;
  rocketsLeft: number;
  rocketsMax: number;
  flaresLeft: number;
  flaresMax: number;
  ammo: number;
  maxAmmo: number;
  muzzleTimer: number;
  homeX: number;
  homeZ: number;
  homeYaw: number;
  smokeAccum: number;
  crashKillerName: string;
  crashKillerTeam: Team;
}

interface PooledSmokePuff {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  baseOpacity: number;
}

interface CampaignCastActor {
  id: string;
  rig: SoldierRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  seatIndex: number;
  blinkTimer: number;
  nextBlinkAt: number;
  speakPhase: number;
}

const ALLY_NAMES = [
  'Sgt. Miller',
  'Cpl. Reyes',
  'Pvt. Vance',
  'Lt. Mercer',
  'Pvt. Brooks',
  'Cpl. Kowalski',
  'Sgt. Hayes',
  'Pvt. Grant',
];

const AXIS_NAMES = [
  'Kpt. Weber',
  'Obg. Richter',
  'Sdt. Vogel',
  'Uffz. Becker',
  'Sdt. Keller',
  'Gfr. Braun',
  'Fhr. Hartmann',
  'Sdt. Neumann',
];

const MAX_PARTICLES = 480;
const MAX_SMOKE_PUFFS = 96;
const MAX_EXPLOSIONS = 12;
const MAX_BULLETS = 128;
const MAX_CASINGS = 96;
const MAX_AMBIENT = 120;

export class PolyfieldEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private fpScene: THREE.Scene;
  private fpCamera: THREE.PerspectiveCamera;
  private fpHemiLight: THREE.HemisphereLight;
  private fpSunLight: THREE.DirectionalLight;
  private worldFlashlight: THREE.SpotLight;
  private worldFlashlightTarget = new THREE.Object3D();
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyGeo: THREE.SphereGeometry;
  private skyMat: THREE.MeshBasicMaterial;
  private skyDome: THREE.Mesh;
  private sound = new SoundEngine();
  private isSoftwareGl: boolean;

  private world: BuiltWorld | null = null;
  private mapId: MapId = 'forest';
  private gameMode: GameMode = 'conquest';
  private loadoutId: LoadoutId = 'rifleman';
  private selectedSlot1Id: WeaponId = 'm1_garand';
  private selectedSlot2Id: WeaponId = 'bazooka';
  private phase: GamePhase = 'title';
  private settings: ControlSettings = {
    ...DEFAULT_SETTINGS,
    bindings: { ...DEFAULT_SETTINGS.bindings },
  };

  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;
  private lastRenderTimestamp = 0;
  private hudEmitAccum = 0;
  private hitstopTimer = 0;
  private weaponCustomizations: WeaponCustomizationsMap = loadWeaponCustomizations();
  private careerProgress: CareerProgress = loadCareerProgress();
  private accessoryActive = false;
  private lastKillcam: KillcamInfo | null = null;
  private killerEntityPos: { x: number; y: number; z: number } | null = null;
  private onArmoryRequest: (() => void) | null = null;

  // Player physical movement & stance state
  private playerX = -126;
  private playerY = 0;
  private playerZ = 44;
  private playerVx = 0;
  private playerVy = 0;
  private playerVz = 0;
  private playerGrounded = true;
  private playerYaw = 0;
  private playerPitch = -0.02;
  private playerEyeHeight = 1.66;
  private landingDip = 0;
  private playerLean = 0;
  private playerHealth = 100;
  private readonly playerMaxHealth = 100;
  private playerStamina = 100;
  private stanceMode: 'stand' | 'crouch' | 'prone' = 'stand';
  private walkToggle = false;
  private playerAlive = true;
  private playerRespawnTimer = 0;
  private playerStepAccum = 0;
  private weaponBobPhase = 0;

  // Weapon sway, bolt blowback, gait tilt & recoil springs
  private weaponSwayYaw = 0;
  private weaponSwayPitch = 0;
  private weaponStrafeBank = 0;
  private cameraRoll = 0;
  private sprintBlend = 0;
  private crouchBlend = 0;
  private prevPlayerYaw = 0;
  private breathPhase = 0;
  private boltKick = 0;

  // 5-Slot Weapon & Gadget System (1=Primary, 2=Primary2/Launcher, 3=Sidearm, 4=Binoculars, 5=Shovel)
  private activeSlot: 1 | 2 | 3 | 4 | 5 = 1;
  private slot1Id: WeaponId = 'm1_garand';
  private slot2Id: WeaponId = 'bazooka';
  private secondaryId: WeaponId = 'm1911';
  private slotAmmo: Record<1 | 2 | 3, { mag: number; reserve: number }> = {
    1: { mag: 8, reserve: 72 },
    2: { mag: 1, reserve: 5 },
    3: { mag: 7, reserve: 56 },
  };
  private grenadesCount = 2;
  private fireCooldown = 0;
  private reloadTimer = 0;
  private isReloading = false;
  private isAds = false;
  private isBinocularsZoomed = false;
  private adsBlend = 0;
  private recoilPitchOffset = 0;
  private recoilRollOffset = 0;
  private recoilKickZ = 0;
  private fpMuzzleTimer = 0;
  private shovelSwingTimer = 0;
  private fpRig: FirstPersonWeaponRig | null = null;
  private weaponHolder = new THREE.Group();

  private foxholes: FoxholeRecord[] = [];
  private foxholeGroups: THREE.Group[] = [];
  private digPreviewMesh: THREE.Mesh;
  private digPreviewMat: THREE.MeshBasicMaterial;

  private playerTeam: Team = 'allies';

  private deathTimer = 0;
  private deathStartEye = 1.66;

  private aimArrowX = 0;
  private aimArrowY = 0;
  private aimTargetDist = 60;

  // Conquest / TDM / Hardcore match stats
  private zones: CaptureZoneState[] = [];
  private matchDurationSeconds = MATCH_DURATION_SECONDS;
  private alliesTickets = MAX_TICKETS;
  private axisTickets = MAX_TICKETS;
  private timeRemaining = MATCH_DURATION_SECONDS;
  private matchElapsed = 0;
  private winner: Team | 'draw' | null = null;
  private kills = 0;
  private deaths = 0;
  private captures = 0;
  private score = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private resupplyAccum = 0;
  private resupplyFlashTimer = 0;

  private hardwareCaps: AutoHardwareCapabilities = {
    isSoftwareGl: false,
    maxTextureSize: 4096,
    hardwareConcurrency: 4,
    deviceMemory: 4,
  };
  private resolvedGraphicsQuality: 'low' | 'medium' | 'high' = 'medium';
  private resolvedTargetFps: 30 | 60 | 120 | 0 = 60;
  private resolvedAutoFps: 30 | 60 | 120 = 60;

  private cameraTrauma = 0;
  private hitmarkerKind: 'none' | 'hit' | 'kill' = 'none';
  private hitmarkerTimer = 0;
  private damageFlashAlpha = 0;
  private damageDirectionRad: number | null = null;
  private killFeed: KillFeedItem[] = [];
  private nextKillFeedId = 1;

  private bots: BotEntity[] = [];
  private groundVehicles: GroundVehicleEntity[] = [];
  private aircrafts: CombatAircraftEntity[] = [];
  private helicopters: CombatHelicopterEntity[] = [];
  private activeVehicle: GroundVehicleEntity | null = null;
  private nearbyVehicle: GroundVehicleEntity | null = null;
  private activeAircraft: CombatAircraftEntity | null = null;
  private nearbyAircraft: CombatAircraftEntity | null = null;
  private activeHelicopter: CombatHelicopterEntity | null = null;
  private nearbyHelicopter: CombatHelicopterEntity | null = null;
  private vehicleInteriorCamera = false;
  private vehicleReticleX = 0;
  private vehicleReticleY = 0;
  private vehicleReticleVisible = false;
  private flightAimYaw = 0;
  private flightAimPitch = 0;
  private flightAimX = 0;
  private flightAimY = 0;
  private aircraftLockTargetName: string | null = null;
  private aircraftLockTargetAcId: number | null = null;
  private aircraftLockTargetVehId: number | null = null;
  private lockToneAccum = 0;
  private airBombs: AirBombEntity[] = [];
  private homingMissiles: HomingMissileEntity[] = [];
  private activeFlares: FlareDecoyEntity[] = [];
  private flareGeo = new THREE.SphereGeometry(0.22, 10, 8);
  private flareMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  private flareHaloGeo = new THREE.SphereGeometry(0.56, 10, 8);
  private flareHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  private aircraftThreatWarning: AircraftThreatWarning = 'none';
  private cameraSnapPending = true;
  private camLookTarget = new THREE.Vector3();
  private wallTuckFactor = 0;
  private isParachuting = false;
  private parachuteSwayPhase = 0;
  private parachuteMesh: THREE.Group | null = null;
  private smokeTexture: THREE.CanvasTexture | null = null;
  private smokePuffs: PooledSmokePuff[] = [];
  private smokeCursor = 0;

  // Story Campaign state ("ON THE FRONTLINE — JORDAN")
  private campaignMode = false;
  private campaignMission: CampaignMissionSpec | null = null;
  private campaignSet: CampaignSetHandle | null = null;
  private campaignCastActors: CampaignCastActor[] = [];
  private campaignConvoyFlyovers: Array<{ rig: CombatAircraftRig; x: number; y: number; z: number; vx: number; vz: number }> = [];
  private campaignLetterPending = false;
  private campaignTriggeredBeatIds = new Set<string>();
  private campaignActiveSubtitle: CampaignSubtitleState | null = null;
  private campaignActiveSubtitleEnd = 0;
  private campaignActiveSpeakerId: string | null = null;
  private campaignBlastFired = false;
  private campaignObjectiveDone = false;
  private campaignMissionComplete = false;
  private campaignTimeLapseTextEn: string | null = null;
  private campaignTimeLapseTextAr: string | null = null;
  private campaignTimeLapseTimer = 0;
  private playerMudLevel = 0;
  private campaignElapsed = 0;
  private campaignRoadLoopOffset = 0;
  private backpackMedkits = 2;
  private readonly backpackMedkitsMax = 2;
  private grenades: GrenadeEntity[] = [];
  private grenadeGeo = new THREE.SphereGeometry(0.125, 14, 10);
  private grenadeMat = (() => {
    const gun = getGunmetalPbrSet();
    return new THREE.MeshStandardMaterial({
      color: 0x3b4d32,
      roughness: 0.56,
      metalness: 0.42,
      bumpMap: gun.bumpMap,
      bumpScale: 0.014,
      roughnessMap: gun.roughnessMap,
    });
  })();

  private particles: PooledParticle[] = [];
  private particleCursor = 0;
  private particleMesh: THREE.InstancedMesh;

  private explosions: ExplosionVfx[] = [];
  private explosionCursor = 0;
  private explosionSphereGeo = new THREE.SphereGeometry(1, 14, 10);
  private explosionRingGeo = new THREE.RingGeometry(0.84, 1.0, 28);

  private bullets: BallisticBullet[] = [];
  private bulletCursor = 0;
  private bulletMesh: THREE.InstancedMesh;

  private casings: ShellCasing[] = [];
  private casingCursor = 0;
  private casingMesh: THREE.InstancedMesh;

  private ambientMotes: AmbientMote[] = [];
  private ambientMesh: THREE.InstancedMesh;

  private rayDir = new THREE.Vector3();
  private rayOrigin = new THREE.Vector3();

  // Multi-touch & keyboard unified input hub
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private virtualHeld = new Set<KeyAction>();
  private virtualJustPressed = new Set<KeyAction>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private mouseDownLeft = false;
  private mouseJustPressedLeft = false;
  private mouseDownRight = false;
  private pointerLocked = false;
  private lookPointerId: number | null = null;
  private lookMovedDist = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private titleTourTime = 0;

  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    initialSettings?: ControlSettings,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    if (initialSettings) {
      this.settings = {
        ...initialSettings,
        bindings: { ...initialSettings.bindings },
      };
    }

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
      const nav = navigator as Navigator & { deviceMemory?: number };
      this.hardwareCaps = {
        isSoftwareGl: /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu),
        maxTextureSize: maxTex,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 4,
      };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return this.hardwareCaps.isSoftwareGl;
    })();
    if (this.hardwareCaps.isSoftwareGl) {
      this.hardwareCaps = { ...this.hardwareCaps, isSoftwareGl: true };
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, w / h, 0.08, 1450);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // Isolated 1P viewmodel overlay scene: renders after depth clear so weapons/hands NEVER clip walls, trees or vehicles
    this.fpScene = new THREE.Scene();
    this.fpCamera = new THREE.PerspectiveCamera(this.settings.fov, w / h, 0.014, 15);
    this.fpCamera.rotation.order = 'YXZ';
    this.fpScene.add(this.fpCamera);
    this.fpCamera.add(this.weaponHolder);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.fpScene.environment = envTex;
    pmrem.dispose();

    this.fpHemiLight = new THREE.HemisphereLight(0xcbe6ff, 0x5c5346, 0.9);
    this.fpSunLight = new THREE.DirectionalLight(0xfff1d6, 1.8);
    this.fpSunLight.position.set(12, 20, 10);
    this.fpScene.add(this.fpHemiLight, this.fpSunLight);

    this.worldFlashlight = new THREE.SpotLight(0xfff4d6, 2.8, 34, Math.PI * 0.22, 0.52, 1.3);
    this.worldFlashlight.position.set(0.16, -0.1, -0.35);
    this.worldFlashlightTarget.position.set(0, -0.06, -14);
    this.camera.add(this.worldFlashlight, this.worldFlashlightTarget);
    this.worldFlashlight.target = this.worldFlashlightTarget;
    this.worldFlashlight.visible = false;

    this.renderer.autoClear = false;

    this.skyGeo = new THREE.SphereGeometry(980, 32, 20);
    const skyCount = this.skyGeo.attributes.position.count;
    this.skyGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(skyCount * 3), 3));
    this.skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(this.skyGeo, this.skyMat);
    this.skyDome.frustumCulled = false;
    this.scene.add(this.skyDome);

    this.hemiLight = new THREE.HemisphereLight(0xbbe0ff, 0x5c5346, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.9);
    this.sunLight.position.set(62, 96, 42);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 88;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 230;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xa5c4e8, 0.44);
    this.rimLight.position.set(-70, 38, -60);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);

    this.applyGraphicsQuality(this.settings.graphicsQuality);

    const pGeo = new THREE.IcosahedronGeometry(0.45, 1);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.1,
        color: 0xffffff,
        gravity: 9.8,
      });
      _mat.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.scene.add(this.particleMesh);

    this.explosionRingGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      const fireballMat = new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const fireball = new THREE.Mesh(this.explosionSphereGeo, fireballMat);
      fireball.visible = false;

      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shockwave = new THREE.Mesh(this.explosionRingGeo, shockMat);
      shockwave.visible = false;

      this.scene.add(fireball, shockwave);
      this.explosions.push({
        active: false,
        life: 0,
        maxLife: 0.55,
        radius: 6,
        fireball,
        fireballMat,
        shockwave,
        shockMat,
      });
    }

    // Pointed copper/brass spitzer projectile (zero laser beams)
    const spitzerPts = [
      new THREE.Vector2(0.002, 0.095),
      new THREE.Vector2(0.015, 0.036),
      new THREE.Vector2(0.024, -0.022),
      new THREE.Vector2(0.021, -0.088),
      new THREE.Vector2(0.004, -0.098),
    ];
    const bGeo = new THREE.LatheGeometry(spitzerPts, 8);
    bGeo.rotateX(Math.PI / 2);
    const bMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.74,
      emissive: 0x78350f,
      emissiveIntensity: 0.36,
    });
    this.bulletMesh = new THREE.InstancedMesh(bGeo, bMat, MAX_BULLETS);
    this.bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bulletMesh.frustumCulled = false;
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravityScale: 1,
        airDrag: 0.15,
        life: 0,
        distTraveled: 0,
        ownerTeam: 'allies',
        ownerName: '',
        fromPlayer: false,
        weaponId: 'm1_garand',
        isExplosive: false,
        color: 0xe8b85a,
      });
      _mat.makeScale(0, 0, 0);
      this.bulletMesh.setMatrixAt(i, _mat);
      this.bulletMesh.setColorAt(i, _color.setHex(0xe8b85a));
    }
    this.scene.add(this.bulletMesh);

    const cGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.036, 6);
    const cMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.9,
    });
    this.casingMesh = new THREE.InstancedMesh(cGeo, cMat, MAX_CASINGS);
    this.casingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.casingMesh.frustumCulled = false;
    for (let i = 0; i < MAX_CASINGS; i++) {
      this.casings.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        life: 0,
        grounded: false,
      });
      _mat.makeScale(0, 0, 0);
      this.casingMesh.setMatrixAt(i, _mat);
    }
    this.scene.add(this.casingMesh);

    // Ambient environmental dust / pollen / sand motes
    const aGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const aMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
    });
    this.ambientMesh = new THREE.InstancedMesh(aGeo, aMat, MAX_AMBIENT);
    this.ambientMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ambientMesh.frustumCulled = false;
    for (let i = 0; i < MAX_AMBIENT; i++) {
      this.ambientMotes.push({
        ox: (Math.random() - 0.5) * 44,
        oy: Math.random() * 10 - 1,
        oz: (Math.random() - 0.5) * 44,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.1,
        size: 0.5 + Math.random() * 0.9,
      });
    }
    this.scene.add(this.ambientMesh);

    // Shovel ground target reticle ring (shown while holding Entrenching Shovel slot 5)
    const digRingGeo = new THREE.RingGeometry(0.9, 1.12, 28);
    digRingGeo.rotateX(-Math.PI / 2);
    this.digPreviewMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.digPreviewMesh = new THREE.Mesh(digRingGeo, this.digPreviewMat);
    this.digPreviewMesh.visible = false;
    this.scene.add(this.digPreviewMesh);

    // Pooled translucent billowing smoke puffs (replaces dense opaque dots at muzzle & explosions)
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 96;
    smokeCanvas.height = 96;
    const smCtx = smokeCanvas.getContext('2d')!;
    const sGrad = smCtx.createRadialGradient(48, 48, 4, 48, 48, 46);
    sGrad.addColorStop(0, 'rgba(255,255,255,0.82)');
    sGrad.addColorStop(0.45, 'rgba(235,235,235,0.42)');
    sGrad.addColorStop(1, 'rgba(210,210,210,0)');
    smCtx.fillStyle = sGrad;
    smCtx.fillRect(0, 0, 96, 96);
    this.smokeTexture = new THREE.CanvasTexture(smokeCanvas);
    for (let i = 0; i < MAX_SMOKE_PUFFS; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.smokePuffs.push({
        sprite,
        mat,
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        startSize: 0.4,
        endSize: 1.8,
        baseOpacity: 0.45,
      });
    }

    this.rebuildWorldAndMatch('forest', 'rifleman', 'm1_garand', 'bazooka');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.emitHud();

    this.lastTimestamp = performance.now();
    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fpCamera.aspect = w / h;
    this.fpCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private applyGraphicsQuality(qualitySetting: GraphicsQuality): void {
    const autoCfg = resolveAutoGraphicsConfig(this.hardwareCaps);
    this.resolvedAutoFps = autoCfg.fps;
    const resolvedQ = qualitySetting === 'auto' ? autoCfg.quality : qualitySetting;
    this.resolvedGraphicsQuality = resolvedQ;

    const fpsPref = this.settings.targetFps;
    this.resolvedTargetFps = fpsPref === 'auto' ? autoCfg.fps : fpsPref;

    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      applyTextureAnisotropy(1);
      return;
    }
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (resolvedQ === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      applyTextureAnisotropy(1);
    } else if (resolvedQ === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      applyTextureAnisotropy(Math.min(4, maxAniso));
      if (this.sunLight.shadow.mapSize.width !== 1024) {
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      applyTextureAnisotropy(Math.min(8, maxAniso));
      if (this.sunLight.shadow.mapSize.width !== 2048) {
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
    }
  }

  public setControlSettings(next: ControlSettings): void {
    this.settings = {
      ...next,
      bindings: { ...next.bindings },
    };
    this.applyGraphicsQuality(this.settings.graphicsQuality);
    this.emitHud();
  }

  public setMatchDuration(seconds: number): void {
    const safeSec = Math.max(120, Math.min(1800, Math.round(seconds)));
    this.matchDurationSeconds = safeSec;
    if (this.phase === 'title') {
      this.timeRemaining = safeSec;
    }
    this.emitHud();
  }

  public setVehicleInteriorCamera(active: boolean): void {
    this.vehicleInteriorCamera = active;
    this.cameraSnapPending = true;
    this.emitHud();
  }

  public toggleVehicleInteriorCamera(): void {
    this.setVehicleInteriorCamera(!this.vehicleInteriorCamera);
  }

  public setWeaponCustomizations(map: WeaponCustomizationsMap): void {
    this.weaponCustomizations = { ...map };
    if (this.phase === 'playing') {
      const s1 = this.getEffectiveWeapon(this.slot1Id).spec;
      const s2 = this.getEffectiveWeapon(this.slot2Id).spec;
      const s3 = this.getEffectiveWeapon(this.secondaryId).spec;
      this.slotAmmo[1].mag = Math.min(this.slotAmmo[1].mag, s1.magSize);
      this.slotAmmo[1].reserve = Math.min(this.slotAmmo[1].reserve, s1.reserveMax);
      this.slotAmmo[2].mag = Math.min(this.slotAmmo[2].mag, s2.magSize);
      this.slotAmmo[2].reserve = Math.min(this.slotAmmo[2].reserve, s2.reserveMax);
      this.slotAmmo[3].mag = Math.min(this.slotAmmo[3].mag, s3.magSize);
      this.slotAmmo[3].reserve = Math.min(this.slotAmmo[3].reserve, s3.reserveMax);
    } else {
      this.resetAmmo();
    }
    this.equipWeaponVisual(this.getActiveWeaponId());
    this.emitHud();
  }

  public setCareerProgress(progress: CareerProgress): void {
    this.careerProgress = { ...progress };
  }

  public setOnArmoryRequest(cb: (() => void) | null): void {
    this.onArmoryRequest = cb;
  }

  private getEffectiveWeapon(id: WeaponId): EffectiveWeaponStats {
    return computeWeaponWithAttachments(WEAPONS[id], this.weaponCustomizations[id]);
  }

  public setGameMode(mode: GameMode): void {
    if (this.gameMode === mode) return;
    this.gameMode = mode;
    if (this.phase === 'title') {
      this.rebuildWorldAndMatch(
        this.mapId,
        this.loadoutId,
        this.selectedSlot1Id,
        this.selectedSlot2Id,
      );
    }
    this.emitHud();
  }

  public setVirtualAction(action: KeyAction, active: boolean): void {
    this.sound.unlock();
    if (active) {
      if (!this.virtualHeld.has(action)) {
        this.virtualJustPressed.add(action);
      }
      this.virtualHeld.add(action);
    } else {
      this.virtualHeld.delete(action);
    }
  }

  public setVirtualMove(mx: number, my: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, mx));
    this.virtualMoveY = Math.max(-1, Math.min(1, my));
  }

  private normalizeAngle(a: number): number {
    let n = ((a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (n < -Math.PI) n += Math.PI * 2;
    return n;
  }

  private createFlareDecoyMesh(): THREE.Group {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(this.flareGeo, this.flareMat);
    const halo = new THREE.Mesh(this.flareHaloGeo, this.flareHaloMat);
    grp.add(core, halo);
    return grp;
  }

  private createMissileMesh(): THREE.Group {
    const mesh = new THREE.Group();
    const gun = getGunmetalPbrSet();
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.34,
      metalness: 0.45,
      roughnessMap: gun.roughnessMap,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.25,
      metalness: 0.4,
    });
    const seekerMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.12,
      metalness: 0.75,
    });
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xfdba74,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.75, 10), tubeMat);
    tube.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 10), noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.98;
    const seeker = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), seekerMat);
    seeker.position.z = 1.1;
    const finA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.28), noseMat);
    finA.position.z = -0.68;
    const finB = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.28), noseMat);
    finB.position.z = -0.68;
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.72, 8), plumeMat);
    plume.rotation.x = -Math.PI / 2;
    plume.position.z = -1.24;
    mesh.add(tube, nose, seeker, finA, finB, plume);
    return mesh;
  }

  public addVirtualLook(dx: number, dy: number): void {
    if (this.phase !== 'playing' || this.campaignLetterPending) return;
    const sensMult =
      this.isAds && !this.activeAircraft && !this.activeHelicopter
        ? this.settings.adsSensitivity * this.settings.mouseSensitivity
        : this.settings.mouseSensitivity;
    const sens = 0.0046 * sensMult;
    if (this.activeAircraft) {
      this.flightAimYaw = this.normalizeAngle(this.flightAimYaw - dx * sens * 0.72);
      this.flightAimPitch = THREE.MathUtils.clamp(
        this.flightAimPitch - dy * sens * 0.68,
        -0.78,
        0.78,
      );
      return;
    }
    this.playerYaw -= dx * sens;
    this.playerPitch = THREE.MathUtils.clamp(
      this.playerPitch - dy * sens,
      -Math.PI * 0.44,
      Math.PI * 0.44,
    );
    if (this.campaignMode && this.campaignMission?.mode === 'truck_passenger_convoy') {
      this.playerYaw = THREE.MathUtils.clamp(this.playerYaw, -1.25, 1.25);
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch, -0.55, 0.55);
    }
    this.weaponSwayYaw = THREE.MathUtils.clamp(this.weaponSwayYaw + dx * 0.0007, -0.075, 0.075);
    this.weaponSwayPitch = THREE.MathUtils.clamp(this.weaponSwayPitch + dy * 0.0007, -0.055, 0.055);
  }

  public useMedkit(): boolean {
    if (
      !this.playerAlive ||
      this.phase !== 'playing' ||
      this.backpackMedkits <= 0 ||
      this.playerHealth >= this.playerMaxHealth
    ) {
      return false;
    }
    this.backpackMedkits -= 1;
    this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 45);
    this.sound.playMedkitHeal();
    this.emitHud();
    return true;
  }

  public dropAircraftBomb(): void {
    if (this.phase !== 'playing' || !this.playerAlive) return;
    if (this.activeAircraft) {
      this.tryDropAircraftBomb(this.activeAircraft);
    }
  }

  public fireAircraftMissile(): void {
    if (this.phase !== 'playing' || !this.playerAlive) return;
    if (this.activeAircraft) {
      this.tryFireAircraftMissile(this.activeAircraft);
    } else if (this.activeHelicopter) {
      this.tryFireHelicopterRocket(this.activeHelicopter);
    }
  }

  public deployAircraftFlares(): void {
    if (this.phase !== 'playing' || !this.playerAlive) return;
    const ac = this.activeAircraft;
    const heli = this.activeHelicopter;
    if (!ac && !heli) return;
    if (ac) {
      if (ac.flaresLeft <= 0) return;
      ac.flaresLeft -= 1;
    } else if (heli) {
      if (heli.flaresLeft <= 0) return;
      heli.flaresLeft -= 1;
    }
    this.sound.playFlareDeploy();

    const cx = ac ? ac.x : heli!.flight.x;
    const cy = ac ? ac.y : heli!.flight.y;
    const cz = ac ? ac.z : heli!.flight.z;
    const yaw = ac ? ac.yaw : heli!.flight.yaw;
    const spd = ac ? ac.speed : Math.hypot(heli!.flight.vx, heli!.flight.vz);

    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    for (const side of [-1, 0, 1]) {
      const mesh = this.createFlareDecoyMesh();
      const fx = cx - fwdX * 2.2 + rightX * side * 1.4;
      const fy = cy - 0.6;
      const fz = cz - fwdZ * 2.2 + rightZ * side * 1.4;
      mesh.position.set(fx, fy, fz);
      this.scene.add(mesh);
      this.activeFlares.push({
        mesh,
        x: fx,
        y: fy,
        z: fz,
        vx: fwdX * (spd * 0.45) + rightX * side * (9 + Math.random() * 4),
        vy: -4.5 - Math.random() * 2.5,
        vz: fwdZ * (spd * 0.45) + rightZ * side * (9 + Math.random() * 4),
        life: 3.6,
        smokeAccum: 0,
      });
    }
    this.emitHud();
  }

  public boardTeamVehicle(kind: VehicleKind): boolean {
    if (this.phase !== 'playing' || !this.playerAlive || this.campaignMode) return false;
    if (kind === 'helicopter') {
      const heli = this.helicopters.find(
        (h) => h.alive && h.team === this.playerTeam && (h.mode === 'parked' || h.mode === 'ai_orbit'),
      );
      if (!heli) return false;
      this.activeVehicle = null;
      this.activeAircraft = null;
      heli.mode = 'player';
      heli.rig.pilotMesh.visible = !this.vehicleInteriorCamera;
      heli.flight.collective = 0.56;
      const gy = groundHeightAt(heli.flight.x, heli.flight.z, this.mapId);
      heli.flight.y = Math.max(heli.flight.y, gy + 3.0);
      this.activeHelicopter = heli;
      this.playerYaw = heli.flight.yaw + Math.PI;
      this.playerPitch = -0.05;
      this.cameraSnapPending = true;
      this.weaponHolder.visible = false;
      this.worldFlashlight.visible = false;
      this.digPreviewMesh.visible = false;
      this.emitHud();
      return true;
    }
    if (kind === 'aircraft') {
      const ac = this.aircrafts.find(
        (a) => a.alive && a.team === this.playerTeam && (a.mode === 'parked' || a.mode === 'ai_orbit'),
      );
      if (!ac) return false;
      this.activeVehicle = null;
      this.activeHelicopter = null;
      ac.mode = 'player';
      ac.rig.pilotMesh.visible = !this.vehicleInteriorCamera;
      ac.speed = Math.max(30, ac.speed);
      ac.throttlePct = 75;
      const gy = groundHeightAt(ac.x, ac.z, this.mapId);
      ac.y = Math.max(ac.y, gy + 24.0);
      ac.pitch = 0.04;
      this.flightAimYaw = ac.yaw;
      this.flightAimPitch = 0.04;
      this.activeAircraft = ac;
      this.cameraSnapPending = true;
      this.weaponHolder.visible = false;
      this.worldFlashlight.visible = false;
      this.digPreviewMesh.visible = false;
      this.emitHud();
      return true;
    }
    const veh = this.groundVehicles.find((v) => v.alive && v.team === this.playerTeam && v.kind === kind);
    if (!veh) return false;
    this.activeAircraft = null;
    this.activeHelicopter = null;
    this.activeVehicle = veh;
    veh.occupantIsPlayer = true;
    veh.rig.driverMesh.visible = !this.vehicleInteriorCamera;
    this.cameraSnapPending = true;
    this.weaponHolder.visible = false;
    this.worldFlashlight.visible = false;
    this.digPreviewMesh.visible = false;
    this.emitHud();
    return true;
  }

  public setMap(mapId: MapId): void {
    if (this.mapId === mapId) return;
    this.campaignMode = false;
    this.rebuildWorldAndMatch(mapId, this.loadoutId, this.selectedSlot1Id, this.selectedSlot2Id);
    this.emitHud();
  }

  public setPrimaryWeapon(weaponId: WeaponId): void {
    this.selectedSlot1Id = weaponId;
    this.slot1Id = weaponId;
    if (weaponId === 'm1_garand' || weaponId === 'kar98k') this.loadoutId = 'rifleman';
    else if (
      weaponId === 'thompson' ||
      weaponId === 'mp40' ||
      weaponId === 'ak47' ||
      weaponId === 'm4a1' ||
      weaponId === 'ppsh41'
    ) {
      this.loadoutId = 'assault';
    } else if (weaponId === 'stg44' || weaponId === 'bar') this.loadoutId = 'heavy';
    else if (weaponId === 'springfield') this.loadoutId = 'marksman';
    this.resetAmmo();
    this.equipWeaponVisual(this.getActiveWeaponId());
    this.emitHud();
  }

  public setSlot2Weapon(weaponId: WeaponId): void {
    this.selectedSlot2Id = weaponId;
    this.slot2Id = weaponId;
    this.resetAmmo();
    this.equipWeaponVisual(this.getActiveWeaponId());
    this.emitHud();
  }

  public setLoadout(loadoutId: LoadoutId): void {
    this.setPrimaryWeapon(LOADOUT_PRIMARY[loadoutId]);
  }

  public startGame(): void {
    this.sound.unlock();
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.sound.playRainAmbience(false);
    this.aircraftThreatWarning = 'none';
    this.cameraSnapPending = true;
    this.campaignMode = false;
    this.campaignMission = null;
    this.playerTeam = 'allies';
    this.rebuildWorldAndMatch(
      this.mapId,
      this.loadoutId,
      this.selectedSlot1Id,
      this.selectedSlot2Id,
    );
    this.phase = 'playing';
    this.weaponHolder.visible = true;
    this.clearAllInputs();
    this.syncBodyState();
    this.emitHud();
  }

  public startCampaignMission(missionId: number): void {
    const spec = getCampaignMission(missionId);
    if (!spec) return;
    this.sound.unlock();
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.aircraftThreatWarning = 'none';
    this.cameraSnapPending = true;
    this.campaignMode = true;
    this.campaignMission = spec;
    this.playerTeam = 'allies';
    this.rebuildCampaignMissionWorld(spec);
    this.phase = 'playing';
    this.clearAllInputs();
    this.syncBodyState();
    this.emitHud();
  }

  public dismissCampaignLetter(): void {
    if (!this.campaignMode || !this.campaignLetterPending) return;
    this.campaignLetterPending = false;
    this.sound.playClick();
    this.emitHud();
  }

  public skipCampaignCutscene(): void {
    if (!this.campaignMode || !this.campaignMission || !this.campaignMission.skippableCutscene) return;
    if (this.campaignMissionComplete) return;
    if (this.campaignMission.mode === 'truck_passenger_convoy' && this.campaignMission.timeLapseAfterEn) {
      this.campaignTimeLapseTextEn = this.campaignMission.timeLapseAfterEn;
      this.campaignTimeLapseTextAr = this.campaignMission.timeLapseAfterAr;
      this.campaignTimeLapseTimer = 2.6;
    } else {
      this.campaignMissionComplete = true;
      this.clearAllInputs();
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
    this.emitHud();
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.sound.unlock();
    this.phase = 'playing';
    this.clearAllInputs();
    this.syncBodyState();
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.aircraftThreatWarning = 'none';
    this.clearAllInputs();
    this.isAds = false;
    this.digPreviewMesh.visible = false;
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
    this.syncBodyState();
    this.emitHud();
  }

  public exitToMenu(): void {
    this.returnToTitle();
  }

  public returnToTitle(): void {
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.sound.playRainAmbience(false);
    this.aircraftThreatWarning = 'none';
    this.campaignMode = false;
    this.campaignMission = null;
    this.rebuildWorldAndMatch(
      this.mapId,
      this.loadoutId,
      this.selectedSlot1Id,
      this.selectedSlot2Id,
    );
    this.phase = 'title';
    this.weaponHolder.visible = false;
    this.worldFlashlight.visible = false;
    this.digPreviewMesh.visible = false;
    this.clearAllInputs();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
    this.syncBodyState();
    this.emitHud();
  }

  public toggleMute(): boolean {
    const muted = this.sound.toggleMute();
    this.emitHud();
    return muted;
  }

  public requestLock(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    try {
      this.renderer.domElement.requestPointerLock?.();
    } catch {
      // Fallback drag look remains active
    }
  }

  private clearAllInputs(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.virtualHeld.clear();
    this.virtualJustPressed.clear();
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.mouseDownLeft = false;
    this.mouseJustPressedLeft = false;
    this.mouseDownRight = false;
    this.lookPointerId = null;
  }

  private isActionHeld(action: KeyAction): boolean {
    const code = this.settings.bindings[action];
    return this.heldKeys.has(code) || this.virtualHeld.has(action);
  }

  private isActionJustPressed(action: KeyAction): boolean {
    const code = this.settings.bindings[action];
    return this.justPressedKeys.has(code) || this.virtualJustPressed.has(action);
  }

  private syncBodyState(): void {
    document.body.dataset.state = this.phase;
  }

  private clearEntityPools(): void {
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
      this.world = null;
    }
    if (this.campaignSet) {
      this.scene.remove(this.campaignSet.group);
      this.campaignSet.dispose();
      this.campaignSet = null;
    }
    for (const actor of this.campaignCastActors) {
      this.scene.remove(actor.rig.root);
    }
    this.campaignCastActors = [];
    for (const f of this.campaignConvoyFlyovers) {
      this.scene.remove(f.rig.root);
    }
    this.campaignConvoyFlyovers = [];
    for (const bot of this.bots) {
      this.scene.remove(bot.rig.root);
    }
    this.bots = [];
    for (const v of this.groundVehicles) {
      this.scene.remove(v.rig.root);
    }
    this.groundVehicles = [];
    for (const a of this.aircrafts) {
      this.scene.remove(a.rig.root);
    }
    this.aircrafts = [];
    for (const h of this.helicopters) {
      this.scene.remove(h.rig.root);
    }
    this.helicopters = [];
    for (const b of this.airBombs) {
      this.scene.remove(b.mesh);
    }
    this.airBombs = [];
    for (const m of this.homingMissiles) {
      this.scene.remove(m.mesh);
    }
    this.homingMissiles = [];
    for (const fl of this.activeFlares) {
      this.scene.remove(fl.mesh);
    }
    this.activeFlares = [];
    this.aircraftThreatWarning = 'none';
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.sound.playRainAmbience(false);
    if (this.parachuteMesh) {
      this.scene.remove(this.parachuteMesh);
      this.parachuteMesh = null;
    }
    this.isParachuting = false;
    this.activeVehicle = null;
    this.nearbyVehicle = null;
    this.activeAircraft = null;
    this.nearbyAircraft = null;
    this.activeHelicopter = null;
    this.nearbyHelicopter = null;
    this.lastKillcam = null;
    this.killerEntityPos = null;
    this.vehicleReticleVisible = false;
    this.aircraftLockTargetName = null;
    this.aircraftLockTargetAcId = null;
    this.aircraftLockTargetVehId = null;
    for (const g of this.grenades) {
      this.scene.remove(g.mesh);
    }
    this.grenades = [];
    for (const fg of this.foxholeGroups) {
      this.scene.remove(fg);
    }
    this.foxholeGroups = [];
    this.foxholes = [];

    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets[i].active = false;
      _mat.makeScale(0, 0, 0);
      this.bulletMesh.setMatrixAt(i, _mat);
    }
    this.bulletMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_SMOKE_PUFFS; i++) {
      this.smokePuffs[i].active = false;
      this.smokePuffs[i].sprite.visible = false;
    }
  }

  private rebuildWorldAndMatch(
    mapId: MapId,
    loadoutId: LoadoutId,
    slot1Id: WeaponId,
    slot2Id: WeaponId,
  ): void {
    this.mapId = mapId;
    this.loadoutId = loadoutId;
    this.selectedSlot1Id = slot1Id;
    this.selectedSlot2Id = slot2Id;
    this.slot1Id = slot1Id;
    this.slot2Id = slot2Id;

    this.clearEntityPools();

    this.world = buildBattlefieldWorld(mapId);
    this.scene.add(this.world.group);
    this.scene.background = new THREE.Color(this.world.skyColor);
    this.updateSkyDomeColors(mapId, this.world.skyColor);
    if (mapId === 'desert') {
      this.sunLight.color.setHex(0xffeed2);
      this.sunLight.intensity = 2.15;
      this.hemiLight.color.setHex(0x9fd0f5);
      this.hemiLight.groundColor.setHex(0x8c6d46);
    } else if (mapId === 'stalingrad') {
      this.sunLight.color.setHex(0xe2e8f0);
      this.sunLight.intensity = 1.65;
      this.hemiLight.color.setHex(0x9aaec4);
      this.hemiLight.groundColor.setHex(0x474a50);
    } else {
      this.sunLight.color.setHex(0xfff1d6);
      this.sunLight.intensity = 1.92;
      this.hemiLight.color.setHex(0xbbe0ff);
      this.hemiLight.groundColor.setHex(0x524c3e);
    }
    this.scene.fog = new THREE.FogExp2(
      this.world.skyColor,
      mapId === 'desert'
        ? 0.0038
        : mapId === 'forest'
          ? 0.0054
          : mapId === 'stalingrad'
            ? 0.0052
            : 0.0044,
    );
    (this.ambientMesh.material as THREE.MeshBasicMaterial).color.setHex(this.world.ambientColor);

    const startTickets = this.gameMode === 'tdm' ? TDM_MAX_TICKETS : MAX_TICKETS;
    this.zones = createInitialZones(mapId);
    this.alliesTickets = startTickets;
    this.axisTickets = startTickets;
    this.timeRemaining = this.matchDurationSeconds;
    this.matchElapsed = 0;
    this.winner = null;
    this.kills = 0;
    this.deaths = 0;
    this.captures = 0;
    this.score = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.resupplyFlashTimer = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.damageFlashAlpha = 0;
    this.hitmarkerKind = 'none';
    this.activeSlot = 1;
    this.isBinocularsZoomed = false;
    this.playerMudLevel = 0;

    this.spawnPlayerAtBase();
    this.resetAmmo();
    this.equipWeaponVisual(this.getActiveWeaponId());
    this.weaponHolder.visible = this.phase === 'playing';

    const roles: BotRole[] = [
      'rusher',
      'rusher',
      'defender',
      'defender',
      'marksman',
      'rusher',
      'defender',
      'marksman',
    ];
    for (let i = 0; i < roles.length; i++) {
      this.spawnBot(i, 'allies', roles[i], ALLY_NAMES[i]);
      this.spawnBot(i + 8, 'axis', roles[i], AXIS_NAMES[i]);
    }

    this.spawnVehiclesAndAircraft();
  }

  private rebuildCampaignMissionWorld(spec: CampaignMissionSpec): void {
    this.clearEntityPools();
    const terrainMap: MapId =
      spec.archetype === 'aqaba_port' ||
      spec.archetype === 'highway_evac' ||
      spec.archetype === 'truck_convoy' ||
      spec.archetype === 'desert_ridge' ||
      spec.archetype === 'wadi_search' ||
      spec.archetype === 'border_pass' ||
      spec.archetype === 'bastion_approach' ||
      spec.archetype === 'final_corridor'
        ? 'desert'
        : spec.archetype === 'residential_city' ||
            spec.archetype === 'ruined_quarter' ||
            spec.archetype === 'command_bunker' ||
            spec.archetype === 'emergency_clinic'
          ? 'stalingrad'
          : 'desert';
    this.mapId = terrainMap;

    // Flat sandy ground plane + distant horizon sky dome for bespoke campaign stage
    this.world = buildBattlefieldWorld(terrainMap);
    this.scene.add(this.world.group);

    this.campaignSet = buildCampaignSet(spec.archetype, spec.weather, (x, z) =>
      groundHeightAt(x, z, this.mapId),
    );
    this.scene.add(this.campaignSet.group);
    if (this.campaignSet.obstacles.length > 0) {
      this.world.obstacles.push(...this.campaignSet.obstacles);
    }

    const skyUniforms = null;
    applyCampaignWeather(this.scene, skyUniforms, this.sunLight, this.hemiLight, spec.weather);
    const fogCol = (this.scene.background as THREE.Color)?.getHex() ?? 0xc9b99e;
    this.updateSkyDomeColors(terrainMap, fogCol);
    this.sound.playRainAmbience(spec.weather === 'rain');

    this.zones = [];
    this.timeRemaining = spec.durationHintSec;
    this.matchElapsed = 0;
    this.campaignElapsed = 0;
    this.campaignRoadLoopOffset = 0;
    this.winner = null;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.playerHealth = this.playerMaxHealth;
    this.playerAlive = true;
    this.playerStamina = 100;
    this.stanceMode = 'stand';
    this.playerEyeHeight = 1.66;
    this.playerMudLevel = spec.initialMudLevel;
    this.campaignLetterPending = spec.mode === 'letter_intro';
    this.campaignTriggeredBeatIds.clear();
    this.campaignActiveSubtitle = null;
    this.campaignActiveSubtitleEnd = 0;
    this.campaignActiveSpeakerId = null;
    this.campaignBlastFired = false;
    this.campaignObjectiveDone = false;
    this.campaignMissionComplete = false;
    this.campaignTimeLapseTextEn = null;
    this.campaignTimeLapseTextAr = null;
    this.campaignTimeLapseTimer = 0;

    // Position Tariq cleanly per mission archetype
    this.playerX = 0;
    this.playerZ = spec.mode === 'training_range' ? 10.5 : spec.mode === 'letter_intro' ? 24 : 18;
    this.playerYaw = 0;
    this.playerPitch = -0.02;
    this.playerVx = 0;
    this.playerVz = 0;

    if (spec.mode === 'night_parachute') {
      this.playerX = 0;
      this.playerZ = 0;
      this.playerY = groundHeightAt(0, 0, this.mapId) + 56;
      this.playerVy = -4.2;
      this.playerGrounded = false;
      this.isParachuting = true;
      this.parachuteMesh = createParachuteCanopy();
      this.scene.add(this.parachuteMesh);
      this.sound.playParachuteOpen();
    } else {
      this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId);
      this.playerVy = 0;
      this.playerGrounded = true;
    }

    const isUnarmedMission =
      spec.mode === 'letter_intro' ||
      spec.mode === 'base_walk' ||
      spec.mode === 'blast_alarm' ||
      spec.mode === 'truck_passenger_convoy';

    this.slot1Id = spec.mode === 'training_range' ? 'm4a1' : this.selectedSlot1Id;
    this.slot2Id = this.selectedSlot2Id;
    this.activeSlot = 1;
    this.resetAmmo();
    this.equipWeaponVisual(this.getActiveWeaponId());
    this.weaponHolder.visible = !isUnarmedMission;

    // Spawn persistent campaign cast (honoring Khaled casualty in M9 and Omar casualty in M15!)
    const castIdsToInclude: string[] = [];
    if (spec.mode === 'truck_passenger_convoy' && this.campaignSet.truckRig) {
      castIdsToInclude.push('zaid', 'omar', 'khaled');
      castIdsToInclude.forEach((cid, idx) => {
        const cm = CAMPAIGN_CAST.find((c) => c.id === cid)!;
        const rig = createLowPolySoldier('allies', 'rusher', {
          skinColor: cm.skinTone,
          tunicColor: cm.uniformTint,
          unarmed: false,
        });
        setSoldierMudLevel(rig, spec.initialMudLevel);
        const seat = this.campaignSet!.truckRig!.seatOffsets[idx];
        rig.leftLeg.rotation.x = -Math.PI * 0.44;
        rig.rightLeg.rotation.x = -Math.PI * 0.44;
        rig.leftKnee.rotation.x = Math.PI * 0.44;
        rig.rightKnee.rotation.x = Math.PI * 0.44;
        rig.root.position.set(seat.x, seat.y - 0.65, seat.z);
        rig.root.rotation.y = seat.rotY;
        this.campaignSet!.truckRig!.root.add(rig.root);
        this.campaignCastActors.push({
          id: cid,
          rig,
          x: seat.x,
          y: seat.y,
          z: seat.z,
          yaw: seat.rotY,
          seatIndex: idx,
          blinkTimer: 0,
          nextBlinkAt: 1.5 + idx * 0.9,
          speakPhase: 0,
        });
      });

      // Overhead escort fighters/jets flying over the convoy highway!
      for (const [fx, fy, fz] of [[-18, 28, -95], [22, 34, -140]]) {
        const fly = createCombatAircraft('allies', 'fighter');
        fly.root.position.set(fx, fy, fz);
        fly.pilotMesh.visible = true;
        fly.landingGear.visible = false;
        this.scene.add(fly.root);
        this.campaignConvoyFlyovers.push({ rig: fly, x: fx, y: fy, z: fz, vx: 0, vz: 26 });
      }
    } else {
      castIdsToInclude.push('zaid');
      if (spec.id <= 15) castIdsToInclude.push('omar');
      if (spec.id <= 9) castIdsToInclude.push('khaled');
      if (spec.id === 1 || spec.id === 4 || spec.id >= 18) castIdsToInclude.push('faisal');
      if (spec.id === 8 || spec.id === 15) castIdsToInclude.push('nadia');
      if (spec.id === 16) castIdsToInclude.push('sami');

      castIdsToInclude.forEach((cid, idx) => {
        const cm = CAMPAIGN_CAST.find((c) => c.id === cid);
        if (!cm) return;
        const angle = (idx - (castIdsToInclude.length - 1) * 0.5) * 0.72;
        const cx = Math.sin(angle) * 4.5 + (cid === 'faisal' ? 0 : (idx % 2 === 0 ? -2.2 : 2.2));
        const cz =
          spec.mode === 'letter_intro'
            ? 12.5 + idx * 1.4
            : spec.mode === 'alarm_crater' || spec.mode === 'blast_alarm'
              ? -12 + idx * 1.6
              : this.playerZ - 5.5 - idx * 1.8;
        const cy = groundHeightAt(cx, cz, this.mapId);
        const rig = createLowPolySoldier('allies', 'defender', {
          skinColor: cm.skinTone,
          tunicColor: cm.uniformTint,
          unarmed: isUnarmedMission,
          hideHelmet: spec.id === 1 || cid === 'nadia',
          mudLevel: spec.initialMudLevel,
        });
        rig.root.position.set(cx, cy, cz);
        rig.root.rotation.y = Math.atan2(this.playerX - cx, this.playerZ - cz);
        this.scene.add(rig.root);
        this.campaignCastActors.push({
          id: cid,
          rig,
          x: cx,
          y: cy,
          z: cz,
          yaw: rig.root.rotation.y,
          seatIndex: -1,
          blinkTimer: 0,
          nextBlinkAt: 1.2 + idx * 0.85,
          speakPhase: 0,
        });
      });
    }

    // Spawn allied squad bots (if tactical combat) & French enemy battalion forces
    if (!isUnarmedMission && spec.mode !== 'training_range' && spec.mode !== 'night_parachute') {
      for (let i = 0; i < spec.enemyCount; i++) {
        const ang = (i / Math.max(1, spec.enemyCount)) * Math.PI * 1.4 - Math.PI * 0.7;
        const dist = 28 + (i % 4) * 14;
        const ex = Math.sin(ang) * dist;
        const ez = -Math.cos(ang) * dist - 14;
        const pt = resolveCircleObstacles(ex, ez, 0.9, this.world!.obstacles, ARENA_RADIUS);
        const ey = groundHeightAt(pt.x, pt.z, this.mapId);
        // French forces wear distinct dark slate-blue uniforms & helmets
        const rig = createLowPolySoldier('axis', i % 4 === 0 ? 'marksman' : 'rusher', {
          tunicColor: 0x3b495e,
          helmetColor: 0x2a3442,
          mudLevel: spec.initialMudLevel * 0.75,
        });
        rig.root.position.set(pt.x, ey, pt.z);
        this.scene.add(rig.root);
        this.bots.push({
          id: 500 + i,
          name: `Soldat Fr. #${i + 1}`,
          team: 'axis',
          role: i % 4 === 0 ? 'marksman' : 'rusher',
          rig,
          x: pt.x,
          y: ey,
          z: pt.z,
          vx: 0,
          vz: 0,
          yaw: Math.PI,
          hp: 95,
          maxHp: 95,
          alive: true,
          crouching: i % 3 === 0,
          koTimer: 0,
          koVx: 0,
          koVz: 0,
          koFallDir: 1,
          respawnTimer: 9999,
          fireCooldown: 1.2 + Math.random() * 1.4,
          telegraphTimer: 0,
          hitFlashTimer: 0,
          seekCoverTimer: 0,
          coverX: pt.x,
          coverZ: pt.z,
          targetZoneIdx: 1,
          strafeDir: i % 2 === 0 ? 1 : -1,
          strafeTimer: 2,
          walkPhase: 0,
          muzzleTimer: 0,
          aiState: 'advance',
          healTimer: 0,
          spottedTimer: 0,
          stuckCheckTimer: 0,
          lastCheckX: pt.x,
          lastCheckZ: pt.z,
          detourTimer: 0,
          detourDir: 1,
          weaponPitch: 0,
        });
      }
    }
    this.cameraSnapPending = true;
  }

  private updateSkyDomeColors(mapId: MapId, horizonHex: number): void {
    const pos = this.skyGeo.attributes.position as THREE.BufferAttribute;
    const col = this.skyGeo.attributes.color as THREE.BufferAttribute;
    const horizon = new THREE.Color(horizonHex);
    const zenith = new THREE.Color(
      mapId === 'desert'
        ? 0x265c96
        : mapId === 'stalingrad'
          ? 0x3b4958
          : mapId === 'forest'
            ? 0x2c567e
            : 0x2a6199,
    );
    const ground = new THREE.Color(horizonHex).multiplyScalar(0.68);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const ny = pos.getY(i) / 460;
      if (ny >= 0) {
        const t = Math.pow(Math.min(1, ny), 0.65);
        tmp.copy(horizon).lerp(zenith, t);
      } else {
        const t = Math.min(1, -ny * 3);
        tmp.copy(horizon).lerp(ground, t);
      }
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }

  private createDefaultSuspension(): SuspensionState {
    return {
      wheelOffsets: [0, 0, 0, 0],
      wheelVelocities: [0, 0, 0, 0],
      chassisHeave: 0,
      chassisPitch: 0,
      chassisRoll: 0,
    };
  }

  private spawnVehiclesAndAircraft(): void {
    const world = this.world!;
    const groundConfigs: Array<{
      id: number;
      kind: 'jeep' | 'tank';
      team: Team;
      x: number;
      z: number;
      yaw: number;
    }> = [
      { id: 1, kind: 'jeep', team: 'allies', x: -178, z: 58, yaw: Math.PI * 0.38 },
      { id: 2, kind: 'tank', team: 'allies', x: -152, z: 42, yaw: Math.PI * 0.42 },
      { id: 3, kind: 'jeep', team: 'allies', x: -246, z: 108, yaw: Math.PI * 0.38 },
      { id: 4, kind: 'tank', team: 'allies', x: -214, z: 76, yaw: Math.PI * 0.42 },
      { id: 9, kind: 'jeep', team: 'allies', x: -120, z: 86, yaw: Math.PI * 0.36 },
      { id: 5, kind: 'jeep', team: 'axis', x: 178, z: -58, yaw: -Math.PI * 0.58 },
      { id: 6, kind: 'tank', team: 'axis', x: 152, z: -42, yaw: -Math.PI * 0.58 },
      { id: 7, kind: 'jeep', team: 'axis', x: 246, z: -108, yaw: -Math.PI * 0.58 },
      { id: 8, kind: 'tank', team: 'axis', x: 214, z: -76, yaw: -Math.PI * 0.58 },
      { id: 10, kind: 'jeep', team: 'axis', x: 120, z: -86, yaw: -Math.PI * 0.58 },
    ];

    for (const cfg of groundConfigs) {
      const resolved = resolveCircleObstacles(
        cfg.x,
        cfg.z,
        cfg.kind === 'tank' ? 2.8 : 2.2,
        world.obstacles,
        ARENA_RADIUS - 8,
      );
      const y = groundHeightAt(resolved.x, resolved.z, this.mapId);
      const rig =
        cfg.kind === 'tank' ? createBattleTank(cfg.team) : createMilitaryJeep(cfg.team);
      rig.root.position.set(resolved.x, y, resolved.z);
      rig.root.rotation.y = cfg.yaw;
      rig.driverMesh.visible = cfg.kind === 'tank';
      this.scene.add(rig.root);

      const maxHp = cfg.kind === 'tank' ? 420 : 210;
      const maxAmmo = cfg.kind === 'tank' ? 24 : 180;
      this.groundVehicles.push({
        id: cfg.id,
        kind: cfg.kind,
        team: cfg.team,
        rig,
        x: resolved.x,
        y,
        z: resolved.z,
        yaw: cfg.yaw,
        turretYaw: cfg.yaw,
        gunPitch: 0,
        speed: 0,
        hp: maxHp,
        maxHp,
        alive: true,
        respawnTimer: 0,
        fireCooldown: 1.0 + cfg.id * 0.4,
        muzzleTimer: 0,
        wheelSpin: 0,
        steerAngle: 0,
        barrelRecoil: 0,
        patrolPhase: cfg.id * 1.4,
        patrolCenterX: resolved.x,
        patrolCenterZ: resolved.z,
        occupantIsPlayer: false,
        ammo: maxAmmo,
        maxAmmo,
        suspension: this.createDefaultSuspension(),
        prevSpeed: 0,
      });
    }

    // 2 parked flyable aircraft (Fighter + Attacker) per airfield + AI CAP Patrol Fighters
    const airConfigs: Array<{
      id: number;
      variant: 'fighter' | 'attacker';
      team: Team;
      mode: 'parked' | 'ai_orbit';
      orbitAngle: number;
      orbitRadius: number;
      centerOffsetZ: number;
      altitude: number;
      speed: number;
      homeX: number;
      homeZ: number;
      homeYaw: number;
    }> = [
      {
        id: 100,
        variant: 'fighter',
        team: 'allies',
        mode: 'parked',
        orbitAngle: 0,
        orbitRadius: 118,
        centerOffsetZ: 0,
        altitude: groundHeightAt(ALLY_AIRFIELD_CENTER.x, ALLY_AIRFIELD_CENTER.z, this.mapId) + 1.05,
        speed: 0,
        homeX: ALLY_AIRFIELD_CENTER.x,
        homeZ: ALLY_AIRFIELD_CENTER.z,
        homeYaw: Math.PI * 0.5 - 0.31,
      },
      {
        id: 101,
        variant: 'attacker',
        team: 'allies',
        mode: 'parked',
        orbitAngle: 0,
        orbitRadius: 118,
        centerOffsetZ: 0,
        altitude:
          groundHeightAt(ALLY_AIRFIELD_CENTER.x - 16, ALLY_AIRFIELD_CENTER.z + 18, this.mapId) +
          1.05,
        speed: 0,
        homeX: ALLY_AIRFIELD_CENTER.x - 16,
        homeZ: ALLY_AIRFIELD_CENTER.z + 18,
        homeYaw: Math.PI * 0.5 - 0.31,
      },
      {
        id: 102,
        variant: 'fighter',
        team: 'allies',
        mode: 'ai_orbit',
        orbitAngle: 0.4,
        orbitRadius: 120,
        centerOffsetZ: -16,
        altitude: 42,
        speed: 31,
        homeX: ALLY_AIRFIELD_CENTER.x,
        homeZ: ALLY_AIRFIELD_CENTER.z,
        homeYaw: 0,
      },
      {
        id: 103,
        variant: 'fighter',
        team: 'axis',
        mode: 'parked',
        orbitAngle: Math.PI,
        orbitRadius: 118,
        centerOffsetZ: 0,
        altitude: groundHeightAt(AXIS_AIRFIELD_CENTER.x, AXIS_AIRFIELD_CENTER.z, this.mapId) + 1.05,
        speed: 0,
        homeX: AXIS_AIRFIELD_CENTER.x,
        homeZ: AXIS_AIRFIELD_CENTER.z,
        homeYaw: -Math.PI * 0.5 - 0.31,
      },
      {
        id: 104,
        variant: 'attacker',
        team: 'axis',
        mode: 'parked',
        orbitAngle: Math.PI,
        orbitRadius: 118,
        centerOffsetZ: 0,
        altitude:
          groundHeightAt(AXIS_AIRFIELD_CENTER.x + 16, AXIS_AIRFIELD_CENTER.z - 18, this.mapId) +
          1.05,
        speed: 0,
        homeX: AXIS_AIRFIELD_CENTER.x + 16,
        homeZ: AXIS_AIRFIELD_CENTER.z - 18,
        homeYaw: -Math.PI * 0.5 - 0.31,
      },
      {
        id: 105,
        variant: 'fighter',
        team: 'axis',
        mode: 'ai_orbit',
        orbitAngle: Math.PI + 0.4,
        orbitRadius: 128,
        centerOffsetZ: 16,
        altitude: 46,
        speed: 32,
        homeX: AXIS_AIRFIELD_CENTER.x,
        homeZ: AXIS_AIRFIELD_CENTER.z,
        homeYaw: 0,
      },
    ];

    for (const ac of airConfigs) {
      const rig = createCombatAircraft(ac.team, ac.variant);
      const isParked = ac.mode === 'parked';
      const ax = isParked ? ac.homeX : Math.cos(ac.orbitAngle) * ac.orbitRadius;
      const az = isParked ? ac.homeZ : ac.centerOffsetZ + Math.sin(ac.orbitAngle) * ac.orbitRadius;
      rig.root.position.set(ax, ac.altitude, az);
      rig.root.rotation.y = ac.homeYaw;
      rig.pilotMesh.visible = !isParked;
      this.scene.add(rig.root);
      this.aircrafts.push({
        id: ac.id,
        variant: ac.variant,
        team: ac.team,
        rig,
        mode: ac.mode,
        x: ax,
        y: ac.altitude,
        z: az,
        yaw: ac.homeYaw,
        pitch: 0,
        speed: ac.speed,
        vy: 0,
        orbitAngle: ac.orbitAngle,
        orbitRadius: ac.orbitRadius,
        centerOffsetZ: ac.centerOffsetZ,
        altitude: ac.altitude,
        hp: ac.variant === 'attacker' ? 460 : 400,
        maxHp: ac.variant === 'attacker' ? 460 : 400,
        alive: true,
        respawnTimer: 0,
        fireCooldown: 2.2 + (ac.id % 2) * 1.1,
        rocketCooldown: 8.0 + (ac.id % 2) * 3.0,
        bombCooldown: 0,
        bombsLeft: 2,
        bombsMax: 2,
        missilesLeft: 2,
        missilesMax: 2,
        flaresLeft: 4,
        flaresMax: 4,
        throttlePct: isParked ? 0 : 65,
        muzzleTimer: 0,
        ammo: 240,
        maxAmmo: 240,
        bankRoll: isParked ? 0 : -0.32,
        homeX: ac.homeX,
        homeZ: ac.homeZ,
        homeYaw: ac.homeYaw,
        smokeAccum: 0,
        crashKillerName: 'Enemy Fire',
        crashKillerTeam: ac.team === 'allies' ? 'axis' : 'allies',
        crashWeaponId: 'aircraft_cannon',
      });
    }

    // Playable Combat Helicopters (Parked near base pads + AI patrol gunships)
    const heliConfigs: Array<{
      id: number;
      team: Team;
      mode: 'parked' | 'ai_orbit';
      homeX: number;
      homeZ: number;
      homeYaw: number;
      orbitAngle: number;
      altitude: number;
    }> = [
      {
        id: 200,
        team: 'allies',
        mode: 'parked',
        homeX: -148,
        homeZ: 18,
        homeYaw: Math.PI * 0.42,
        orbitAngle: 0,
        altitude: groundHeightAt(-148, 18, this.mapId) + 1.35,
      },
      {
        id: 201,
        team: 'allies',
        mode: 'ai_orbit',
        homeX: -160,
        homeZ: 28,
        homeYaw: 0,
        orbitAngle: 0.9,
        altitude: 30,
      },
      {
        id: 202,
        team: 'axis',
        mode: 'parked',
        homeX: 148,
        homeZ: -18,
        homeYaw: -Math.PI * 0.58,
        orbitAngle: Math.PI,
        altitude: groundHeightAt(148, -18, this.mapId) + 1.35,
      },
      {
        id: 203,
        team: 'axis',
        mode: 'ai_orbit',
        homeX: 160,
        homeZ: -28,
        homeYaw: Math.PI,
        orbitAngle: Math.PI + 0.9,
        altitude: 32,
      },
    ];

    for (const hc of heliConfigs) {
      const rig = createCombatHelicopter(hc.team);
      const isParked = hc.mode === 'parked';
      const hx = isParked ? hc.homeX : Math.cos(hc.orbitAngle) * 95;
      const hz = isParked ? hc.homeZ : Math.sin(hc.orbitAngle) * 95;
      const gy = groundHeightAt(hx, hz, this.mapId);
      const hy = isParked ? gy + 1.35 : hc.altitude;
      rig.root.position.set(hx, hy, hz);
      rig.root.rotation.y = hc.homeYaw;
      rig.pilotMesh.visible = !isParked;
      this.scene.add(rig.root);
      this.helicopters.push({
        id: hc.id,
        team: hc.team,
        rig,
        mode: hc.mode,
        flight: {
          x: hx,
          y: hy,
          z: hz,
          vx: 0,
          vy: 0,
          vz: 0,
          yaw: hc.homeYaw,
          pitch: 0,
          roll: 0,
          collective: isParked ? 0.25 : 0.54,
          rotorPhase: 0,
        },
        orbitAngle: hc.orbitAngle,
        orbitRadius: 95,
        centerOffsetZ: 0,
        altitude: hc.altitude,
        hp: 360,
        maxHp: 360,
        alive: true,
        respawnTimer: 0,
        fireCooldown: 1.5,
        rocketCooldown: 2.0,
        rocketsLeft: 6,
        rocketsMax: 6,
        flaresLeft: 4,
        flaresMax: 4,
        ammo: 300,
        maxAmmo: 300,
        muzzleTimer: 0,
        homeX: hc.homeX,
        homeZ: hc.homeZ,
        homeYaw: hc.homeYaw,
        smokeAccum: 0,
        crashKillerName: 'Enemy Fire',
        crashKillerTeam: hc.team === 'allies' ? 'axis' : 'allies',
      });
    }
  }

  private getActiveWeaponId(): WeaponId {
    if (this.activeSlot === 1) return this.slot1Id;
    if (this.activeSlot === 2) return this.slot2Id;
    if (this.activeSlot === 3) return this.secondaryId;
    if (this.activeSlot === 4) return 'binoculars';
    return 'shovel';
  }

  private resetAmmo(): void {
    const s1 = this.getEffectiveWeapon(this.slot1Id).spec;
    const s2 = this.getEffectiveWeapon(this.slot2Id).spec;
    const s3 = this.getEffectiveWeapon(this.secondaryId).spec;
    this.slotAmmo = {
      1: { mag: s1.magSize, reserve: s1.reserveMax },
      2: { mag: s2.magSize, reserve: s2.reserveMax },
      3: { mag: s3.magSize, reserve: s3.reserveMax },
    };
    this.grenadesCount = 2;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  private equipWeaponVisual(weaponId: WeaponId): void {
    if (this.fpRig) {
      this.weaponHolder.remove(this.fpRig.root);
    }
    this.fpRig = createFirstPersonWeaponRig(weaponId, this.weaponCustomizations[weaponId]);
    if (this.fpRig.accessoryEffectGroup) {
      this.fpRig.accessoryEffectGroup.visible = this.accessoryActive;
    }
    const eff = this.getEffectiveWeapon(weaponId);
    this.worldFlashlight.visible =
      this.phase === 'playing' &&
      this.playerAlive &&
      !this.activeVehicle &&
      !this.activeAircraft &&
      this.activeSlot <= 3 &&
      this.accessoryActive &&
      eff.hasFlashlight;
    this.weaponHolder.add(this.fpRig.root);
  }

  private spawnPlayerAtBase(): void {
    const world = this.world!;
    const spawnList = this.playerTeam === 'axis' ? world.axisSpawns : world.allySpawns;
    const spawn = spawnList[0];
    this.playerX = spawn.x;
    this.playerZ = spawn.z;
    this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId);
    this.playerVx = 0;
    this.playerVy = 0;
    this.playerVz = 0;
    this.playerGrounded = true;
    this.playerEyeHeight = 1.66;
    this.landingDip = 0;
    this.playerLean = 0;
    this.stanceMode = 'stand';
    this.walkToggle = false;
    this.playerYaw = Math.atan2(-(0 - this.playerX), -(0 - this.playerZ));
    this.prevPlayerYaw = this.playerYaw;
    this.playerPitch = -0.02;
    this.playerHealth = this.playerMaxHealth;
    this.playerStamina = 100;
    this.playerAlive = true;
    this.lastKillcam = null;
    this.killerEntityPos = null;
    this.isAds = false;
    this.adsBlend = 0;
    this.boltKick = 0;
    this.recoilRollOffset = 0;
    this.cameraRoll = 0;
    this.cameraSnapPending = true;
    this.wallTuckFactor = 0;
    if (this.activeVehicle) {
      this.activeVehicle.occupantIsPlayer = false;
      this.activeVehicle = null;
    }
    if (this.activeAircraft) {
      this.activeAircraft.mode = 'ai_orbit';
      this.activeAircraft = null;
    }
    if (this.activeHelicopter) {
      this.activeHelicopter.mode = 'ai_orbit';
      this.activeHelicopter = null;
    }
    this.aircraftThreatWarning = 'none';
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.nearbyVehicle = null;
    this.nearbyAircraft = null;
    this.nearbyHelicopter = null;
    this.vehicleReticleVisible = false;
    this.aircraftLockTargetName = null;
    this.aircraftLockTargetAcId = null;
    this.aircraftLockTargetVehId = null;
    if (this.parachuteMesh) {
      this.scene.remove(this.parachuteMesh);
      this.parachuteMesh = null;
    }
    this.isParachuting = false;
    this.backpackMedkits = this.backpackMedkitsMax;
    this.weaponHolder.visible = this.phase === 'playing';
    this.sprintBlend = 0;
    this.crouchBlend = 0;
    this.weaponStrafeBank = 0;
  }

  private spawnBot(id: number, team: Team, role: BotRole, name: string): void {
    const rig = createLowPolySoldier(team, role);
    const pt = this.pickSpawnPoint(team, id);
    const py = groundHeightAt(pt.x, pt.z, this.mapId);
    rig.root.position.set(pt.x, py, pt.z);
    this.scene.add(rig.root);

    this.bots.push({
      id,
      name,
      team,
      role,
      rig,
      x: pt.x,
      y: py,
      z: pt.z,
      vx: 0,
      vz: 0,
      yaw: team === 'allies' ? -Math.PI / 2 : Math.PI / 2,
      hp: 100,
      maxHp: 100,
      alive: true,
      crouching: false,
      koTimer: 0,
      koVx: 0,
      koVz: 0,
      koFallDir: 1,
      respawnTimer: 0,
      fireCooldown: 0.6 + Math.random() * 0.9,
      telegraphTimer: 0,
      hitFlashTimer: 0,
      seekCoverTimer: 0,
      coverX: pt.x,
      coverZ: pt.z,
      targetZoneIdx: role === 'defender' ? (team === 'allies' ? 0 : 2) : 1,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1.5 + Math.random() * 2,
      walkPhase: Math.random() * 6,
      muzzleTimer: 0,
      aiState: 'advance',
      healTimer: 0,
      spottedTimer: 0,
      stuckCheckTimer: 0,
      lastCheckX: pt.x,
      lastCheckZ: pt.z,
      detourTimer: 0,
      detourDir: id % 2 === 0 ? 1 : -1,
      weaponPitch: 0,
    });
  }

  private pickSpawnPoint(team: Team, seedIdx: number): { x: number; z: number } {
    const world = this.world!;
    const baseList = team === 'allies' ? world.allySpawns : world.axisSpawns;
    const ownedZones = this.zones.filter((z) => z.owner === team && z.capturingTeam === null);
    if (ownedZones.length > 0 && Math.random() < 0.35) {
      const zc = ownedZones[seedIdx % ownedZones.length];
      const angle = (seedIdx * 1.9) % (Math.PI * 2);
      const sx = zc.x + Math.cos(angle) * 9.0;
      const sz = zc.z + Math.sin(angle) * 9.0;
      return resolveCircleObstacles(sx, sz, 0.95, world.obstacles, ARENA_RADIUS);
    }
    const base = baseList[seedIdx % baseList.length];
    const rx = base.x + (Math.random() - 0.5) * 5;
    const rz = base.z + (Math.random() - 0.5) * 5;
    return resolveCircleObstacles(rx, rz, 0.95, world.obstacles, ARENA_RADIUS);
  }

  // --- Multi-Touch + Keyboard + Mouse Event Binding ---

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.heldKeys.add(e.code);
    this.justPressedKeys.add(e.code);

    if (this.phase === 'playing') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.pauseGame();
      } else if (e.code === 'KeyM') {
        this.toggleMute();
      }
    } else if (this.phase === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.resumeGame();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onWindowBlur = () => {
    this.clearAllInputs();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.clearAllInputs();
    }
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.phase !== 'playing' || !this.pointerLocked || this.campaignLetterPending) return;
    const sensMult =
      this.isAds && !this.activeAircraft && !this.activeHelicopter
        ? this.settings.adsSensitivity * this.settings.mouseSensitivity
        : this.settings.mouseSensitivity;
    const sens = 0.0022 * sensMult;
    if (this.activeAircraft) {
      this.flightAimYaw = this.normalizeAngle(this.flightAimYaw - e.movementX * sens * 0.85);
      this.flightAimPitch = THREE.MathUtils.clamp(
        this.flightAimPitch - e.movementY * sens * 0.85,
        -0.78,
        0.78,
      );
      return;
    }
    this.playerYaw -= e.movementX * sens;
    this.playerPitch = THREE.MathUtils.clamp(
      this.playerPitch - e.movementY * sens,
      -Math.PI * 0.44,
      Math.PI * 0.44,
    );
    if (this.campaignMode && this.campaignMission?.mode === 'truck_passenger_convoy') {
      this.playerYaw = THREE.MathUtils.clamp(this.playerYaw, -1.25, 1.25);
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch, -0.55, 0.55);
    }
    this.weaponSwayYaw = THREE.MathUtils.clamp(
      this.weaponSwayYaw + e.movementX * 0.00045,
      -0.075,
      0.075,
    );
    this.weaponSwayPitch = THREE.MathUtils.clamp(
      this.weaponSwayPitch + e.movementY * 0.00045,
      -0.055,
      0.055,
    );
  };

  private onCanvasPointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    if (e.target !== this.renderer.domElement) return;
    this.sound.unlock();

    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      // Dedicated multi-touch drag-to-look (never steals Fire or Joystick fingers)
      if (this.lookPointerId === null) {
        this.lookPointerId = e.pointerId;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.lookMovedDist = 0;
        try {
          this.renderer.domElement.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture failures
        }
      }
      return;
    }

    // Mouse input
    if (e.button === 0) {
      if (this.pointerLocked) {
        this.mouseDownLeft = true;
        this.mouseJustPressedLeft = true;
      } else {
        // Allow smooth coalesced drag-to-look without misfiring, or quick tap to lock pointer
        this.lookPointerId = e.pointerId;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.lookMovedDist = 0;
        try {
          this.renderer.domElement.setPointerCapture(e.pointerId);
        } catch {
          // Ignore capture failures
        }
      }
    } else if (e.button === 2) {
      this.mouseDownRight = true;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase !== 'playing' || this.pointerLocked || this.campaignLetterPending) return;
    if (this.lookPointerId !== e.pointerId) return;

    let dx = 0;
    let dy = 0;
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    if (coalesced.length > 0) {
      for (let i = 0; i < coalesced.length; i++) {
        const ce = coalesced[i];
        dx += ce.clientX - this.lastPointerX;
        dy += ce.clientY - this.lastPointerY;
        this.lastPointerX = ce.clientX;
        this.lastPointerY = ce.clientY;
      }
    } else {
      dx = e.clientX - this.lastPointerX;
      dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
    dx = THREE.MathUtils.clamp(dx, -90, 90);
    dy = THREE.MathUtils.clamp(dy, -90, 90);
    this.lookMovedDist += Math.hypot(dx, dy);

    const sensMult =
      this.isAds && !this.activeAircraft && !this.activeHelicopter
        ? this.settings.adsSensitivity * this.settings.mouseSensitivity
        : this.settings.mouseSensitivity;
    const sens = (e.pointerType === 'touch' ? 0.0046 : 0.0038) * sensMult;

    if (this.activeAircraft) {
      this.flightAimYaw = this.normalizeAngle(this.flightAimYaw - dx * sens * 0.72);
      this.flightAimPitch = THREE.MathUtils.clamp(
        this.flightAimPitch - dy * sens * 0.68,
        -0.78,
        0.78,
      );
      return;
    }

    this.playerYaw -= dx * sens;
    this.playerPitch = THREE.MathUtils.clamp(
      this.playerPitch - dy * sens,
      -Math.PI * 0.44,
      Math.PI * 0.44,
    );
    if (this.campaignMode && this.campaignMission?.mode === 'truck_passenger_convoy') {
      this.playerYaw = THREE.MathUtils.clamp(this.playerYaw, -1.25, 1.25);
      this.playerPitch = THREE.MathUtils.clamp(this.playerPitch, -0.55, 0.55);
    }
    this.weaponSwayYaw = THREE.MathUtils.clamp(
      this.weaponSwayYaw + dx * 0.0007,
      -0.075,
      0.075,
    );
    this.weaponSwayPitch = THREE.MathUtils.clamp(
      this.weaponSwayPitch + dy * 0.0007,
      -0.055,
      0.055,
    );
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.lookPointerId === e.pointerId) {
      if (e.pointerType === 'mouse' && this.lookMovedDist < 5 && !this.pointerLocked) {
        this.requestLock();
      }
      this.lookPointerId = null;
    }
    if (e.pointerType === 'mouse') {
      if (e.button === 0) this.mouseDownLeft = false;
      else if (e.button === 2) this.mouseDownRight = false;
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    if (e.target === this.renderer.domElement) {
      e.preventDefault();
    }
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onCanvasPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onCanvasPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }

  private tick(): void {
    if (this.disposed) return;

    const now = performance.now();
    if (!this.isSoftwareGl && this.resolvedTargetFps > 0 && this.lastRenderTimestamp > 0) {
      const minIntervalMs = 1000 / this.resolvedTargetFps;
      if (now - this.lastRenderTimestamp < minIntervalMs - 1.2) {
        this.scheduleNextTick();
        return;
      }
    }
    this.lastRenderTimestamp = now;

    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    const elapsedSec = now * 0.001;

    if (this.phase === 'title') {
      this.updateTitleTour(dt);
      this.world?.updateWater(dt, elapsedSec);
      this.updateFlagVisuals(dt, elapsedSec);
      this.updateParticles(dt);
      this.updateSmokePuffs(dt);
      this.updateExplosions(dt);
      this.updateBullets(dt);
      this.updateAmbientMotes(elapsedSec);
    } else if (this.phase === 'playing') {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.85);
      this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - dt * 1.4);
      if (this.hitmarkerTimer > 0) {
        this.hitmarkerTimer -= dt;
        if (this.hitmarkerTimer <= 0) this.hitmarkerKind = 'none';
      }

      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.stepSimulation(dt, elapsedSec);
      }

      this.world?.updateWater(dt, elapsedSec);
      this.updateParticles(dt);
      this.updateSmokePuffs(dt);
      this.updateExplosions(dt);
      this.updateCasings(dt);
      this.updateAmbientMotes(elapsedSec);
      this.updateCameraAndViewmodel(dt);
      if ((this.settings.showAimArrow || this.activeSlot === 4) && !this.campaignMode) {
        this.computeBallisticAimArrow();
      }
    }

    this.justPressedKeys.clear();
    this.virtualJustPressed.clear();
    this.mouseJustPressedLeft = false;

    this.skyDome.position.copy(this.camera.position);

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (this.weaponHolder.visible) {
      this.renderer.clearDepth();
      this.renderer.render(this.fpScene, this.fpCamera);
    }

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.095) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.scheduleNextTick();
  }

  private updateTitleTour(dt: number): void {
    this.camera.up.set(0, 1, 0);
    this.titleTourTime += dt * 0.12;
    const radius = 84;
    const cx = Math.cos(this.titleTourTime) * radius;
    const cz = Math.sin(this.titleTourTime) * radius;
    const cy = 22 + Math.sin(this.titleTourTime * 1.7) * 3.5;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 3.0, 0);

    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive) continue;
      bot.walkPhase += dt * 4.5;
      const swing = Math.sin(bot.walkPhase) * 0.45;
      bot.rig.leftLeg.rotation.x = swing;
      bot.rig.rightLeg.rotation.x = -swing;
    }

    this.updateVehiclesAndAircraft(dt, this.titleTourTime * 8, true);
  }

  private updateAmbientMotes(elapsedSec: number): void {
    const px = this.camera.position.x;
    const py = this.camera.position.y;
    const pz = this.camera.position.z;
    const windX = this.mapId === 'desert' ? elapsedSec * 3.2 : elapsedSec * 0.6;
    const windZ = this.mapId === 'desert' ? elapsedSec * 1.6 : elapsedSec * 0.3;

    for (let i = 0; i < MAX_AMBIENT; i++) {
      const m = this.ambientMotes[i];
      const wx = ((((m.ox + windX) % 44) + 66) % 44) - 22;
      const wz = ((((m.oz + windZ) % 44) + 66) % 44) - 22;
      const wy = m.oy + Math.sin(elapsedSec * m.speed + m.phase) * 0.65;

      _v3.set(px + wx, Math.max(groundHeightAt(px + wx, pz + wz, this.mapId) + 0.3, py + wy - 3), pz + wz);
      _quat.identity();
      _scale.setScalar(m.size);
      _mat.compose(_v3, _quat, _scale);
      this.ambientMesh.setMatrixAt(i, _mat);
    }
    this.ambientMesh.instanceMatrix.needsUpdate = true;
  }

  private stepSimulation(dt: number, elapsedSec: number): void {
    this.matchElapsed += dt;

    if (this.campaignMode && this.campaignMission) {
      this.stepCampaignSimulation(dt, elapsedSec, this.campaignMission);
      return;
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    if (this.playerAlive) {
      this.updatePlayer(dt);
    } else {
      this.playerRespawnTimer -= dt;
      if (this.playerRespawnTimer <= 0) {
        this.spawnPlayerAtBase();
        this.resetAmmo();
      }
    }

    this.updateBullets(dt);
    this.updateAirBombs(dt);
    this.updateHomingMissiles(dt);
    this.updateFlares(dt);
    this.updateBots(dt);
    this.updateVehiclesAndAircraft(dt, elapsedSec, false);
    this.updateGrenades(dt);
    this.updateCaptureZonesAndTickets(dt);
    this.updateFlagVisuals(dt, elapsedSec);

    if (this.playerAlive && (this.activeAircraft || this.activeHelicopter)) {
      const alt = this.activeAircraft
        ? this.activeAircraft.y - groundHeightAt(this.activeAircraft.x, this.activeAircraft.z, this.mapId)
        : this.activeHelicopter!.flight.y -
          groundHeightAt(this.activeHelicopter!.flight.x, this.activeHelicopter!.flight.z, this.mapId);
      const vs = this.activeAircraft
        ? Math.sin(this.activeAircraft.pitch) * this.activeAircraft.speed
        : this.activeHelicopter!.flight.vy;
      const pitch = this.activeAircraft ? this.activeAircraft.pitch : this.activeHelicopter!.flight.pitch;
      const spd = this.activeAircraft
        ? this.activeAircraft.speed
        : Math.hypot(this.activeHelicopter!.flight.vx, this.activeHelicopter!.flight.vz);
      const hpRatio = this.activeAircraft
        ? this.activeAircraft.hp / Math.max(1, this.activeAircraft.maxHp)
        : this.activeHelicopter!.hp / Math.max(1, this.activeHelicopter!.maxHp);

      let incomingMissileDist: number | null = null;
      if (this.activeAircraft) {
        const ac = this.activeAircraft;
        for (let mIdx = 0; mIdx < this.homingMissiles.length; mIdx++) {
          const m = this.homingMissiles[mIdx];
          if (!m.fromPlayer && !m.divertedByFlare && m.targetAircraftId === ac.id) {
            const md = Math.hypot(m.x - ac.x, m.y - ac.y, m.z - ac.z);
            if (incomingMissileDist === null || md < incomingMissileDist) {
              incomingMissileDist = md;
            }
          }
        }
      }
      this.aircraftThreatWarning = evaluateAircraftThreats({
        altAboveGround: alt,
        verticalSpeed: vs,
        pitch,
        speed: spd,
        hpRatio,
        incomingMissileDist,
      });
      this.sound.updateCockpitWarningAudio(this.aircraftThreatWarning);
    } else if (this.aircraftThreatWarning !== 'none') {
      this.aircraftThreatWarning = 'none';
      this.sound.stopCockpitWarnings();
      this.sound.stopEngineCue();
    }

    const outcome = checkMatchOutcome(this.alliesTickets, this.axisTickets, this.timeRemaining);
    if (outcome) {
      this.winner = outcome;
      this.phase = 'gameover';
      this.aircraftThreatWarning = 'none';
      this.sound.stopCockpitWarnings();
      this.sound.stopEngineCue();
      this.clearAllInputs();
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
      this.sound.playZoneCaptured(outcome === 'allies');
      this.syncBodyState();
      this.emitHud();
    }
  }

  private stepCampaignSimulation(
    dt: number,
    elapsedSec: number,
    spec: CampaignMissionSpec,
  ): void {
    if (this.campaignLetterPending) return;

    if (this.campaignTimeLapseTimer > 0) {
      this.campaignTimeLapseTimer -= dt;
      if (this.campaignTimeLapseTimer <= 0) {
        this.campaignTimeLapseTextEn = null;
        this.campaignTimeLapseTextAr = null;
        this.campaignMissionComplete = true;
        this.clearAllInputs();
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock?.();
        }
        this.emitHud();
      }
      return;
    }

    if (this.campaignMissionComplete) return;

    this.campaignElapsed += dt;
    this.timeRemaining = Math.max(0, spec.durationHintSec - this.campaignElapsed);

    // Update campaign set visuals (rain, beacons, rotating truck tires)
    this.campaignSet?.update(elapsedSec, dt, _v1.set(this.playerX, this.playerY, this.playerZ));

    // Advance timed dialogue beats + play character voice cadence + lip sync
    for (const beat of spec.dialogue) {
      if (this.campaignElapsed >= beat.delaySec && !this.campaignTriggeredBeatIds.has(beat.id)) {
        this.campaignTriggeredBeatIds.add(beat.id);
        this.campaignActiveSubtitle = {
          speakerId: beat.speakerId,
          speakerNameEn: beat.speakerNameEn,
          speakerNameAr: beat.speakerNameAr,
          textEn: beat.textEn,
          textAr: beat.textAr,
        };
        this.campaignActiveSubtitleEnd = this.campaignElapsed + beat.durationSec;
        this.campaignActiveSpeakerId = beat.speakerId;
        const cast = CAMPAIGN_CAST.find((c) => c.id === beat.speakerId);
        const pitch = cast?.voicePitchHz ?? 130;
        const emotion =
          beat.emotion === 'determined' ? 'command' : beat.emotion;
        this.sound.playCharacterVoiceCadence(pitch, emotion);
      }
    }
    if (this.campaignActiveSubtitle && this.campaignElapsed > this.campaignActiveSubtitleEnd) {
      this.campaignActiveSubtitle = null;
      this.campaignActiveSpeakerId = null;
    }

    // Animate cast soldier faces (natural blinks, brow tension, jaw lip-sync)
    for (const actor of this.campaignCastActors) {
      actor.blinkTimer += dt;
      const isSpeaking = this.campaignActiveSpeakerId === actor.id;
      let blinkAmount = 0.08;
      if (actor.blinkTimer >= actor.nextBlinkAt) {
        const bProg = actor.blinkTimer - actor.nextBlinkAt;
        if (bProg < 0.14) {
          blinkAmount = Math.sin((bProg / 0.14) * Math.PI);
        } else {
          actor.blinkTimer = 0;
          actor.nextBlinkAt = 2.4 + (actor.id.charCodeAt(0) % 5) * 0.45;
        }
      }
      let mouthOpen = 0;
      if (isSpeaking) {
        actor.speakPhase += dt * 16;
        mouthOpen = Math.max(0, Math.sin(actor.speakPhase) * 0.55 + Math.sin(actor.speakPhase * 1.7) * 0.35);
      }
      if (actor.seatIndex < 0) {
        const faceYaw = Math.atan2(this.playerX - actor.x, this.playerZ - actor.z);
        actor.rig.root.rotation.y = this.dampAngle(actor.rig.root.rotation.y, faceYaw, 3.5, dt);
      }
      animateSoldierExpression(actor.rig, {
        blinkAmount,
        mouthOpen,
        browTension: spec.act >= 3 ? 0.45 : isSpeaking ? 0.25 : 0,
        headPitch: Math.sin(elapsedSec * 1.1 + actor.id.charCodeAt(0)) * 0.04,
      });
    }

    // Mission 5: Directed Rear Cargo-Bed Passenger Convoy Ride
    if (spec.mode === 'truck_passenger_convoy' && this.campaignSet?.truckRig) {
      this.campaignRoadLoopOffset = (this.campaignRoadLoopOffset + dt * 13) % 18;
      this.sound.playEngineCue('ground', 0.52, false);
      for (const f of this.campaignConvoyFlyovers) {
        f.z += f.vz * dt;
        if (f.z > 140) f.z = -160;
        f.rig.root.position.set(f.x, f.y, f.z);
        f.rig.propeller.rotation.z += dt * 32;
      }
      for (const cm of this.campaignSet.convoyMeshes) {
        cm.position.z += Math.sin(elapsedSec * 0.7) * dt * 0.4;
      }

      if (this.campaignElapsed >= spec.durationHintSec) {
        this.sound.stopEngineCue();
        if (spec.timeLapseAfterEn) {
          this.campaignTimeLapseTextEn = spec.timeLapseAfterEn;
          this.campaignTimeLapseTextAr = spec.timeLapseAfterAr;
          this.campaignTimeLapseTimer = 3.2;
        } else {
          this.campaignMissionComplete = true;
        }
        this.emitHud();
      }
      return;
    }

    // M4 Blast & Siren scripted attack beat
    if (spec.mode === 'blast_alarm' && !this.campaignBlastFired && this.campaignElapsed >= 3.2) {
      this.campaignBlastFired = true;
      this.sound.playDistantBlast();
      this.sound.playBaseAlarm();
      this.spawnExplosionVfx(8, groundHeightAt(8, -14, this.mapId), -14, 14);
      this.cameraTrauma = 0.72;
    }

    if (this.playerAlive) {
      this.updatePlayer(dt);
    } else {
      this.playerRespawnTimer -= dt;
      if (this.playerRespawnTimer <= 0) {
        // Restart mission cleanly on player defeat in Story mode
        this.startCampaignMission(spec.id);
        return;
      }
    }

    this.updateBullets(dt);
    this.updateBots(dt);
    this.updateGrenades(dt);

    // Trigger zone progression (M1, M3, M4, M9, M16, M20)
    if (this.campaignSet) {
      for (const tp of this.campaignSet.triggerPoints) {
        if (!tp.activated && Math.hypot(this.playerX - tp.x, this.playerZ - tp.z) <= tp.radius) {
          tp.activated = true;
          this.sound.playZoneCaptured(true);
          this.campaignObjectiveDone = true;
        }
      }
    }

    // Completion check per mission play mode
    const lastBeat = spec.dialogue[spec.dialogue.length - 1];
    const minDialogWait = lastBeat ? lastBeat.delaySec + Math.min(3.0, lastBeat.durationSec) : 6;
    let shouldComplete = false;
    if (spec.mode === 'letter_intro' || spec.mode === 'base_walk' || spec.mode === 'blast_alarm') {
      shouldComplete =
        (this.campaignObjectiveDone && this.campaignElapsed >= minDialogWait) ||
        this.campaignElapsed >= spec.durationHintSec;
    } else if (spec.mode === 'training_range') {
      const hits = this.campaignSet?.targets.filter((t) => t.hit).length ?? 0;
      shouldComplete = hits >= spec.targetKills;
    } else if (spec.mode === 'night_parachute') {
      shouldComplete = !this.isParachuting && (this.campaignObjectiveDone || this.campaignElapsed >= minDialogWait);
    } else {
      const aliveEnemies = this.bots.filter((b) => b.alive && b.team === 'axis').length;
      shouldComplete =
        aliveEnemies === 0 ||
        (spec.targetKills > 0 && this.kills >= spec.targetKills);
    }

    if (shouldComplete) {
      this.sound.playZoneCaptured(true);
      this.sound.playRainAmbience(false);
      if (spec.timeLapseAfterEn) {
        this.campaignTimeLapseTextEn = spec.timeLapseAfterEn;
        this.campaignTimeLapseTextAr = spec.timeLapseAfterAr;
        this.campaignTimeLapseTimer = 3.0;
      } else {
        this.campaignMissionComplete = true;
        this.clearAllInputs();
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock?.();
        }
      }
      this.emitHud();
    }
  }

  private updatePlayer(dt: number): void {
    if (this.campaignLetterPending || this.campaignMission?.mode === 'truck_passenger_convoy') {
      return;
    }
    const isUnarmedCampaign =
      this.campaignMode &&
      (this.campaignMission?.mode === 'letter_intro' ||
        this.campaignMission?.mode === 'base_walk' ||
        this.campaignMission?.mode === 'blast_alarm');

    const turnSpeed = 2.0 * this.settings.mouseSensitivity;
    if (this.heldKeys.has('ArrowLeft')) this.playerYaw += turnSpeed * dt;
    if (this.heldKeys.has('ArrowRight')) this.playerYaw -= turnSpeed * dt;
    if (this.heldKeys.has('ArrowUp')) {
      this.playerPitch = Math.min(Math.PI * 0.44, this.playerPitch + turnSpeed * 0.7 * dt);
    }
    if (this.heldKeys.has('ArrowDown')) {
      this.playerPitch = Math.max(-Math.PI * 0.44, this.playerPitch - turnSpeed * 0.7 * dt);
    }

    if (
      (this.activeVehicle || this.activeAircraft || this.activeHelicopter) &&
      this.isActionJustPressed('toggleCamera')
    ) {
      this.toggleVehicleInteriorCamera();
    }

    // Open Mid-Match Armory at Friendly Base [B]
    if (
      !this.activeVehicle &&
      !this.activeAircraft &&
      !this.activeHelicopter &&
      !this.campaignMode &&
      this.isActionJustPressed('armory') &&
      this.isNearAlliedArmory()
    ) {
      this.pauseGame();
      this.onArmoryRequest?.();
      return;
    }

    // Toggle Rail Accessory (Laser / Flashlight) [T]
    if (this.isActionJustPressed('toggleAccessory')) {
      const eff = this.getEffectiveWeapon(this.getActiveWeaponId());
      if (eff.hasLaser || eff.hasFlashlight) {
        this.accessoryActive = !this.accessoryActive;
        if (this.fpRig?.accessoryEffectGroup) {
          this.fpRig.accessoryEffectGroup.visible = this.accessoryActive;
        }
        this.worldFlashlight.visible =
          !this.activeVehicle &&
          !this.activeAircraft &&
          !this.activeHelicopter &&
          this.activeSlot <= 3 &&
          this.accessoryActive &&
          eff.hasFlashlight;
        this.sound.playClick();
      }
    }

    // Track nearest rideable friendly ground vehicle, aircraft, or helicopter
    let closestVeh: GroundVehicleEntity | null = null;
    let closestVehDist = 6.0;
    for (let i = 0; i < this.groundVehicles.length; i++) {
      const v = this.groundVehicles[i];
      if (!v.alive || v.team !== this.playerTeam) continue;
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < closestVehDist) {
        closestVehDist = d;
        closestVeh = v;
      }
    }
    this.nearbyVehicle =
      this.activeVehicle || this.activeAircraft || this.activeHelicopter ? null : closestVeh;

    let closestAir: CombatAircraftEntity | null = null;
    let closestAirDist = 9.0;
    for (let i = 0; i < this.aircrafts.length; i++) {
      const a = this.aircrafts[i];
      if (!a.alive || a.team !== this.playerTeam || a.mode === 'player') continue;
      const d = Math.hypot(a.x - this.playerX, a.z - this.playerZ);
      const dy = Math.abs(a.y - this.playerY);
      if (d < closestAirDist && dy < 7.5) {
        closestAirDist = d;
        closestAir = a;
      }
    }
    this.nearbyAircraft =
      this.activeVehicle || this.activeAircraft || this.activeHelicopter ? null : closestAir;

    let closestHeli: CombatHelicopterEntity | null = null;
    let closestHeliDist = 9.0;
    for (let i = 0; i < this.helicopters.length; i++) {
      const h = this.helicopters[i];
      if (!h.alive || h.team !== this.playerTeam || h.mode === 'player' || h.mode === 'crashing') continue;
      const d = Math.hypot(h.flight.x - this.playerX, h.flight.z - this.playerZ);
      const dy = Math.abs(h.flight.y - this.playerY);
      if (d < closestHeliDist && dy < 7.5) {
        closestHeliDist = d;
        closestHeli = h;
      }
    }
    this.nearbyHelicopter =
      this.activeVehicle || this.activeAircraft || this.activeHelicopter ? null : closestHeli;

    // Enter or exit vehicle / aircraft / helicopter via [X] / interact button (mid-air eject triggers Parachute Bailout)
    if (this.isActionJustPressed('interact')) {
      if (this.activeHelicopter) {
        const h = this.activeHelicopter;
        const gy = groundHeightAt(h.flight.x, h.flight.z, this.mapId);
        const altAboveGround = h.flight.y - gy;
        this.activeHelicopter = null;
        this.aircraftThreatWarning = 'none';
        this.sound.stopCockpitWarnings();
        this.sound.stopEngineCue();
        this.cameraSnapPending = true;
        this.vehicleReticleVisible = false;
        this.aircraftLockTargetName = null;
        this.aircraftLockTargetAcId = null;
        this.aircraftLockTargetVehId = null;
        if (altAboveGround > 4.2) {
          h.mode = 'crashing';
          h.rig.pilotMesh.visible = false;
          h.flight.vy = -2.5;
          h.crashKillerName = 'Pilot';
          h.crashKillerTeam = this.playerTeam;

          this.isParachuting = true;
          this.parachuteSwayPhase = 0;
          if (!this.parachuteMesh) {
            this.parachuteMesh = createParachuteCanopy();
            this.scene.add(this.parachuteMesh);
          }
          this.parachuteMesh.visible = true;
          this.playerX = h.flight.x + Math.cos(h.flight.yaw) * 3.4;
          this.playerZ = h.flight.z - Math.sin(h.flight.yaw) * 3.4;
          this.playerY = Math.max(gy + 3.2, h.flight.y - 2.6);
          this.playerVx = Math.cos(h.flight.yaw) * 3.5;
          this.playerVz = -Math.sin(h.flight.yaw) * 3.5;
          this.playerVy = -2.2;
          this.playerGrounded = false;
          this.weaponHolder.visible = !isUnarmedCampaign;
          this.sound.playParachuteOpen();
          this.emitHud();
        } else {
          h.mode = 'parked';
          h.rig.pilotMesh.visible = false;
          const exitPt = resolveCircleObstacles(
            h.flight.x + Math.cos(h.flight.yaw) * 4.2,
            h.flight.z - Math.sin(h.flight.yaw) * 4.2,
            0.6,
            this.world!.obstacles,
            ARENA_RADIUS,
          );
          const cleanExit = resolveCircleEntities(exitPt.x, exitPt.z, 0.65, [
            { x: h.flight.x, z: h.flight.z, radius: 3.2 },
          ]);
          this.playerX = cleanExit.x;
          this.playerZ = cleanExit.z;
          this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
          this.playerVx = 0;
          this.playerVz = 0;
          this.weaponHolder.visible = !isUnarmedCampaign;
        }
      } else if (this.activeAircraft) {
        const ac = this.activeAircraft;
        const gy = groundHeightAt(ac.x, ac.z, this.mapId);
        const altAboveGround = ac.y - gy;
        this.activeAircraft = null;
        this.aircraftThreatWarning = 'none';
        this.sound.stopCockpitWarnings();
        this.sound.stopEngineCue();
        this.cameraSnapPending = true;
        this.vehicleReticleVisible = false;
        this.aircraftLockTargetName = null;
        this.aircraftLockTargetAcId = null;
        this.aircraftLockTargetVehId = null;
        if (altAboveGround > 4.2) {
          // Mid-air parachute bailout; aircraft glides unpiloted until crash explosion
          ac.mode = 'abandoned';
          ac.rig.pilotMesh.visible = false;
          ac.vy = -1.5;
          ac.crashKillerName = 'Pilot';
          ac.crashKillerTeam = this.playerTeam;
          ac.crashWeaponId = 'aircraft_cannon';

          this.isParachuting = true;
          this.parachuteSwayPhase = 0;
          if (!this.parachuteMesh) {
            this.parachuteMesh = createParachuteCanopy();
            this.scene.add(this.parachuteMesh);
          }
          this.parachuteMesh.visible = true;
          this.playerX = ac.x - Math.sin(ac.yaw) * 4.2 + Math.cos(ac.yaw) * 2.8;
          this.playerZ = ac.z - Math.cos(ac.yaw) * 4.2 - Math.sin(ac.yaw) * 2.8;
          this.playerY = Math.max(gy + 3.2, ac.y - 3.4);
          this.playerVx = Math.cos(ac.yaw) * 4.0;
          this.playerVz = -Math.sin(ac.yaw) * 4.0;
          this.playerVy = -2.2;
          this.playerGrounded = false;
          this.weaponHolder.visible = true;
          this.sound.playParachuteOpen();
          this.emitHud();
        } else {
          ac.mode = 'parked';
          ac.rig.pilotMesh.visible = false;
          const exitPt = resolveCircleObstacles(
            ac.x + Math.cos(ac.yaw) * 4.6,
            ac.z - Math.sin(ac.yaw) * 4.6,
            0.6,
            this.world!.obstacles,
            ARENA_RADIUS,
          );
          const cleanExit = resolveCircleEntities(exitPt.x, exitPt.z, 0.65, [
            { x: ac.x, z: ac.z, radius: 3.1 },
          ]);
          this.playerX = cleanExit.x;
          this.playerZ = cleanExit.z;
          this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
          this.playerVx = 0;
          this.playerVz = 0;
          this.weaponHolder.visible = true;
        }
      } else if (this.activeVehicle) {
        const v = this.activeVehicle;
        v.occupantIsPlayer = false;
        this.activeVehicle = null;
        this.sound.stopEngineCue();
        this.cameraSnapPending = true;
        this.vehicleReticleVisible = false;
        const exitPt = resolveCircleObstacles(
          v.x + Math.cos(v.yaw) * 3.6,
          v.z - Math.sin(v.yaw) * 3.6,
          0.6,
          this.world!.obstacles,
          ARENA_RADIUS,
        );
        const cleanExit = resolveCircleEntities(exitPt.x, exitPt.z, 0.65, [
          { x: v.x, z: v.z, radius: v.kind === 'tank' ? 2.85 : 2.25 },
        ]);
        this.playerX = cleanExit.x;
        this.playerZ = cleanExit.z;
        this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
        this.playerVx = 0;
        this.playerVz = 0;
        this.weaponHolder.visible = true;
      } else if (this.nearbyHelicopter) {
        const h = this.nearbyHelicopter;
        h.mode = 'player';
        h.rig.pilotMesh.visible = !this.vehicleInteriorCamera;
        h.flight.collective = 0.56;
        const gy = groundHeightAt(h.flight.x, h.flight.z, this.mapId);
        h.flight.y = Math.max(h.flight.y, gy + 2.0);
        this.activeHelicopter = h;
        this.playerYaw = h.flight.yaw + Math.PI;
        this.playerPitch = -0.05;
        this.cameraSnapPending = true;
        this.nearbyHelicopter = null;
        this.isAds = false;
        this.isBinocularsZoomed = false;
        this.isReloading = false;
        this.isParachuting = false;
        if (this.parachuteMesh) this.parachuteMesh.visible = false;
        this.weaponHolder.visible = false;
        this.worldFlashlight.visible = false;
        this.digPreviewMesh.visible = false;
      } else if (this.nearbyAircraft) {
        const ac = this.nearbyAircraft;
        ac.mode = 'player';
        ac.rig.pilotMesh.visible = !this.vehicleInteriorCamera;
        ac.speed = Math.max(28, ac.speed);
        ac.throttlePct = Math.max(60, ac.throttlePct);
        const gy = groundHeightAt(ac.x, ac.z, this.mapId);
        ac.y = Math.max(ac.y, gy + 5.0);
        ac.pitch = 0.08;
        this.flightAimYaw = ac.yaw;
        this.flightAimPitch = 0.08;
        this.activeAircraft = ac;
        this.cameraSnapPending = true;
        this.nearbyAircraft = null;
        this.isAds = false;
        this.isBinocularsZoomed = false;
        this.isReloading = false;
        this.isParachuting = false;
        if (this.parachuteMesh) this.parachuteMesh.visible = false;
        this.weaponHolder.visible = false;
        this.worldFlashlight.visible = false;
        this.digPreviewMesh.visible = false;
      } else if (this.nearbyVehicle) {
        this.activeVehicle = this.nearbyVehicle;
        this.activeVehicle.occupantIsPlayer = true;
        this.activeVehicle.rig.driverMesh.visible = !this.vehicleInteriorCamera;
        this.cameraSnapPending = true;
        this.nearbyVehicle = null;
        this.isAds = false;
        this.isBinocularsZoomed = false;
        this.isReloading = false;
        this.isParachuting = false;
        if (this.parachuteMesh) this.parachuteMesh.visible = false;
        this.weaponHolder.visible = false;
        this.worldFlashlight.visible = false;
        this.digPreviewMesh.visible = false;
      }
    }

    if (this.activeHelicopter) {
      this.updateDrivenHelicopter(dt, this.activeHelicopter);
      return;
    }

    if (this.activeAircraft) {
      this.updateDrivenAircraft(dt, this.activeAircraft);
      return;
    }

    if (this.activeVehicle) {
      this.updateDrivenVehicle(dt, this.activeVehicle);
      return;
    }

    // Stance transitions & crouch-slide physics
    const wasSprinting = Math.hypot(this.playerVx, this.playerVz) > 7.8;
    if (this.isActionJustPressed('crouch')) {
      this.stanceMode = this.stanceMode === 'crouch' ? 'stand' : 'crouch';
      if (this.stanceMode === 'crouch' && wasSprinting && this.playerGrounded) {
        this.playerVx *= 1.32;
        this.playerVz *= 1.32;
      }
    }
    if (this.isActionJustPressed('prone')) {
      this.stanceMode = this.stanceMode === 'prone' ? 'stand' : 'prone';
    }
    if (this.virtualJustPressed.has('walk')) {
      this.walkToggle = !this.walkToggle;
    }

    // 5-Slot Weapon & Gadget Switching (suppressed on unarmed campaign scenes)
    if (!isUnarmedCampaign) {
      const switchSlot = (target: 1 | 2 | 3 | 4 | 5) => {
        if (this.activeSlot === target) return;
        this.activeSlot = target;
        this.isReloading = false;
        this.isAds = false;
        this.isBinocularsZoomed = false;
        this.boltKick = 0.04;
        this.weaponHolder.visible = true;
        this.equipWeaponVisual(this.getActiveWeaponId());
      };
      if (this.isActionJustPressed('slot1')) switchSlot(1);
      else if (this.isActionJustPressed('slot2')) switchSlot(2);
      else if (this.isActionJustPressed('slot3')) switchSlot(3);
      else if (this.isActionJustPressed('slot4')) switchSlot(4);
      else if (this.isActionJustPressed('slot5')) switchSlot(5);

      if (this.isActionJustPressed('aim')) {
        this.isAds = !this.isAds;
      }
    } else {
      this.isAds = false;
      this.isBinocularsZoomed = false;
    }
    const fireHeldNow = this.mouseDownLeft || this.isActionHeld('fire');
    const adsActive =
      !isUnarmedCampaign &&
      (this.activeSlot === 4
        ? this.mouseDownRight || this.virtualHeld.has('aim') || this.isAds || fireHeldNow
        : this.mouseDownRight || this.virtualHeld.has('aim') || this.isAds);
    this.isBinocularsZoomed = !isUnarmedCampaign && this.activeSlot === 4 && adsActive;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, adsActive ? 1 : 0, 14, dt);

    // Subtle light aim assist when aiming or firing small arms/launchers
    if (
      !isUnarmedCampaign &&
      this.settings.aimAssistEnabled &&
      this.activeSlot <= 3 &&
      (adsActive || fireHeldNow)
    ) {
      const candidates: AimAssistCandidate[] = [];
      const eyeY = this.playerY + this.playerEyeHeight;
      for (let i = 0; i < this.bots.length; i++) {
        const b = this.bots[i];
        if (!b.alive || b.team === this.playerTeam) continue;
        const ty = b.y + (b.crouching ? 0.95 : 1.32);
        if (Math.hypot(b.x - this.playerX, b.z - this.playerZ) <= 115 && this.hasLineOfSight(this.playerX, eyeY, this.playerZ, b.x, ty, b.z)) {
          candidates.push({ x: b.x, y: ty, z: b.z });
        }
      }
      for (let i = 0; i < this.groundVehicles.length; i++) {
        const v = this.groundVehicles[i];
        if (!v.alive || v.team === this.playerTeam) continue;
        candidates.push({ x: v.x, y: v.y + 1.25, z: v.z });
      }
      const assist = computeLightAimAssist(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
        this.playerYaw,
        this.playerPitch,
        candidates,
        0.085,
        115,
        0.16,
        dt,
      );
      if (assist.active) {
        this.playerYaw += assist.yawDelta;
        this.playerPitch = THREE.MathUtils.clamp(
          this.playerPitch + assist.pitchDelta,
          -Math.PI * 0.44,
          Math.PI * 0.44,
        );
      }
    }

    const leanTarget =
      (this.isActionHeld('leanRight') ? 1 : 0) - (this.isActionHeld('leanLeft') ? 1 : 0);
    this.playerLean = THREE.MathUtils.damp(this.playerLean, leanTarget, 14, dt);

    let moveFwd = this.virtualMoveY;
    let moveRight = this.virtualMoveX;
    if (this.isActionHeld('moveForward')) moveFwd += 1;
    if (this.isActionHeld('moveBackward')) moveFwd -= 1;
    if (this.isActionHeld('moveRight')) moveRight += 1;
    if (this.isActionHeld('moveLeft')) moveRight -= 1;
    moveFwd = Math.max(-1, Math.min(1, moveFwd));
    moveRight = Math.max(-1, Math.min(1, moveRight));

    const wantsWalk = this.heldKeys.has(this.settings.bindings.walk) || this.walkToggle;
    const wantsSprint =
      this.isActionHeld('sprint') &&
      moveFwd > 0.25 &&
      !wantsWalk &&
      this.stanceMode === 'stand' &&
      !adsActive &&
      this.playerStamina > 5;

    if (wantsSprint) {
      this.playerStamina = Math.max(0, this.playerStamina - 20 * dt);
    } else {
      this.playerStamina = Math.min(100, this.playerStamina + 16 * dt);
    }

    const effPlayerW = this.getEffectiveWeapon(this.getActiveWeaponId());
    const baseTargetSpeed =
      (this.stanceMode === 'prone'
        ? 2.4
        : this.stanceMode === 'crouch'
          ? 4.4
          : wantsWalk
            ? 3.5
            : wantsSprint
              ? 10.6
              : adsActive
                ? 4.8
                : 7.2) * effPlayerW.moveSpeedMult;

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    let wishX = -sinY * moveFwd + cosY * moveRight;
    let wishZ = -cosY * moveFwd - sinY * moveRight;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1e-4) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    // Physical slope traction: uphill slows movement, downhill adds gravity glide
    const norm = groundNormalAt(this.playerX, this.playerZ, this.mapId);
    const slopeDot = wishX * norm.nx + wishZ * norm.nz; // positive = downhill, negative = uphill
    const slopeMult = this.playerGrounded ? THREE.MathUtils.clamp(1 + slopeDot * 0.48, 0.58, 1.24) : 1;

    const accel = this.playerGrounded ? (wishLen > 0.05 ? 11.5 : 8.5) : 2.8;
    const targetVx = wishX * baseTargetSpeed * slopeMult * Math.min(1, wishLen);
    const targetVz = wishZ * baseTargetSpeed * slopeMult * Math.min(1, wishLen);
    this.playerVx = THREE.MathUtils.damp(this.playerVx, targetVx, accel, dt);
    this.playerVz = THREE.MathUtils.damp(this.playerVz, targetVz, accel, dt);

    const speedNow = Math.hypot(this.playerVx, this.playerVz);
    if (speedNow > 0.05) {
      const nextX = this.playerX + this.playerVx * dt;
      const nextZ = this.playerZ + this.playerVz * dt;
      const resolved = resolveCircleObstacles(
        nextX,
        nextZ,
        0.58,
        this.world!.obstacles,
        ARENA_RADIUS,
      );
      this.playerX = resolved.x;
      this.playerZ = resolved.z;

      this.weaponBobPhase += dt * (speedNow * (wantsSprint ? 1.45 : 1.28));
      this.playerStepAccum += speedNow * dt;
      if (this.playerStepAccum > (wantsWalk ? 1.85 : 2.35) && this.playerGrounded) {
        this.playerStepAccum = 0;
        if (!wantsWalk) this.sound.playFootstep();
      }
    }

    // Solid hull collision against alive Ground Vehicles & low/parked Aircraft (prevents body clipping inside tanks/jeeps/planes)
    const solidHulls: Array<{ x: number; z: number; radius: number }> = [];
    for (let i = 0; i < this.groundVehicles.length; i++) {
      const gv = this.groundVehicles[i];
      if (!gv.alive) continue;
      solidHulls.push({ x: gv.x, z: gv.z, radius: gv.kind === 'tank' ? 2.85 : 2.25 });
    }
    for (let i = 0; i < this.aircrafts.length; i++) {
      const ac = this.aircrafts[i];
      if (!ac.alive) continue;
      if (ac.y - groundHeightAt(ac.x, ac.z, this.mapId) < 4.5) {
        solidHulls.push({ x: ac.x, z: ac.z, radius: 3.1 });
      }
    }
    for (let i = 0; i < this.helicopters.length; i++) {
      const h = this.helicopters[i];
      if (!h.alive) continue;
      if (h.flight.y - groundHeightAt(h.flight.x, h.flight.z, this.mapId) < 4.5) {
        solidHulls.push({ x: h.flight.x, z: h.flight.z, radius: 3.2 });
      }
    }
    if (solidHulls.length > 0) {
      const hullRes = resolveCircleEntities(this.playerX, this.playerZ, 0.58, solidHulls);
      this.playerX = hullRes.x;
      this.playerZ = hullRes.z;
    }

    // Smooth camera & weapon tilt physics (strafe bank + turn inertia + sprint/crouch posture)
    const localVelRight = this.playerVx * cosY - this.playerVz * sinY;
    const yawRate = (this.playerYaw - this.prevPlayerYaw) / Math.max(dt, 0.001);
    this.prevPlayerYaw = this.playerYaw;
    const targetCameraRoll =
      -this.playerLean * 0.165 -
      THREE.MathUtils.clamp(localVelRight * 0.0052, -0.048, 0.048) * (adsActive ? 0.45 : 1.0) +
      THREE.MathUtils.clamp(yawRate * 0.0075, -0.028, 0.028);
    this.cameraRoll = THREE.MathUtils.damp(this.cameraRoll, targetCameraRoll, 9.5, dt);
    this.weaponStrafeBank = THREE.MathUtils.damp(
      this.weaponStrafeBank,
      THREE.MathUtils.clamp(localVelRight * 0.011, -0.09, 0.09),
      10,
      dt,
    );
    this.sprintBlend = THREE.MathUtils.damp(
      this.sprintBlend,
      wantsSprint && speedNow > 6.5 ? 1 : 0,
      9,
      dt,
    );
    this.crouchBlend = THREE.MathUtils.damp(
      this.crouchBlend,
      this.stanceMode === 'crouch' || this.stanceMode === 'prone' ? 1 : 0,
      9,
      dt,
    );

    const targetEye =
      this.stanceMode === 'prone' ? 0.58 : this.stanceMode === 'crouch' ? 1.08 : 1.66;
    this.playerEyeHeight = THREE.MathUtils.damp(this.playerEyeHeight, targetEye, 11, dt);

    if (this.isActionJustPressed('jump') && this.playerGrounded) {
      this.playerVy = 7.4;
      this.playerGrounded = false;
      this.stanceMode = 'stand';
    }

    const terrainY = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
    if (this.isParachuting) {
      this.parachuteSwayPhase += dt;
      const chute = stepParachutePhysics(
        this.playerY,
        this.playerVy,
        this.parachuteSwayPhase,
        terrainY,
        dt,
      );
      this.playerY = chute.y;
      this.playerVy = chute.vy;
      this.cameraRoll = THREE.MathUtils.damp(this.cameraRoll, chute.swayRoll, 7, dt);
      if (this.parachuteMesh) {
        this.parachuteMesh.visible = !chute.landed;
        this.parachuteMesh.position.set(this.playerX, this.playerY + 2.15, this.playerZ);
        this.parachuteMesh.rotation.set(0, this.playerYaw, chute.swayRoll);
      }
      if (chute.landed) {
        this.isParachuting = false;
        this.playerGrounded = true;
        this.landingDip = 0.16;
        this.sound.playFootstep();
      }
    } else {
      const prevVy = this.playerVy;
      this.playerVy -= 20.5 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= terrainY) {
        if (!this.playerGrounded && prevVy < -3.5) {
          this.landingDip = Math.min(0.24, Math.abs(prevVy) * 0.022);
          this.sound.playFootstep();
        }
        this.playerY = terrainY;
        this.playerVy = 0;
        this.playerGrounded = true;
      }
    }
    this.landingDip = THREE.MathUtils.damp(this.landingDip, 0, 12, dt);

    const weapon = effPlayerW.spec;
    const isFirearm = this.activeSlot <= 3;
    const ammo = isFirearm
      ? this.slotAmmo[this.activeSlot as 1 | 2 | 3]
      : { mag: 0, reserve: 0 };

    if (!isUnarmedCampaign) {
      if (
        isFirearm &&
        this.isActionJustPressed('reload') &&
        !this.isReloading &&
        ammo.mag < weapon.magSize &&
        ammo.reserve > 0
      ) {
        this.isReloading = true;
        this.reloadTimer = weapon.reloadTime;
        this.sound.playReload();
      }
      if (this.isReloading && isFirearm) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          const needed = weapon.magSize - ammo.mag;
          const take = Math.min(needed, ammo.reserve);
          ammo.mag += take;
          ammo.reserve -= take;
          this.isReloading = false;
        }
      }

      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      const firePressed =
        this.mouseJustPressedLeft || this.isActionJustPressed('fire');
      const fireHeld =
        this.mouseDownLeft || this.isActionHeld('fire');

      if (this.activeSlot === 4) {
        // Binoculars: NEVER fires weapons! Zooming spots distant enemy soldiers for minimap recon.
        if (this.isBinocularsZoomed) {
          const fwdX = -Math.sin(this.playerYaw);
          const fwdZ = -Math.cos(this.playerYaw);
          for (const bot of this.bots) {
            if (!bot.alive || bot.team === this.playerTeam) continue;
            const dx = bot.x - this.playerX;
            const dz = bot.z - this.playerZ;
            const dist = Math.hypot(dx, dz);
            if (dist > 2 && dist < 175) {
              const dot = (dx * fwdX + dz * fwdZ) / dist;
              if (dot > 0.9 && this.hasLineOfSight(this.playerX, this.playerY + 1.6, this.playerZ, bot.x, bot.y + 1.3, bot.z)) {
                bot.spottedTimer = 8.0;
              }
            }
          }
        }
      } else if (this.activeSlot === 5) {
        // Shovel: Tap or hold Fire to dig a deep foxhole at the aimed ground ring anywhere!
        if ((firePressed || fireHeld) && this.fireCooldown <= 0) {
          this.swingShovelAndDig();
        }
      } else {
        const wantsFire = weapon.automatic ? fireHeld : firePressed;
        if (wantsFire && this.fireCooldown <= 0 && !this.isReloading) {
          if (ammo.mag > 0) {
            this.firePlayerWeapon();
          } else if (ammo.reserve > 0) {
            this.isReloading = true;
            this.reloadTimer = weapon.reloadTime;
            this.sound.playReload();
          }
        }
      }

      if (this.isActionJustPressed('grenade') && this.grenadesCount > 0) {
        this.throwGrenade();
      }
    }

    if (this.shovelSwingTimer > 0) {
      this.shovelSwingTimer = Math.max(0, this.shovelSwingTimer - dt);
    }
    if (this.resupplyFlashTimer > 0) {
      this.resupplyFlashTimer = Math.max(0, this.resupplyFlashTimer - dt);
    }
    this.breathPhase += dt * 1.9;
    this.weaponSwayYaw = THREE.MathUtils.damp(this.weaponSwayYaw, 0, 10, dt);
    this.weaponSwayPitch = THREE.MathUtils.damp(this.weaponSwayPitch, 0, 10, dt);
    this.recoilPitchOffset = THREE.MathUtils.damp(this.recoilPitchOffset, 0, 13, dt);
    this.recoilRollOffset = THREE.MathUtils.damp(this.recoilRollOffset, 0, 14, dt);
    this.recoilKickZ = THREE.MathUtils.damp(this.recoilKickZ, 0, 12, dt);
    this.boltKick = THREE.MathUtils.damp(this.boltKick, 0, 18, dt);
    if (this.fpMuzzleTimer > 0) {
      this.fpMuzzleTimer -= dt;
      if (this.fpRig && this.fpMuzzleTimer <= 0) {
        this.fpRig.muzzleFlash.visible = false;
      }
    }
  }

  private applyGroundVehicleSuspension(
    v: GroundVehicleEntity,
    longitudinalAccel: number,
    lateralTurnSpeed: number,
    dt: number,
  ): void {
    const isTank = v.kind === 'tank';
    const halfX = isTank ? 1.74 : 1.12;
    const halfZ = isTank ? 2.45 : 1.37;
    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);
    const sampleCorner = (lx: number, lz: number) =>
      groundHeightAt(v.x + lx * cosY + lz * sinY, v.z - lx * sinY + lz * cosY, this.mapId);

    const wheelHeights: [number, number, number, number] = [
      sampleCorner(-halfX, halfZ),
      sampleCorner(halfX, halfZ),
      sampleCorner(-halfX, -halfZ),
      sampleCorner(halfX, -halfZ),
    ];

    v.suspension = stepSuspensionArticulation(
      v.suspension,
      v.y,
      wheelHeights,
      halfZ,
      halfX,
      longitudinalAccel,
      lateralTurnSpeed,
      isTank ? 0.2 : 0.28,
      dt,
    );

    v.rig.root.position.set(v.x, v.y, v.z);
    v.rig.root.rotation.order = 'YXZ';
    v.rig.root.rotation.set(0, v.yaw, 0);
    v.rig.turret.rotation.y = v.turretYaw - v.yaw;
    v.rig.gun.rotation.x = -v.gunPitch;

    for (let w = 0; w < v.rig.wheels.length; w++) {
      v.rig.wheels[w].rotation.x = v.wheelSpin;
    }
    if (v.kind === 'jeep') {
      const jeepRig = v.rig as MilitaryJeepRig;
      jeepRig.chassis.position.y = v.suspension.chassisHeave;
      jeepRig.chassis.rotation.set(v.suspension.chassisPitch, 0, v.suspension.chassisRoll);
      for (let k = 0; k < 4; k++) {
        jeepRig.wheelSuspensionPivots[k].position.y = 0.49 + v.suspension.wheelOffsets[k];
        jeepRig.shockStruts[k].position.y = 0.76 + v.suspension.wheelOffsets[k] * 0.5;
      }
      jeepRig.frontWheelPivots[0].rotation.y = v.steerAngle;
      jeepRig.frontWheelPivots[1].rotation.y = v.steerAngle;
      jeepRig.steerWheel.rotation.z = v.steerAngle * 2.1;
    } else {
      const tankRig = v.rig as BattleTankRig;
      tankRig.hull.position.y = v.suspension.chassisHeave;
      tankRig.hull.rotation.set(v.suspension.chassisPitch, 0, v.suspension.chassisRoll);
      for (let w = 0; w < 5; w++) {
        const t = w / 4;
        const leftOff = v.suspension.wheelOffsets[2] * (1 - t) + v.suspension.wheelOffsets[0] * t;
        const rightOff = v.suspension.wheelOffsets[3] * (1 - t) + v.suspension.wheelOffsets[1] * t;
        if (tankRig.roadWheelGroups[w]) {
          tankRig.roadWheelGroups[w].position.y = 0.42 + leftOff;
        }
        if (tankRig.roadWheelGroups[w + 5]) {
          tankRig.roadWheelGroups[w + 5].position.y = 0.42 + rightOff;
        }
      }
      tankRig.barrelGroup.position.z = v.barrelRecoil;
    }
  }

  private updateDrivenVehicle(dt: number, v: GroundVehicleEntity): void {
    let moveFwd = this.virtualMoveY;
    let moveRight = this.virtualMoveX;
    if (this.isActionHeld('moveForward')) moveFwd += 1;
    if (this.isActionHeld('moveBackward')) moveFwd -= 1;
    if (this.isActionHeld('moveRight')) moveRight += 1;
    if (this.isActionHeld('moveLeft')) moveRight -= 1;
    moveFwd = Math.max(-1, Math.min(1, moveFwd));
    moveRight = Math.max(-1, Math.min(1, moveRight));

    const maxSpeed = v.kind === 'tank' ? 10.5 : 16.5;
    const stepped = stepVehicleDriving(
      v.kind,
      {
        x: v.x,
        z: v.z,
        yaw: v.yaw,
        speed: v.speed,
        steerAngle: v.steerAngle,
      },
      moveFwd,
      moveRight,
      dt,
    );

    const resolved = resolveCircleObstacles(
      stepped.x,
      stepped.z,
      v.kind === 'tank' ? 2.75 : 2.2,
      this.world!.obstacles,
      ARENA_RADIUS - 5,
    );
    const pushDist = Math.hypot(resolved.x - stepped.x, resolved.z - stepped.z);
    v.x = resolved.x;
    v.z = resolved.z;
    const prevYaw = v.yaw;
    v.yaw = stepped.yaw;
    const nextSpeed = pushDist > 0.025 ? stepped.speed * 0.82 : stepped.speed;
    const longAccel = (nextSpeed - v.prevSpeed) / Math.max(dt, 0.004);
    v.prevSpeed = nextSpeed;
    v.speed = nextSpeed;
    v.steerAngle = stepped.steerAngle;
    v.y = groundHeightAt(v.x, v.z, this.mapId);
    v.wheelSpin += v.speed * dt * 1.45;
    v.barrelRecoil = THREE.MathUtils.damp(v.barrelRecoil, 0, 6.5, dt);

    this.playerX = v.x;
    this.playerY = v.y;
    this.playerZ = v.z;
    this.playerVx = Math.sin(v.yaw) * v.speed;
    this.playerVz = Math.cos(v.yaw) * v.speed;

    // Turret tracks player's world aim yaw (vehicle local forward is +Z, camera forward is -Z)
    const desiredWorldTurretYaw = this.playerYaw + Math.PI;
    v.turretYaw = this.dampAngle(v.turretYaw, desiredWorldTurretYaw, 7.5, dt);
    v.gunPitch = THREE.MathUtils.clamp(this.playerPitch * 0.72, -0.22, 0.38);

    const lateralTurnSpeed = ((v.yaw - prevYaw) / Math.max(dt, 0.004)) * v.speed;
    v.rig.driverMesh.visible = !this.vehicleInteriorCamera;
    this.applyGroundVehicleSuspension(v, longAccel, lateralTurnSpeed, dt);

    // Project gun reticle onto HUD
    v.rig.muzzlePoint.getWorldPosition(_v1);
    const cosP = Math.cos(v.gunPitch);
    _v2.set(Math.sin(v.turretYaw) * cosP, Math.sin(v.gunPitch), Math.cos(v.turretYaw) * cosP).normalize();
    _v3.copy(_v1).addScaledVector(_v2, 65).project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const hw = (rect.width || window.innerWidth) * 0.5;
    const hh = (rect.height || window.innerHeight) * 0.5;
    if (_v3.z <= 1) {
      this.vehicleReticleX = THREE.MathUtils.clamp(_v3.x * hw, -hw * 0.45, hw * 0.45);
      this.vehicleReticleY = THREE.MathUtils.clamp(-_v3.y * hh, -hh * 0.45, hh * 0.45);
      this.vehicleReticleVisible = true;
    } else {
      this.vehicleReticleVisible = false;
    }

    this.sound.playEngineCue('ground', Math.abs(v.speed) / maxSpeed, this.vehicleInteriorCamera);

    v.fireCooldown = Math.max(0, v.fireCooldown - dt);
    const wantsFire =
      this.mouseDownLeft ||
      this.mouseJustPressedLeft ||
      this.isActionHeld('fire') ||
      this.isActionJustPressed('fire');

    if (wantsFire && v.fireCooldown <= 0 && v.ammo > 0) {
      this.fireGroundVehicleWeapon(v, true);
    }

    if (this.isNearAlliedResupply() && v.ammo < v.maxAmmo) {
      v.ammo = Math.min(v.maxAmmo, v.ammo + (v.kind === 'tank' ? 1 : 8));
    }
  }

  private updateDrivenAircraft(dt: number, ac: CombatAircraftEntity): void {
    let manualSteer = this.virtualMoveX;
    if (this.isActionHeld('moveRight')) manualSteer += 1;
    if (this.isActionHeld('moveLeft')) manualSteer -= 1;
    manualSteer = THREE.MathUtils.clamp(manualSteer, -1, 1);

    let throttle = this.virtualMoveY;
    if (this.isActionHeld('moveForward')) throttle += 1;
    if (this.isActionHeld('moveBackward')) throttle -= 1;
    throttle = THREE.MathUtils.clamp(throttle, -1, 1);
    ac.throttlePct = THREE.MathUtils.clamp(ac.throttlePct + throttle * 45 * dt, 10, 100);

    const manualPitch = THREE.MathUtils.clamp(
      (this.isActionHeld('leanLeft') || this.isActionHeld('jump') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
        (this.isActionHeld('leanRight') || this.isActionHeld('crouch') || this.heldKeys.has('ArrowDown') ? 1 : 0),
      -1,
      1,
    );

    if (Math.abs(manualSteer) > 0.05) {
      this.flightAimYaw -= manualSteer * 1.35 * dt;
    }
    if (Math.abs(manualPitch) > 0.05) {
      this.flightAimPitch = THREE.MathUtils.clamp(this.flightAimPitch + manualPitch * 1.15 * dt, -0.78, 0.78);
    }

    const instructor = computeFlightInstructorInputs(
      ac.yaw,
      ac.pitch,
      this.flightAimYaw,
      this.flightAimPitch,
    );
    const steerInput = Math.abs(manualSteer) > 0.08 ? manualSteer : instructor.steerInput;
    const pitchInput = Math.abs(manualPitch) > 0.08 ? manualPitch : instructor.pitchInput;

    const floorY = groundHeightAt(ac.x, ac.z, this.mapId) + 2.2;
    const next = stepFlightPhysics(
      {
        x: ac.x,
        y: ac.y,
        z: ac.z,
        yaw: ac.yaw,
        pitch: ac.pitch,
        roll: ac.bankRoll,
        speed: ac.speed,
      },
      throttle,
      steerInput,
      pitchInput,
      floorY,
      dt,
      ARENA_RADIUS - 12,
    );

    ac.x = next.x;
    ac.y = next.y;
    ac.z = next.z;
    ac.yaw = next.yaw;
    ac.pitch = next.pitch;
    ac.bankRoll = next.roll;
    ac.speed = next.speed;

    this.playerX = ac.x;
    this.playerY = ac.y;
    this.playerZ = ac.z;
    this.playerVx = Math.sin(ac.yaw) * ac.speed;
    this.playerVz = Math.cos(ac.yaw) * ac.speed;
    this.playerYaw = ac.yaw + Math.PI;
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, 0, 2.4, dt);

    ac.rig.propeller.rotation.z += dt * (24 + ac.speed * 0.65);
    ac.rig.propDisc.visible = ac.speed > 14;
    ac.rig.aileronL.rotation.x = THREE.MathUtils.damp(ac.rig.aileronL.rotation.x, steerInput * 0.45, 12, dt);
    ac.rig.aileronR.rotation.x = THREE.MathUtils.damp(ac.rig.aileronR.rotation.x, -steerInput * 0.45, 12, dt);
    ac.rig.elevator.rotation.x = THREE.MathUtils.damp(ac.rig.elevator.rotation.x, -pitchInput * 0.42, 12, dt);
    ac.rig.rudder.rotation.y = THREE.MathUtils.damp(ac.rig.rudder.rotation.y, -steerInput * 0.35, 12, dt);
    ac.rig.landingGear.visible = ac.y - groundHeightAt(ac.x, ac.z, this.mapId) < 9.5;
    ac.rig.wingBombs[0].visible = ac.bombsLeft >= 1;
    ac.rig.wingBombs[1].visible = ac.bombsLeft >= 2;
    ac.rig.wingMissiles[0].visible = ac.missilesLeft >= 1;
    ac.rig.wingMissiles[1].visible = ac.missilesLeft >= 2;

    ac.rig.root.position.set(ac.x, ac.y, ac.z);
    ac.rig.root.rotation.y = ac.yaw;
    ac.rig.airframe.rotation.set(-ac.pitch, 0, ac.bankRoll);
    ac.rig.pilotMesh.visible = !this.vehicleInteriorCamera;

    if (ac.muzzleTimer > 0) {
      ac.muzzleTimer -= dt;
      if (ac.muzzleTimer <= 0) {
        ac.rig.muzzleFlashL.visible = false;
        ac.rig.muzzleFlashR.visible = false;
      }
    }

    const rect = this.container.getBoundingClientRect();
    const hw = (rect.width || window.innerWidth) * 0.5;
    const hh = (rect.height || window.innerHeight) * 0.5;

    // Project War Thunder Instructor Aim Cursor onto HUD
    const aimCosP = Math.cos(this.flightAimPitch);
    _v4.set(
      Math.sin(this.flightAimYaw) * aimCosP,
      Math.sin(this.flightAimPitch),
      Math.cos(this.flightAimYaw) * aimCosP,
    ).normalize();
    _v3.set(ac.x, ac.y, ac.z).addScaledVector(_v4, 110).project(this.camera);
    if (_v3.z <= 1) {
      this.flightAimX = THREE.MathUtils.clamp(_v3.x * hw, -hw * 0.44, hw * 0.44);
      this.flightAimY = THREE.MathUtils.clamp(-_v3.y * hh, -hh * 0.44, hh * 0.44);
    }

    // Project airframe nose reticle + scan forward IR seeker lock cone
    const cosP = Math.cos(ac.pitch);
    _v2.set(Math.sin(ac.yaw) * cosP, Math.sin(ac.pitch), Math.cos(ac.yaw) * cosP).normalize();
    _v3.set(ac.x, ac.y, ac.z).addScaledVector(_v2, 95).project(this.camera);
    if (_v3.z <= 1) {
      this.vehicleReticleX = THREE.MathUtils.clamp(_v3.x * hw, -hw * 0.45, hw * 0.45);
      this.vehicleReticleY = THREE.MathUtils.clamp(-_v3.y * hh, -hh * 0.45, hh * 0.45);
      this.vehicleReticleVisible = true;
    } else {
      this.vehicleReticleVisible = false;
    }

    // IR Seeker Cone Scan vs Enemy Aircraft & Armored Ground Vehicles
    let bestLockDot = 0.78;
    let lockAcId: number | null = null;
    let lockVehId: number | null = null;
    let lockName: string | null = null;
    for (let i = 0; i < this.aircrafts.length; i++) {
      const target = this.aircrafts[i];
      if (!target.alive || target.team === ac.team || target.mode === 'crashing') continue;
      const dx = target.x - ac.x;
      const dy = target.y - ac.y;
      const dz = target.z - ac.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 8 || d > 210) continue;
      const dot = (dx * _v2.x + dy * _v2.y + dz * _v2.z) / d;
      if (dot > bestLockDot) {
        bestLockDot = dot;
        lockAcId = target.id;
        lockVehId = null;
        lockName = target.team === 'axis' ? 'Axis Fighter' : 'Allied Fighter';
      }
    }
    for (let i = 0; i < this.groundVehicles.length; i++) {
      const target = this.groundVehicles[i];
      if (!target.alive || target.team === ac.team) continue;
      const dx = target.x - ac.x;
      const dy = target.y + 1.2 - ac.y;
      const dz = target.z - ac.z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 10 || d > 195) continue;
      const dot = (dx * _v2.x + dy * _v2.y + dz * _v2.z) / d;
      if (dot > bestLockDot) {
        bestLockDot = dot;
        lockAcId = null;
        lockVehId = target.id;
        lockName = target.kind === 'tank' ? 'Enemy Tank' : 'Enemy Truck';
      }
    }
    this.aircraftLockTargetAcId = lockAcId;
    this.aircraftLockTargetVehId = lockVehId;
    this.aircraftLockTargetName = lockName;
    if (lockName && ac.missilesLeft > 0) {
      this.lockToneAccum += dt;
      if (this.lockToneAccum >= 0.55) {
        this.lockToneAccum = 0;
        this.sound.playMissileLockTone();
      }
    } else {
      this.lockToneAccum = 0.4;
    }

    this.sound.playEngineCue('air', ac.speed / 58, this.vehicleInteriorCamera);

    ac.fireCooldown = Math.max(0, ac.fireCooldown - dt);
    ac.rocketCooldown = Math.max(0, ac.rocketCooldown - dt);
    ac.bombCooldown = Math.max(0, ac.bombCooldown - dt);

    const wantsFire =
      this.mouseDownLeft ||
      this.mouseJustPressedLeft ||
      this.isActionHeld('fire') ||
      this.isActionJustPressed('fire');
    if (wantsFire && ac.fireCooldown <= 0 && ac.ammo > 0) {
      ac.fireCooldown = 0.095;
      ac.ammo = Math.max(0, ac.ammo - 2);
      ac.muzzleTimer = 0.05;
      ac.rig.muzzleFlashL.visible = true;
      ac.rig.muzzleFlashR.visible = true;
      ac.rig.muzzleL.getWorldPosition(_v1);
      ac.rig.muzzleR.getWorldPosition(_v4);
      for (const mp of [_v1, _v4]) {
        this.spawnBallisticBullet(
          mp.x + _v2.x * 0.8,
          mp.y + _v2.y * 0.8,
          mp.z + _v2.z * 0.8,
          _v2.x * 195,
          _v2.y * 195,
          _v2.z * 195,
          0.35,
          0.05,
          ac.team,
          'Pilot',
          true,
          'bar',
          false,
          0xe8b85a,
        );
      }
      this.sound.playAircraftCannon(1.0);
    }

    if (this.isActionJustPressed('dropBomb')) {
      this.tryDropAircraftBomb(ac);
    }
    if (
      this.isActionJustPressed('fireMissile') ||
      this.isActionJustPressed('aim') ||
      this.mouseDownRight
    ) {
      this.tryFireAircraftMissile(ac);
    }
    if (this.isActionJustPressed('flare') || this.isActionJustPressed('grenade')) {
      this.deployAircraftFlares();
    }

    // Airfield low-altitude flyover ordnance & flare resupply
    if (Math.hypot(ac.x - ac.homeX, ac.z - ac.homeZ) < 28 && ac.y - groundHeightAt(ac.x, ac.z, this.mapId) < 22) {
      if (
        ac.bombsLeft < ac.bombsMax ||
        ac.missilesLeft < ac.missilesMax ||
        ac.flaresLeft < ac.flaresMax ||
        ac.ammo < ac.maxAmmo
      ) {
        ac.bombsLeft = ac.bombsMax;
        ac.missilesLeft = ac.missilesMax;
        ac.flaresLeft = ac.flaresMax;
        ac.ammo = ac.maxAmmo;
      }
    }
  }

  private updateDrivenHelicopter(dt: number, h: CombatHelicopterEntity): void {
    let cyclicFwd = this.virtualMoveY;
    let yawInput = this.virtualMoveX;
    if (this.isActionHeld('moveForward')) cyclicFwd += 1;
    if (this.isActionHeld('moveBackward')) cyclicFwd -= 1;
    if (this.isActionHeld('moveRight')) yawInput += 1;
    if (this.isActionHeld('moveLeft')) yawInput -= 1;
    cyclicFwd = THREE.MathUtils.clamp(cyclicFwd, -1, 1);
    yawInput = THREE.MathUtils.clamp(yawInput, -1, 1);

    const collectiveDelta =
      (this.isActionHeld('jump') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
      (this.isActionHeld('crouch') || this.heldKeys.has('ArrowDown') ? 1 : 0);
    const cyclicStrafe =
      (this.isActionHeld('leanRight') ? 1 : 0) -
      (this.isActionHeld('leanLeft') ? 1 : 0);

    const floorY = groundHeightAt(h.flight.x, h.flight.z, this.mapId);
    h.flight = stepHelicopterPhysics(
      h.flight,
      cyclicFwd,
      yawInput,
      collectiveDelta,
      floorY,
      dt,
      cyclicStrafe,
    );

    this.playerX = h.flight.x;
    this.playerY = h.flight.y;
    this.playerZ = h.flight.z;
    this.playerVx = h.flight.vx;
    this.playerVz = h.flight.vz;

    h.rig.mainRotor.rotation.y = h.flight.rotorPhase;
    h.rig.mainRotorDisc.visible = h.flight.collective > 0.3;
    h.rig.tailRotor.rotation.x = h.flight.rotorPhase * 2.1;

    // Chin turret smoothly aims toward player's look direction
    const aimYawLocal = this.normalizeAngle(this.playerYaw + Math.PI - h.flight.yaw);
    h.rig.gunTurret.rotation.y = THREE.MathUtils.clamp(aimYawLocal, -1.15, 1.15);
    h.rig.gunTurret.rotation.x = THREE.MathUtils.clamp(-this.playerPitch * 0.65, -0.35, 0.55);

    h.rig.root.position.set(h.flight.x, h.flight.y, h.flight.z);
    h.rig.root.rotation.y = h.flight.yaw;
    h.rig.airframe.rotation.set(-h.flight.pitch, 0, -h.flight.roll);
    h.rig.pilotMesh.visible = !this.vehicleInteriorCamera;

    if (h.muzzleTimer > 0) {
      h.muzzleTimer -= dt;
      if (h.muzzleTimer <= 0) h.rig.muzzleFlash.visible = false;
    }

    // Project chin autocannon aim point onto HUD reticle
    h.rig.muzzlePoint.getWorldPosition(_v1);
    _v2.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    _v3.copy(_v1).addScaledVector(_v2, 85).project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const hw = (rect.width || window.innerWidth) * 0.5;
    const hh = (rect.height || window.innerHeight) * 0.5;
    if (_v3.z <= 1) {
      this.vehicleReticleX = THREE.MathUtils.clamp(_v3.x * hw, -hw * 0.45, hw * 0.45);
      this.vehicleReticleY = THREE.MathUtils.clamp(-_v3.y * hh, -hh * 0.45, hh * 0.45);
      this.vehicleReticleVisible = true;
    } else {
      this.vehicleReticleVisible = false;
    }
    this.aircraftLockTargetName = null;
    this.aircraftLockTargetAcId = null;
    this.aircraftLockTargetVehId = null;

    this.sound.playEngineCue('heli', Math.max(0.35, h.flight.collective), this.vehicleInteriorCamera);

    h.fireCooldown = Math.max(0, h.fireCooldown - dt);
    h.rocketCooldown = Math.max(0, h.rocketCooldown - dt);

    const wantsFire =
      this.mouseDownLeft ||
      this.mouseJustPressedLeft ||
      this.isActionHeld('fire') ||
      this.isActionJustPressed('fire');
    if (wantsFire && h.fireCooldown <= 0 && h.ammo > 0) {
      h.fireCooldown = 0.085;
      h.ammo = Math.max(0, h.ammo - 1);
      h.muzzleTimer = 0.05;
      h.rig.muzzleFlash.visible = true;
      h.rig.muzzlePoint.getWorldPosition(_v1);
      this.spawnBallisticBullet(
        _v1.x + _v2.x * 0.65,
        _v1.y + _v2.y * 0.65,
        _v1.z + _v2.z * 0.65,
        _v2.x * 200,
        _v2.y * 200,
        _v2.z * 200,
        0.3,
        0.04,
        h.team,
        'Pilot',
        true,
        'bar',
        false,
        0xe8b85a,
      );
      this.spawnSmokePuff(_v1.x, _v1.y, _v1.z, 0, 0.35, 0, 0.42, 0.25, 0.9, 0xd6d3d1, 0.24);
      this.sound.playAircraftCannon(0.88);
    }

    if (
      this.isActionJustPressed('fireMissile') ||
      this.isActionJustPressed('aim') ||
      this.mouseDownRight
    ) {
      this.tryFireHelicopterRocket(h);
    }
    if (this.isActionJustPressed('flare') || this.isActionJustPressed('grenade')) {
      this.deployAircraftFlares();
    }

    // Helipad low-hover ordnance & flare resupply
    if (Math.hypot(h.flight.x - h.homeX, h.flight.z - h.homeZ) < 20 && h.flight.y - floorY < 10) {
      h.rocketsLeft = h.rocketsMax;
      h.flaresLeft = h.flaresMax;
      h.ammo = h.maxAmmo;
    }
  }

  private tryFireHelicopterRocket(h: CombatHelicopterEntity): void {
    if (h.rocketCooldown > 0 || h.rocketsLeft <= 0) return;
    h.rocketCooldown = 0.55;
    h.rocketsLeft -= 1;

    _v2.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const sideSign = h.rocketsLeft % 2 === 0 ? -1 : 1;
    const rx = h.flight.x + Math.cos(h.flight.yaw) * sideSign * 1.9 + Math.sin(h.flight.yaw) * 1.4;
    const ry = h.flight.y - 0.15;
    const rz = h.flight.z - Math.sin(h.flight.yaw) * sideSign * 1.9 + Math.cos(h.flight.yaw) * 1.4;

    this.spawnBallisticBullet(
      rx,
      ry,
      rz,
      _v2.x * 112,
      _v2.y * 112,
      _v2.z * 112,
      0.35,
      0.04,
      h.team,
      'Pilot',
      true,
      'rpg7',
      true,
      0xf97316,
    );
    this.spawnSmokePuff(rx, ry, rz, -_v2.x * 3, 0.6, -_v2.z * 3, 0.75, 0.5, 1.85, 0xe5e7eb, 0.45);
    this.sound.playMissileLaunch();
    this.emitHud();
  }

  private damageHelicopter(
    h: CombatHelicopterEntity,
    amount: number,
    killerName: string,
    killerTeam: Team,
    weaponId: KillcamInfo['killerWeaponId'],
    fromPlayer: boolean,
  ): void {
    if (!h.alive || h.mode === 'crashing') return;
    h.hp -= amount;
    if (h.hp <= 0) {
      h.hp = 0;
      if (h.mode === 'player') {
        if (this.activeHelicopter === h) {
          this.activeHelicopter = null;
          this.weaponHolder.visible = true;
        }
        this.damagePlayer(100, killerName, killerTeam, weaponId, h.flight.x, h.flight.z);
      }
      if (fromPlayer) {
        this.kills += 1;
        this.score += 360;
        this.careerProgress = {
          ...this.careerProgress,
          careerKills: this.careerProgress.careerKills + 1,
        };
        saveCareerProgress(this.careerProgress);
        this.hitmarkerKind = 'kill';
        this.hitmarkerTimer = 0.3;
        this.sound.playHitmarker(true);
      }
      this.pushKillFeed({
        id: this.nextKillFeedId++,
        killerName,
        killerTeam,
        victimName: h.team === 'allies' ? 'Allied Gunship' : 'Axis Gunship',
        victimTeam: h.team,
        weaponId,
        isHeadshot: false,
        timestamp: this.matchElapsed,
      });

      const gy = groundHeightAt(h.flight.x, h.flight.z, this.mapId);
      if (h.flight.y - gy > 3.5) {
        h.mode = 'crashing';
        h.flight.vy = -4.5;
        h.crashKillerName = killerName;
        h.crashKillerTeam = killerTeam;
        this.spawnExplosionVfx(h.flight.x, h.flight.y, h.flight.z, 6.5);
      } else {
        h.alive = false;
        h.respawnTimer = 34.0;
        h.rig.root.visible = false;
        this.spawnExplosionVfx(h.flight.x, h.flight.y, h.flight.z, 12.5);
        const distP = Math.hypot(h.flight.x - this.playerX, h.flight.z - this.playerZ);
        this.sound.playExplosion(Math.max(0.25, 1 - distP / 170));
      }
    } else if (fromPlayer) {
      this.hitmarkerKind = 'hit';
      this.hitmarkerTimer = 0.14;
      this.sound.playHitmarker(false);
    }
  }

  private tryDropAircraftBomb(ac: CombatAircraftEntity): void {
    if (ac.bombCooldown > 0 || ac.bombsLeft <= 0) return;
    ac.bombCooldown = 0.65;
    ac.bombsLeft -= 1;

    const mesh = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({ color: 0x3a4332, roughness: 0.45, metalness: 0.4 });
    const fMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5, metalness: 0.25 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 4, 8), bMat);
    body.rotation.x = Math.PI / 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.22), fMat);
    fin.position.z = -0.52;
    mesh.add(body, fin);

    const sideSign = ac.bombsLeft % 2 === 0 ? -1 : 1;
    const bx = ac.x + Math.cos(ac.yaw) * sideSign * 1.85;
    const by = ac.y - 0.65;
    const bz = ac.z - Math.sin(ac.yaw) * sideSign * 1.85;
    mesh.position.set(bx, by, bz);
    mesh.rotation.y = ac.yaw;
    this.scene.add(mesh);

    const cosP = Math.cos(ac.pitch);
    this.airBombs.push({
      mesh,
      x: bx,
      y: by,
      z: bz,
      vx: Math.sin(ac.yaw) * cosP * ac.speed,
      vy: Math.sin(ac.pitch) * ac.speed - 2.0,
      vz: Math.cos(ac.yaw) * cosP * ac.speed,
      ownerTeam: ac.team,
      ownerName: 'Pilot',
      fromPlayer: true,
      life: 10,
    });
    this.sound.playBombDrop();
    this.emitHud();
  }

  private tryFireAircraftMissile(ac: CombatAircraftEntity): void {
    if (ac.rocketCooldown > 0 || ac.missilesLeft <= 0) return;
    ac.rocketCooldown = 1.4;
    ac.missilesLeft -= 1;

    const mesh = this.createMissileMesh();

    const cosP = Math.cos(ac.pitch);
    const fx = Math.sin(ac.yaw) * cosP;
    const fy = Math.sin(ac.pitch);
    const fz = Math.cos(ac.yaw) * cosP;
    const sideSign = ac.missilesLeft % 2 === 0 ? -1 : 1;
    const mx = ac.x + Math.cos(ac.yaw) * sideSign * 3.1 + fx * 1.4;
    const my = ac.y - 0.4 + fy * 1.4;
    const mz = ac.z - Math.sin(ac.yaw) * sideSign * 3.1 + fz * 1.4;
    mesh.position.set(mx, my, mz);
    this.scene.add(mesh);

    const initSpeed = Math.max(ac.speed + 26, 78);
    this.homingMissiles.push({
      mesh,
      x: mx,
      y: my,
      z: mz,
      vx: fx * initSpeed,
      vy: fy * initSpeed,
      vz: fz * initSpeed,
      targetAircraftId: this.aircraftLockTargetAcId,
      targetVehicleId: this.aircraftLockTargetVehId,
      divertedByFlare: false,
      ownerTeam: ac.team,
      ownerName: 'Pilot',
      fromPlayer: true,
      life: 6.5,
      smokeAccum: 0,
    });
    this.sound.playMissileLaunch();
    this.emitHud();
  }

  private updateAirBombs(dt: number): void {
    for (let i = this.airBombs.length - 1; i >= 0; i--) {
      const b = this.airBombs[i];
      b.life -= dt;
      const next = stepBombDrop(b.x, b.y, b.z, b.vx, b.vy, b.vz, dt);
      b.x = next.x;
      b.y = next.y;
      b.z = next.z;
      b.vx = next.vx;
      b.vy = next.vy;
      b.vz = next.vz;

      b.mesh.position.set(b.x, b.y, b.z);
      _v1.set(b.vx, b.vy, b.vz).normalize();
      _quat.setFromUnitVectors(_v4.set(0, 0, 1), _v1);
      b.mesh.quaternion.copy(_quat);

      const gy = groundHeightAt(b.x, b.z, this.mapId, this.foxholes);
      if (b.y <= gy + 0.25 || b.life <= 0) {
        this.detonateOrdnance(b.x, gy + 0.3, b.z, 15.5, 220, b.ownerTeam, b.ownerName, b.fromPlayer, 'aircraft_bomb');
        this.scene.remove(b.mesh);
        this.airBombs.splice(i, 1);
      }
    }
  }

  private updateFlares(dt: number): void {
    for (let i = this.activeFlares.length - 1; i >= 0; i--) {
      const fl = this.activeFlares[i];
      fl.life -= dt;
      fl.vx *= Math.max(0.2, 1 - 1.15 * dt);
      fl.vz *= Math.max(0.2, 1 - 1.15 * dt);
      fl.vy -= 5.8 * dt;
      fl.x += fl.vx * dt;
      fl.y += fl.vy * dt;
      fl.z += fl.vz * dt;
      fl.mesh.position.set(fl.x, fl.y, fl.z);
      const flareScale = 0.88 + Math.sin(fl.life * 28) * 0.18;
      fl.mesh.scale.setScalar(flareScale);

      fl.smokeAccum += dt;
      if (fl.smokeAccum >= 0.04) {
        fl.smokeAccum = 0;
        this.spawnSmokePuff(
          fl.x,
          fl.y,
          fl.z,
          (Math.random() - 0.5) * 1.4,
          0.9 + Math.random() * 0.9,
          (Math.random() - 0.5) * 1.4,
          0.75,
          0.42,
          1.45,
          0xf5f5f4,
          0.38,
        );
      }

      const gy = groundHeightAt(fl.x, fl.z, this.mapId, this.foxholes);
      if (fl.life <= 0 || fl.y <= gy + 0.15) {
        this.scene.remove(fl.mesh);
        this.activeFlares.splice(i, 1);
      }
    }
  }

  private updateHomingMissiles(dt: number): void {
    for (let i = this.homingMissiles.length - 1; i >= 0; i--) {
      const m = this.homingMissiles[i];
      m.life -= dt;

      let tx: number | null = null;
      let ty: number | null = null;
      let tz: number | null = null;

      // Countermeasure flares within IR seeker FOV spoof incoming missiles cleanly
      if (this.activeFlares.length > 0 && (m.targetAircraftId !== null || m.divertedByFlare)) {
        let bestFlare: FlareDecoyEntity | null = null;
        let bestFlareD = 115;
        for (let fIdx = 0; fIdx < this.activeFlares.length; fIdx++) {
          const fl = this.activeFlares[fIdx];
          const d = Math.hypot(fl.x - m.x, fl.y - m.y, fl.z - m.z);
          if (d < bestFlareD) {
            bestFlareD = d;
            bestFlare = fl;
          }
        }
        if (bestFlare) {
          m.divertedByFlare = true;
          m.targetAircraftId = null;
          tx = bestFlare.x;
          ty = bestFlare.y;
          tz = bestFlare.z;
        }
      }

      if (!m.divertedByFlare) {
        if (m.targetAircraftId !== null) {
          const ac = this.aircrafts.find((a) => a.id === m.targetAircraftId && a.alive && a.mode !== 'crashing');
          if (ac) {
            tx = ac.x;
            ty = ac.y;
            tz = ac.z;
          }
        } else if (m.targetVehicleId !== null) {
          const veh = this.groundVehicles.find((v) => v.id === m.targetVehicleId && v.alive);
          if (veh) {
            tx = veh.x;
            ty = veh.y + 1.2;
            tz = veh.z;
          }
        }
      }

      const missileSpeed = m.fromPlayer ? 96 : 76;
      const next = stepMissileHoming(m.x, m.y, m.z, m.vx, m.vy, m.vz, tx, ty, tz, missileSpeed, 2.2, dt);
      m.x = next.x;
      m.y = next.y;
      m.z = next.z;
      m.vx = next.vx;
      m.vy = next.vy;
      m.vz = next.vz;

      m.mesh.position.set(m.x, m.y, m.z);
      _v1.set(m.vx, m.vy, m.vz).normalize();
      _quat.setFromUnitVectors(_v4.set(0, 0, 1), _v1);
      m.mesh.quaternion.copy(_quat);

      m.smokeAccum += dt;
      if (m.smokeAccum >= 0.04) {
        m.smokeAccum = 0;
        this.spawnSmokePuff(
          m.x,
          m.y,
          m.z,
          (Math.random() - 0.5) * 1.2,
          0.45,
          (Math.random() - 0.5) * 1.2,
          0.65,
          0.35,
          1.35,
          0xe5e7eb,
          0.38,
        );
      }

      let hitTarget = false;
      for (const ac of this.aircrafts) {
        if (!ac.alive || ac.team === m.ownerTeam) continue;
        if (Math.hypot(ac.x - m.x, ac.y - m.y, ac.z - m.z) < 5.5) {
          hitTarget = true;
          const dmg = m.fromPlayer ? 400 : ac.mode === 'player' ? 295 : 340;
          this.damageAircraft(ac, dmg, m.ownerName, m.ownerTeam, 'aircraft_missile', m.fromPlayer);
          break;
        }
      }
      if (!hitTarget) {
        for (const h of this.helicopters) {
          if (!h.alive || h.team === m.ownerTeam) continue;
          if (Math.hypot(h.flight.x - m.x, h.flight.y - m.y, h.flight.z - m.z) < 5.5) {
            hitTarget = true;
            this.damageHelicopter(h, 360, m.ownerName, m.ownerTeam, 'aircraft_missile', m.fromPlayer);
            break;
          }
        }
      }
      if (!hitTarget) {
        for (const veh of this.groundVehicles) {
          if (!veh.alive || veh.team === m.ownerTeam) continue;
          if (Math.hypot(veh.x - m.x, veh.y + 1.2 - m.y, veh.z - m.z) < 4.5) {
            hitTarget = true;
            this.damageGroundVehicle(veh, 320, m.ownerName, m.ownerTeam, 'aircraft_missile', m.fromPlayer);
            break;
          }
        }
      }

      const gy = groundHeightAt(m.x, m.z, this.mapId, this.foxholes);
      if (hitTarget || m.y <= gy + 0.3 || m.life <= 0) {
        this.detonateOrdnance(m.x, Math.max(gy + 0.25, m.y), m.z, 11.5, 190, m.ownerTeam, m.ownerName, m.fromPlayer, 'aircraft_missile');
        this.scene.remove(m.mesh);
        this.homingMissiles.splice(i, 1);
      }
    }
  }

  private detonateOrdnance(
    x: number,
    y: number,
    z: number,
    radius: number,
    baseDamage: number,
    ownerTeam: Team,
    ownerName: string,
    fromPlayer: boolean,
    weaponId: KillcamInfo['killerWeaponId'],
  ): void {
    const distToPlayer = Math.hypot(x - this.playerX, z - this.playerZ);
    this.sound.playExplosion(Math.max(0.25, 1 - distToPlayer / 160));
    this.spawnExplosionVfx(x, y, z, radius);
    if (distToPlayer < radius * 2.1) {
      this.cameraTrauma = Math.min(1.0, this.cameraTrauma + (1 - distToPlayer / (radius * 2.1)) * 0.9);
    }
    for (const bot of this.bots) {
      if (!bot.alive || bot.team === ownerTeam) continue;
      const d = Math.hypot(bot.x - x, bot.z - z);
      if (d < radius) {
        const dmg = Math.round((1 - (d / radius) * 0.65) * baseDamage);
        const dx = (bot.x - x) / Math.max(0.4, d);
        const dz = (bot.z - z) / Math.max(0.4, d);
        if (fromPlayer) this.shotsHit += 1;
        this.damageBot(bot, dmg, ownerName, ownerTeam, weaponId, false, fromPlayer, dx, dz);
      }
    }
    for (const veh of this.groundVehicles) {
      if (!veh.alive || veh.team === ownerTeam) continue;
      const d = Math.hypot(veh.x - x, veh.z - z);
      if (d < radius + 3.0) {
        const falloff = Math.max(0.3, 1 - d / (radius + 3.0));
        if (fromPlayer) this.shotsHit += 1;
        this.damageGroundVehicle(veh, Math.round(falloff * baseDamage * 2.1), ownerName, ownerTeam, weaponId, fromPlayer);
      }
    }
    for (const h of this.helicopters) {
      if (!h.alive || h.team === ownerTeam) continue;
      const d = Math.hypot(h.flight.x - x, h.flight.y - y, h.flight.z - z);
      if (d < radius + 4.0) {
        const falloff = Math.max(0.3, 1 - d / (radius + 4.0));
        if (fromPlayer) this.shotsHit += 1;
        this.damageHelicopter(h, Math.round(falloff * baseDamage * 1.9), ownerName, ownerTeam, weaponId, fromPlayer);
      }
    }
  }

  private getShovelDigTarget(): { x: number; y: number; z: number; valid: boolean } {
    const camX = this.camera.position.x;
    const camY = this.camera.position.y;
    const camZ = this.camera.position.z;
    _v4.set(0, 0, -1).applyQuaternion(this.camera.quaternion);

    let tx = this.playerX - Math.sin(this.playerYaw) * 2.4;
    let tz = this.playerZ - Math.cos(this.playerYaw) * 2.4;
    let ty = groundHeightAt(tx, tz, this.mapId, this.foxholes);

    for (let d = 1.2; d <= 5.8; d += 0.2) {
      const px = camX + _v4.x * d;
      const py = camY + _v4.y * d;
      const pz = camZ + _v4.z * d;
      const gy = groundHeightAt(px, pz, this.mapId, this.foxholes);
      if (py <= gy + 0.08) {
        tx = px;
        tz = pz;
        ty = gy;
        break;
      }
    }

    let valid = Math.hypot(tx, tz) <= ARENA_RADIUS - 4;
    if (valid && this.world) {
      for (let i = 0; i < this.world.obstacles.length; i++) {
        const o = this.world.obstacles[i];
        if (!o.blocksSight) continue;
        if (tx >= o.minX - 0.35 && tx <= o.maxX + 0.35 && tz >= o.minZ - 0.35 && tz <= o.maxZ + 0.35) {
          valid = false;
          break;
        }
      }
    }
    return { x: tx, y: ty, z: tz, valid };
  }

  private addFoxholeAt(
    fx: number,
    fz: number,
    radius = 2.55,
    depth = 1.15,
  ): void {
    if (!this.world) return;
    if (this.foxholes.length >= MAX_PLAYER_FOXHOLES) {
      this.foxholes.shift();
      const oldGroup = this.foxholeGroups.shift();
      if (oldGroup) this.scene.remove(oldGroup);
    }

    this.foxholes.push({ x: fx, z: fz, radius, depth });
    this.world.applyFoxholesToTerrain(this.foxholes);

    const visual = createFoxholeVisual(radius);
    const baseGround = groundHeightAt(fx, fz, this.mapId);
    visual.position.set(fx, baseGround, fz);
    this.scene.add(visual);
    this.foxholeGroups.push(visual);

    this.spawnBurst(fx, baseGround + 0.3, fz, 22, 0x6b533b);
    this.playerY = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
  }

  private swingShovelAndDig(): void {
    this.fireCooldown = 0.48;
    this.shovelSwingTimer = 0.38;
    this.sound.playDigShovel();

    // Check close melee strike first
    const fwdX = -Math.sin(this.playerYaw);
    const fwdZ = -Math.cos(this.playerYaw);
    for (const bot of this.bots) {
      if (!bot.alive || bot.team === this.playerTeam) continue;
      const dx = bot.x - this.playerX;
      const dz = bot.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.5 && (dx * fwdX + dz * fwdZ) / Math.max(0.1, dist) > 0.35) {
        this.damageBot(
          bot,
          55,
          'Player',
          this.playerTeam,
          'shovel',
          false,
          true,
          fwdX,
          fwdZ,
        );
        this.spawnBurst(bot.x, bot.y + 1.1, bot.z, 8, 0xfbbf24);
        return;
      }
    }

    const target = this.getShovelDigTarget();
    if (!target.valid) return;
    this.addFoxholeAt(target.x, target.z, 2.55, 1.15);
  }

  private isNearAlliedResupply(): boolean {
    if (!this.world) return false;
    for (const pt of this.world.resupplyPoints) {
      if (pt.zoneId) {
        const z = this.zones.find((item) => item.id === pt.zoneId);
        if (!z || z.owner !== this.playerTeam) continue;
      }
      if (Math.hypot(this.playerX - pt.x, this.playerZ - pt.z) <= 6.2) {
        return true;
      }
    }
    return false;
  }

  private isNearAlliedArmory(): boolean {
    if (!this.world) return false;
    for (const pt of this.world.armoryPoints) {
      if (pt.team !== this.playerTeam) continue;
      if (Math.hypot(this.playerX - pt.x, this.playerZ - pt.z) <= 10.5) {
        return true;
      }
    }
    return false;
  }

  private firePlayerWeapon(): void {
    if (this.activeSlot > 3) return;
    const eff = this.getEffectiveWeapon(this.getActiveWeaponId());
    const weapon = eff.spec;
    const ammo = this.slotAmmo[this.activeSlot as 1 | 2 | 3];
    ammo.mag -= 1;
    this.fireCooldown = weapon.fireInterval;
    this.shotsFired += 1;

    const stanceMult =
      this.stanceMode === 'prone' ? 0.55 : this.stanceMode === 'crouch' ? 0.75 : 1.0;
    // Realistic shoulder-back recoil (strong Z kick back toward shooter + minimal vertical bounce)
    this.recoilKickZ = weapon.isExplosive ? 0.19 : 0.135;
    this.recoilPitchOffset += weapon.recoilPitch * stanceMult * 0.28;
    this.recoilRollOffset = (Math.random() - 0.5) * (weapon.isExplosive ? 0.045 : 0.022) * stanceMult;
    this.playerYaw += (Math.random() - 0.5) * weapon.recoilYaw * stanceMult * 0.65;
    this.boltKick = weapon.isExplosive ? 0 : 0.072;
    this.cameraTrauma = Math.min(0.45, this.cameraTrauma + (weapon.isExplosive ? 0.3 : 0.1));
    this.fpMuzzleTimer = 0.055;

    if (this.fpRig) {
      this.camera.updateMatrixWorld();
      this.fpCamera.updateMatrixWorld();
      this.fpRig.muzzleFlash.visible = true;
      this.fpRig.muzzleFlash.rotation.z = Math.random() * Math.PI;
      this.fpRig.muzzlePoint.getWorldPosition(_v2).applyMatrix4(this.camera.matrixWorld);
      // Billowing soft gunpowder smoke cloud at barrel muzzle
      const puffCount = weapon.isExplosive ? 4 : eff.suppressed ? 1 : 2;
      for (let p = 0; p < puffCount; p++) {
        this.spawnSmokePuff(
          _v2.x + (Math.random() - 0.5) * 0.08,
          _v2.y + (Math.random() - 0.5) * 0.08,
          _v2.z + (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.6,
          0.35 + Math.random() * 0.35,
          (Math.random() - 0.5) * 0.6,
          weapon.isExplosive ? 0.85 : 0.45,
          weapon.isExplosive ? 0.36 : 0.16,
          weapon.isExplosive ? 1.65 : 0.62,
          0xe2e0dc,
          weapon.isExplosive ? 0.42 : eff.suppressed ? 0.16 : 0.24,
        );
      }
      if (!weapon.isExplosive) {
        this.fpRig.ejectionPort.getWorldPosition(_v2).applyMatrix4(this.camera.matrixWorld);
        this.spawnCasing(_v2.x, _v2.y, _v2.z);
      }
    }
    this.sound.playGunshot(weapon.id, ammo.mag === 0, 1.0, eff.suppressed);

    const adsActive = this.mouseDownRight || this.virtualHeld.has('aim') || this.isAds;
    const baseSpread = THREE.MathUtils.lerp(weapon.hipSpread, weapon.adsSpread, adsActive ? 1 : 0);
    const spread = baseSpread * stanceMult;

    this.getWeaponFireRay(this.rayOrigin, this.rayDir);
    this.rayDir.x += (Math.random() - 0.5) * spread * 2;
    this.rayDir.y += (Math.random() - 0.5) * spread * 2;
    this.rayDir.z += (Math.random() - 0.5) * spread * 2;
    this.rayDir.normalize();

    const vx = this.rayDir.x * weapon.muzzleSpeed;
    const vy = this.rayDir.y * weapon.muzzleSpeed;
    const vz = this.rayDir.z * weapon.muzzleSpeed;

    this.spawnBallisticBullet(
      this.rayOrigin.x,
      this.rayOrigin.y,
      this.rayOrigin.z,
      vx,
      vy,
      vz,
      weapon.gravityScale,
      weapon.airDrag,
      this.playerTeam,
      'Player',
      true,
      weapon.id,
      Boolean(weapon.isExplosive),
      weapon.isExplosive ? 0x9a3412 : 0xe8b85a,
    );
  }

  private raycastWorldAnalytical(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
  ): number | null {
    if (!this.world) return null;
    const obsDist = intersectObstaclesRay(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      maxDist,
      this.world.obstacles,
    );
    const limit = obsDist !== null ? obsDist : maxDist;
    const step = limit > 80 ? 4.0 : 1.5;
    let prevD = 0;
    for (let d = step; d <= limit; d += step) {
      const px = ox + dx * d;
      const py = oy + dy * d;
      const pz = oz + dz * d;
      if (py <= groundHeightAt(px, pz, this.mapId)) {
        let lo = prevD;
        let hi = d;
        for (let k = 0; k < 4; k++) {
          const mid = (lo + hi) * 0.5;
          if (oy + dy * mid <= groundHeightAt(ox + dx * mid, oz + dz * mid, this.mapId)) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        return hi;
      }
      prevD = d;
    }
    return obsDist;
  }

  private getWeaponFireRay(outOrigin: THREE.Vector3, outDir: THREE.Vector3): void {
    outDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const hipWeight = 1 - this.adsBlend;
    if (hipWeight > 0.05) {
      _v1.set(-this.weaponSwayYaw * 0.36 * hipWeight, -this.weaponSwayPitch * 0.36 * hipWeight, -1)
        .normalize()
        .applyQuaternion(this.camera.quaternion);
      outDir.copy(_v1);
    }

    if (this.fpRig && hipWeight > 0.25) {
      this.camera.updateMatrixWorld();
      this.fpCamera.updateMatrixWorld();
      // Converge hip-fire muzzle ray onto exact camera-aimed world or enemy target
      let convDist = 75;
      const hitD = this.raycastWorldAnalytical(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
        outDir.x,
        outDir.y,
        outDir.z,
        220,
      );
      if (hitD !== null) convDist = Math.max(2.5, hitD);
      for (let i = 0; i < this.bots.length; i++) {
        const bot = this.bots[i];
        if (!bot.alive || bot.team === this.playerTeam) continue;
        const botHit = testSoldierHitbox(
          this.camera.position.x,
          this.camera.position.y,
          this.camera.position.z,
          outDir.x,
          outDir.y,
          outDir.z,
          convDist,
          bot.x,
          bot.y,
          bot.z,
          bot.crouching,
        );
        if (botHit.hit && botHit.dist < convDist) {
          convDist = Math.max(2.5, botHit.dist);
        }
      }

      this.fpRig.muzzlePoint.getWorldPosition(outOrigin).applyMatrix4(this.camera.matrixWorld);
      _v2.copy(this.camera.position).addScaledVector(outDir, convDist);
      outDir.copy(_v2).sub(outOrigin).normalize();
    } else {
      outOrigin.copy(this.camera.position);
    }
  }

  private computeBallisticAimArrow(): void {
    this.getWeaponFireRay(_v1, _v2);
    let hitDist = 75;
    const hitD = this.raycastWorldAnalytical(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z, 280);
    if (hitD !== null) {
      hitDist = Math.max(4, hitD);
    }
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive || bot.team === this.playerTeam) continue;
      const botHit = testSoldierHitbox(
        _v1.x,
        _v1.y,
        _v1.z,
        _v2.x,
        _v2.y,
        _v2.z,
        hitDist,
        bot.x,
        bot.y,
        bot.z,
        bot.crouching,
      );
      if (botHit.hit && botHit.dist < hitDist) {
        hitDist = Math.max(4, botHit.dist);
      }
    }
    this.aimTargetDist = Math.round(hitDist);

    const weapon = this.getEffectiveWeapon(this.getActiveWeaponId()).spec;
    const dropMeters = computeBallisticDrop(weapon.muzzleSpeed, hitDist, weapon.gravityScale);

    _v3.copy(_v1).addScaledVector(_v2, hitDist);
    _v3.y -= dropMeters;
    _v3.project(this.camera);

    const rect = this.container.getBoundingClientRect();
    const hw = (rect.width || window.innerWidth) * 0.5;
    const hh = (rect.height || window.innerHeight) * 0.5;
    if (_v3.z <= 1) {
      this.aimArrowX = THREE.MathUtils.clamp(_v3.x * hw, -hw * 0.45, hw * 0.45);
      this.aimArrowY = THREE.MathUtils.clamp(-_v3.y * hh, -hh * 0.45, hh * 0.45);
    }
  }

  private spawnBallisticBullet(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    gravityScale: number,
    airDrag: number,
    ownerTeam: Team,
    ownerName: string,
    fromPlayer: boolean,
    weaponId: WeaponId,
    isExplosive: boolean,
    color: number,
  ): void {
    const b = this.bullets[this.bulletCursor];
    this.bulletCursor = (this.bulletCursor + 1) % MAX_BULLETS;
    b.active = true;
    b.x = x;
    b.y = y;
    b.z = z;
    b.vx = vx;
    b.vy = vy;
    b.vz = vz;
    b.gravityScale = gravityScale;
    b.airDrag = airDrag;
    b.life = 3.2;
    b.distTraveled = 0;
    b.ownerTeam = ownerTeam;
    b.ownerName = ownerName;
    b.fromPlayer = fromPlayer;
    b.weaponId = weaponId;
    b.isExplosive = isExplosive;
    b.color = color;
  }

  private updateBullets(dt: number): void {
    let dirty = false;
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = this.bullets[i];
      if (!b.active) continue;
      dirty = true;

      b.life -= dt;
      if (b.life <= 0) {
        b.active = false;
        _mat.makeScale(0, 0, 0);
        this.bulletMesh.setMatrixAt(i, _mat);
        continue;
      }

      const prevX = b.x;
      const prevY = b.y;
      const prevZ = b.z;
      const next = stepBallisticProjectile(
        b.x,
        b.y,
        b.z,
        b.vx,
        b.vy,
        b.vz,
        b.gravityScale,
        b.airDrag,
        dt,
      );
      b.x = next.x;
      b.y = next.y;
      b.z = next.z;
      b.vx = next.vx;
      b.vy = next.vy;
      b.vz = next.vz;

      if (b.isExplosive) {
        // Hot rocket thruster flame core + billowing soft smoke contrail
        this.spawnParticle(
          b.x,
          b.y,
          b.z,
          (Math.random() - 0.5) * 1.4,
          0.4 + Math.random() * 0.8,
          (Math.random() - 0.5) * 1.4,
          0.14,
          0.13,
          0xffb703,
          -0.6,
        );
        if (Math.random() < 0.72) {
          this.spawnSmokePuff(
            b.x - b.vx * 0.008,
            b.y - b.vy * 0.008,
            b.z - b.vz * 0.008,
            (Math.random() - 0.5) * 1.0,
            0.7 + Math.random() * 0.9,
            (Math.random() - 0.5) * 1.0,
            0.7,
            0.3,
            1.25,
            0xd6d3d1,
            0.34,
          );
        }
      } else if (Math.random() < 0.35) {
        this.spawnParticle(
          b.x,
          b.y,
          b.z,
          0,
          0.12,
          0,
          0.12,
          0.075,
          0xe2e8f0,
          -0.2,
        );
      }

      const segX = b.x - prevX;
      const segY = b.y - prevY;
      const segZ = b.z - prevZ;
      const segLen = Math.hypot(segX, segY, segZ);
      b.distTraveled += segLen;

      if (segLen < 1e-4) continue;
      const invLen = 1 / segLen;
      _v1.set(prevX, prevY, prevZ);
      _v2.set(segX * invLen, segY * invLen, segZ * invLen);

      const hardcoreMult = this.gameMode === 'hardcore' ? 1.6 : 1.0;

      // Determine earliest wall / terrain impact distance along this segment first (prevents shooting through walls)
      let envHitDist = segLen + 0.01;
      let envHitType: 'none' | 'obstacle' | 'ground' = 'none';
      const envSteps = Math.max(1, Math.ceil(segLen / 0.85));
      for (let s = 1; s <= envSteps; s++) {
        const frac = s / envSteps;
        const sx = prevX + segX * frac;
        const sy = prevY + segY * frac;
        const sz = prevZ + segZ * frac;
        if (this.world) {
          const obs = this.world.obstacles;
          let hitObs = false;
          for (let k = 0; k < obs.length; k++) {
            const o = obs[k];
            if (
              sx >= o.minX &&
              sx <= o.maxX &&
              sz >= o.minZ &&
              sz <= o.maxZ &&
              sy <= groundHeightAt((o.minX + o.maxX) * 0.5, (o.minZ + o.maxZ) * 0.5, this.mapId) + o.height
            ) {
              envHitDist = segLen * frac;
              envHitType = 'obstacle';
              hitObs = true;
              break;
            }
          }
          if (hitObs) break;
        }
        const gy = groundHeightAt(sx, sz, this.mapId, this.foxholes);
        if (sy <= gy) {
          envHitDist = segLen * frac;
          envHitType = 'ground';
          break;
        }
      }

      let hit = false;
      let hitX = prevX + _v2.x * envHitDist;
      let hitY = prevY + _v2.y * envHitDist;
      let hitZ = prevZ + _v2.z * envHitDist;

      if (b.ownerTeam !== this.playerTeam && this.playerAlive) {
        const playerEye = this.playerY + this.playerEyeHeight;
        const pHit = this.intersectSegmentSphere(
          _v1,
          _v2,
          Math.min(segLen, envHitDist),
          this.playerX,
          playerEye - 0.38,
          this.playerZ,
          0.46,
        );
        if (pHit >= 0) {
          this.damagePlayer(
            Math.round(WEAPONS[b.weaponId].damage * 0.38 * hardcoreMult),
            b.ownerName,
            b.ownerTeam,
            b.weaponId,
            prevX,
            prevZ,
          );
          hitX = prevX + _v2.x * pHit;
          hitY = prevY + _v2.y * pHit;
          hitZ = prevZ + _v2.z * pHit;
          hit = true;
        }
      }

      if (!hit) {
        let bestBot: BotEntity | null = null;
        let bestBotT = Math.min(segLen, envHitDist);
        let bestIsHead = false;
        for (let j = 0; j < this.bots.length; j++) {
          const bot = this.bots[j];
          if (!bot.alive || bot.team === b.ownerTeam) continue;
          const res = testSoldierHitbox(
            prevX,
            prevY,
            prevZ,
            _v2.x,
            _v2.y,
            _v2.z,
            bestBotT,
            bot.x,
            bot.y,
            bot.z,
            bot.crouching,
          );
          if (res.hit && res.dist <= bestBotT) {
            bestBotT = res.dist;
            bestBot = bot;
            bestIsHead = res.isHead;
          }
        }
        if (bestBot) {
          hitX = prevX + _v2.x * bestBotT;
          hitY = prevY + _v2.y * bestBotT;
          hitZ = prevZ + _v2.z * bestBotT;
          if (!b.isExplosive) {
            const weapon = WEAPONS[b.weaponId];
            const dmg = Math.round(computeHitDamage(weapon, b.distTraveled, bestIsHead) * hardcoreMult);
            if (b.fromPlayer) this.shotsHit += 1;
            this.damageBot(
              bestBot,
              b.fromPlayer ? dmg : Math.round(dmg * 0.8),
              b.ownerName,
              b.ownerTeam,
              b.weaponId,
              bestIsHead,
              b.fromPlayer,
              _v2.x,
              _v2.z,
            );
            this.spawnBurst(hitX, hitY, hitZ, bestIsHead ? 10 : 6, bestIsHead ? 0xfbbf24 : 0xd6d3d1);
          }
          hit = true;
        }
      }

      if (!hit) {
        // Check enemy ground vehicles (Jeep & Battle Tank)
        let bestVeh: GroundVehicleEntity | null = null;
        let bestVehT = Math.min(segLen, envHitDist);
        for (let vIdx = 0; vIdx < this.groundVehicles.length; vIdx++) {
          const veh = this.groundVehicles[vIdx];
          if (!veh.alive || veh.team === b.ownerTeam) continue;
          const rad = veh.kind === 'tank' ? 2.85 : 2.15;
          const vHit = this.intersectSegmentSphere(
            _v1,
            _v2,
            bestVehT,
            veh.x,
            veh.y + 1.25,
            veh.z,
            rad,
          );
          if (vHit >= 0 && vHit <= bestVehT) {
            bestVehT = vHit;
            bestVeh = veh;
          }
        }
        if (bestVeh) {
          hitX = prevX + _v2.x * bestVehT;
          hitY = prevY + _v2.y * bestVehT;
          hitZ = prevZ + _v2.z * bestVehT;
          if (!b.isExplosive) {
            const armorMult = bestVeh.kind === 'tank' ? 0.14 : 0.42;
            const dmg = Math.max(4, Math.round(WEAPONS[b.weaponId].damage * armorMult));
            if (b.fromPlayer) this.shotsHit += 1;
            this.damageGroundVehicle(bestVeh, dmg, b.ownerName, b.ownerTeam, b.weaponId, b.fromPlayer);
            this.spawnBurst(hitX, hitY, hitZ, 6, 0xfbbf24);
          }
          hit = true;
        }
      }

      if (!hit) {
        // Ground-to-Air / Air-to-Air hit detection against enemy combat aircraft
        let bestAc: CombatAircraftEntity | null = null;
        let bestAcT = Math.min(segLen, envHitDist);
        for (let aIdx = 0; aIdx < this.aircrafts.length; aIdx++) {
          const ac = this.aircrafts[aIdx];
          if (!ac.alive || ac.team === b.ownerTeam) continue;
          const aHit = this.intersectSegmentSphere(_v1, _v2, bestAcT, ac.x, ac.y, ac.z, 3.8);
          if (aHit >= 0 && aHit <= bestAcT) {
            bestAcT = aHit;
            bestAc = ac;
          }
        }
        if (bestAc) {
          hitX = prevX + _v2.x * bestAcT;
          hitY = prevY + _v2.y * bestAcT;
          hitZ = prevZ + _v2.z * bestAcT;
          if (!b.isExplosive) {
            const dmg = Math.max(8, Math.round(WEAPONS[b.weaponId].damage * 0.62));
            if (b.fromPlayer) this.shotsHit += 1;
            this.damageAircraft(bestAc, dmg, b.ownerName, b.ownerTeam, b.weaponId, b.fromPlayer);
            this.spawnBurst(hitX, hitY, hitZ, 8, 0xfbbf24);
          }
          hit = true;
        }
      }

      if (!hit) {
        // Hit detection against enemy Combat Helicopters
        let bestHeli: CombatHelicopterEntity | null = null;
        let bestHeliT = Math.min(segLen, envHitDist);
        for (let hIdx = 0; hIdx < this.helicopters.length; hIdx++) {
          const h = this.helicopters[hIdx];
          if (!h.alive || h.team === b.ownerTeam) continue;
          const hHit = this.intersectSegmentSphere(
            _v1,
            _v2,
            bestHeliT,
            h.flight.x,
            h.flight.y,
            h.flight.z,
            3.8,
          );
          if (hHit >= 0 && hHit <= bestHeliT) {
            bestHeliT = hHit;
            bestHeli = h;
          }
        }
        if (bestHeli) {
          hitX = prevX + _v2.x * bestHeliT;
          hitY = prevY + _v2.y * bestHeliT;
          hitZ = prevZ + _v2.z * bestHeliT;
          if (!b.isExplosive) {
            const dmg = Math.max(8, Math.round(WEAPONS[b.weaponId].damage * 0.56));
            if (b.fromPlayer) this.shotsHit += 1;
            this.damageHelicopter(bestHeli, dmg, b.ownerName, b.ownerTeam, b.weaponId, b.fromPlayer);
            this.spawnBurst(hitX, hitY, hitZ, 8, 0xfbbf24);
          }
          hit = true;
        }
      }

      if (!hit && this.campaignMode && this.campaignSet && b.fromPlayer) {
        for (const t of this.campaignSet.targets) {
          if (t.hit) continue;
          const tHit = this.intersectSegmentSphere(_v1, _v2, Math.min(segLen, envHitDist), t.x, t.y + 0.9, t.z, t.radius + 0.25);
          if (tHit >= 0) {
            t.hit = true;
            t.mesh.rotation.x = Math.PI * 0.45;
            hitX = prevX + _v2.x * tHit;
            hitY = prevY + _v2.y * tHit;
            hitZ = prevZ + _v2.z * tHit;
            this.shotsHit += 1;
            this.hitmarkerKind = 'kill';
            this.hitmarkerTimer = 0.2;
            this.sound.playHitmarker(true);
            this.spawnBurst(hitX, hitY, hitZ, 8, 0xfbbf24);
            hit = true;
            break;
          }
        }
      }

      if (!hit && envHitType !== 'none') {
        if (envHitType === 'ground') {
          hitY = groundHeightAt(hitX, hitZ, this.mapId, this.foxholes) + 0.05;
        }
        if (!b.isExplosive) {
          this.spawnBurst(hitX, hitY, hitZ, 5, envHitType === 'obstacle' ? 0xc2b8a3 : 0xa8997c);
        }
        hit = true;
      }

      if (hit) {
        if (b.isExplosive) {
          this.detonateRocket(
            hitX,
            hitY,
            hitZ,
            WEAPONS[b.weaponId],
            b.ownerTeam,
            b.ownerName,
            b.fromPlayer,
          );
        }
        b.active = false;
        _mat.makeScale(0, 0, 0);
        this.bulletMesh.setMatrixAt(i, _mat);
        continue;
      }

      _v3.set(b.x, b.y, b.z);
      _quat.setFromUnitVectors(_v4.set(0, 0, 1), _v2);
      const s = b.isExplosive ? 2.2 : 1.05;
      _scale.set(s, s, s * (b.isExplosive ? 1.55 : 1.15));
      _mat.compose(_v3, _quat, _scale);
      this.bulletMesh.setMatrixAt(i, _mat);
      this.bulletMesh.setColorAt(i, _color.setHex(b.color));
    }
    if (dirty) {
      this.bulletMesh.instanceMatrix.needsUpdate = true;
      if (this.bulletMesh.instanceColor) this.bulletMesh.instanceColor.needsUpdate = true;
    }
  }

  private detonateRocket(
    x: number,
    y: number,
    z: number,
    weapon: WeaponSpec,
    ownerTeam: Team,
    ownerName: string,
    fromPlayer: boolean,
  ): void {
    const distToPlayer = Math.hypot(x - this.playerX, z - this.playerZ);
    this.sound.playExplosion(Math.max(0.22, 1 - distToPlayer / 120));

    const radius = weapon.blastRadius ?? 9.0;
    this.spawnExplosionVfx(x, y, z, radius);

    if (distToPlayer < radius * 2.1) {
      this.cameraTrauma = Math.min(1.0, this.cameraTrauma + (1 - distToPlayer / (radius * 2.1)) * 0.92);
      this.hitstopTimer = 0.045;
    }

    if (ownerTeam !== this.playerTeam && this.playerAlive && distToPlayer < radius * 0.85) {
      const dmg = Math.round((1 - distToPlayer / radius) * 58);
      if (dmg > 4) this.damagePlayer(dmg, ownerName, ownerTeam, weapon.id, x, z);
    }

    for (const bot of this.bots) {
      if (!bot.alive || bot.team === ownerTeam) continue;
      const d = Math.hypot(bot.x - x, bot.z - z);
      if (d < radius) {
        const dmg = Math.round((1 - (d / radius) * 0.72) * weapon.damage);
        const dx = (bot.x - x) / Math.max(0.4, d);
        const dz = (bot.z - z) / Math.max(0.4, d);
        if (fromPlayer) this.shotsHit += 1;
        this.damageBot(bot, dmg, ownerName, ownerTeam, weapon.id, false, fromPlayer, dx, dz);
      }
    }

    for (const veh of this.groundVehicles) {
      if (!veh.alive || veh.team === ownerTeam) continue;
      const d = Math.hypot(veh.x - x, veh.z - z);
      if (d < radius + 2.2) {
        const falloff = Math.max(0.25, 1 - d / (radius + 2.2));
        const antiArmorDmg = Math.round(falloff * weapon.damage * 2.45);
        if (fromPlayer) this.shotsHit += 1;
        this.damageGroundVehicle(veh, antiArmorDmg, ownerName, ownerTeam, weapon.id, fromPlayer);
      }
    }

    for (const h of this.helicopters) {
      if (!h.alive || h.team === ownerTeam) continue;
      const d = Math.hypot(h.flight.x - x, h.flight.y - y, h.flight.z - z);
      if (d < radius + 3.2) {
        const falloff = Math.max(0.25, 1 - d / (radius + 3.2));
        const antiAirDmg = Math.round(falloff * weapon.damage * 2.2);
        if (fromPlayer) this.shotsHit += 1;
        this.damageHelicopter(h, antiAirDmg, ownerName, ownerTeam, weapon.id, fromPlayer);
      }
    }
  }

  private intersectSegmentSphere(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    cx: number,
    cy: number,
    cz: number,
    radius: number,
  ): number {
    const ocX = origin.x - cx;
    const ocY = origin.y - cy;
    const ocZ = origin.z - cz;
    const b = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
    const c = ocX * ocX + ocY * ocY + ocZ * ocZ - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    if (t >= 0 && t <= maxDist) return t;
    if (c < 0) return 0;
    return -1;
  }

  private spawnCasing(x: number, y: number, z: number): void {
    const c = this.casings[this.casingCursor];
    this.casingCursor = (this.casingCursor + 1) % MAX_CASINGS;
    c.active = true;
    c.grounded = false;
    c.x = x;
    c.y = y;
    c.z = z;
    const rightX = Math.cos(this.playerYaw);
    const rightZ = -Math.sin(this.playerYaw);
    c.vx = rightX * (1.8 + Math.random() * 1.1) + (Math.random() - 0.5) * 0.4;
    c.vy = 1.6 + Math.random() * 0.8;
    c.vz = rightZ * (1.8 + Math.random() * 1.1) + (Math.random() - 0.5) * 0.4;
    c.rx = Math.random() * 6;
    c.ry = Math.random() * 6;
    c.rz = Math.random() * 6;
    c.life = 6.5;
  }

  private updateCasings(dt: number): void {
    let dirty = false;
    for (let i = 0; i < MAX_CASINGS; i++) {
      const c = this.casings[i];
      if (!c.active) continue;
      dirty = true;
      c.life -= dt;
      if (c.life <= 0) {
        c.active = false;
        _mat.makeScale(0, 0, 0);
        this.casingMesh.setMatrixAt(i, _mat);
        continue;
      }
      if (!c.grounded) {
        c.vy -= 14 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        const gy = groundHeightAt(c.x, c.z, this.mapId, this.foxholes) + 0.015;
        if (c.y <= gy) {
          c.y = gy;
          if (Math.abs(c.vy) < 0.48) {
            c.vy = 0;
            c.vx = 0;
            c.vz = 0;
            c.rx = Math.PI * 0.5;
            c.grounded = true;
          } else {
            c.vy = Math.abs(c.vy) * 0.34;
            c.vx *= 0.55;
            c.vz *= 0.55;
          }
        }
        if (!c.grounded) {
          c.rx += dt * 14;
          c.rz += dt * 11;
        }
      }
      _v3.set(c.x, c.y, c.z);
      _euler.set(c.rx, c.ry, c.rz);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, 1);
      _mat.compose(_v3, _quat, _scale);
      this.casingMesh.setMatrixAt(i, _mat);
    }
    if (dirty) {
      this.casingMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private damagePlayer(
    amount: number,
    attackerName: string,
    attackerTeam: Team,
    weaponId: KillcamInfo['killerWeaponId'],
    fromX: number,
    fromZ: number,
  ): void {
    if (!this.playerAlive || this.matchElapsed < 4.0) return;
    if (this.activeVehicle) {
      // Armored hull absorbs most incoming small-arms damage while player drives a vehicle
      const hullShield = this.activeVehicle.kind === 'tank' ? 0.15 : 0.4;
      this.playerHealth -= Math.max(1, Math.round(amount * hullShield));
    } else {
      this.playerHealth -= amount;
    }
    this.damageFlashAlpha = 0.85;
    this.cameraTrauma = Math.min(0.75, this.cameraTrauma + 0.22);
    this.damageDirectionRad = Math.atan2(fromX - this.playerX, fromZ - this.playerZ);
    this.sound.playDamageTaken();

    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.playerAlive = false;
      this.aircraftThreatWarning = 'none';
      this.sound.stopCockpitWarnings();
      this.sound.stopEngineCue();
      this.worldFlashlight.visible = false;
      if (this.activeVehicle) {
        this.activeVehicle.occupantIsPlayer = false;
        this.activeVehicle = null;
      }
      if (this.activeAircraft) {
        this.activeAircraft.mode = 'ai_orbit';
        this.activeAircraft = null;
      }
      if (this.activeHelicopter) {
        this.activeHelicopter.mode = 'ai_orbit';
        this.activeHelicopter = null;
      }
      this.vehicleReticleVisible = false;

      // Capture killer HP & position for authentic Killcam reveal
      let killerHp = 100;
      let killerMaxHp = 100;
      let killerY = groundHeightAt(fromX, fromZ, this.mapId) + 1.4;
      const killerBot = this.bots.find((b) => b.name === attackerName && b.team === attackerTeam);
      if (killerBot) {
        killerHp = Math.max(1, Math.round(killerBot.hp));
        killerMaxHp = killerBot.maxHp;
        killerY = killerBot.y + 1.4;
      }
      this.killerEntityPos = { x: fromX, y: killerY, z: fromZ };
      this.lastKillcam = {
        killerName: attackerName,
        killerTeam: attackerTeam,
        killerWeaponId: weaponId,
        killerDistanceM: Math.max(1, Math.round(Math.hypot(fromX - this.playerX, fromZ - this.playerZ))),
        killerHp,
        killerMaxHp,
        killerIsHeadshot: false,
      };

      this.deathStartEye = this.playerEyeHeight;
      this.deathTimer = 0;
      this.isBinocularsZoomed = false;
      this.playerRespawnTimer = 3.2;
      this.deaths += 1;
      const ticketCost = this.gameMode === 'tdm' ? 1 : 2;
      if (this.playerTeam === 'allies') {
        this.alliesTickets = Math.max(0, this.alliesTickets - ticketCost);
      } else {
        this.axisTickets = Math.max(0, this.axisTickets - ticketCost);
      }
      this.pushKillFeed({
        id: this.nextKillFeedId++,
        killerName: attackerName,
        killerTeam: attackerTeam,
        victimName: 'Player',
        victimTeam: this.playerTeam,
        weaponId,
        isHeadshot: false,
        timestamp: this.matchElapsed,
      });
    }
  }

  private damageBot(
    bot: BotEntity,
    amount: number,
    killerName: string,
    killerTeam: Team,
    weaponId: KillcamInfo['killerWeaponId'],
    isHeadshot: boolean,
    fromPlayer: boolean,
    impulseDirX = 0,
    impulseDirZ = 0,
  ): void {
    if (!bot.alive) return;
    bot.hp -= amount;
    bot.hitFlashTimer = 0.055;
    if (bot.hp > 0 && bot.seekCoverTimer <= 0) {
      this.assignNearestCover(bot, this.playerX, this.playerZ);
      bot.seekCoverTimer = 3.2;
      bot.crouching = true;
    }
    for (const mat of bot.rig.hitFlashMaterials) {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.85;
    }

    if (bot.hp <= 0) {
      bot.hp = 0;
      bot.alive = false;
      bot.koTimer = 0.5;
      bot.koVx = impulseDirX * 4.2;
      bot.koVz = impulseDirZ * 4.2;
      bot.koFallDir = Math.random() > 0.5 ? -1 : 1;
      bot.respawnTimer = 5.0;
      bot.rig.telegraphGlint.visible = false;
      bot.rig.healBadge.visible = false;

      const ticketCost = this.gameMode === 'tdm' ? 1 : 2;
      if (bot.team === 'axis') {
        this.axisTickets = Math.max(0, this.axisTickets - ticketCost);
      } else {
        this.alliesTickets = Math.max(0, this.alliesTickets - ticketCost);
      }

      if (fromPlayer) {
        this.kills += 1;
        this.score += isHeadshot ? 150 : 100;
        this.careerProgress = {
          ...this.careerProgress,
          careerKills: this.careerProgress.careerKills + 1,
        };
        saveCareerProgress(this.careerProgress);
        this.hitmarkerKind = 'kill';
        this.hitmarkerTimer = 0.24;
        this.hitstopTimer = 0.04;
        this.sound.playHitmarker(true);
      }

      this.pushKillFeed({
        id: this.nextKillFeedId++,
        killerName,
        killerTeam,
        victimName: bot.name,
        victimTeam: bot.team,
        weaponId,
        isHeadshot,
        timestamp: this.matchElapsed,
      });
    } else if (fromPlayer) {
      this.hitmarkerKind = 'hit';
      this.hitmarkerTimer = 0.14;
      this.sound.playHitmarker(false);
    }
  }

  private assignNearestCover(bot: BotEntity, threatX: number, threatZ: number): void {
    if (!this.world) return;
    const obs = this.world.obstacles;
    let bestD = 32;
    let cx = bot.x;
    let cz = bot.z;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.height < 0.9) continue;
      const ox = (o.minX + o.maxX) * 0.5;
      const oz = (o.minZ + o.maxZ) * 0.5;
      const d = Math.hypot(ox - bot.x, oz - bot.z);
      if (d > 2 && d < bestD) {
        const awayX = ox - threatX;
        const awayZ = oz - threatZ;
        const len = Math.max(0.1, Math.hypot(awayX, awayZ));
        const halfSpan = Math.max(o.maxX - o.minX, o.maxZ - o.minZ) * 0.5 + 1.45;
        const candX = ox + (awayX / len) * halfSpan;
        const candZ = oz + (awayZ / len) * halfSpan;
        if (!isPointBlockedByObstacles(candX, candZ, 0.85, obs)) {
          bestD = d;
          cx = candX;
          cz = candZ;
        }
      }
    }
    const resolved = resolveCircleObstacles(cx, cz, 0.85, obs, ARENA_RADIUS);
    bot.coverX = resolved.x;
    bot.coverZ = resolved.z;
  }

  private pushKillFeed(entry: KillFeedItem): void {
    this.killFeed.unshift(entry);
    if (this.killFeed.length > 4) this.killFeed.pop();
  }

  private throwGrenade(): void {
    this.grenadesCount -= 1;
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
    this.rayDir.set(0, 0.18, -1).normalize().applyQuaternion(this.camera.quaternion);
    const sx = this.camera.position.x + this.rayDir.x * 0.7;
    const sy = this.camera.position.y + this.rayDir.y * 0.7;
    const sz = this.camera.position.z + this.rayDir.z * 0.7;
    mesh.position.set(sx, sy, sz);
    this.scene.add(mesh);

    this.grenades.push({
      mesh,
      x: sx,
      y: sy,
      z: sz,
      vx: this.rayDir.x * 20,
      vy: this.rayDir.y * 20 + 3.8,
      vz: this.rayDir.z * 20,
      fuse: 1.8,
    });
  }

  private updateGrenades(dt: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vy -= 18 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.z += g.vz * dt;
      g.mesh.rotation.x += dt * 7;
      g.mesh.rotation.z += dt * 5;

      const gy = groundHeightAt(g.x, g.z, this.mapId) + 0.14;
      if (g.y < gy) {
        g.y = gy;
        g.vy = Math.abs(g.vy) * 0.42;
        g.vx *= 0.65;
        g.vz *= 0.65;
      }
      g.mesh.position.set(g.x, g.y, g.z);

      if (g.fuse <= 0) {
        this.detonateGrenade(g);
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }

  private detonateGrenade(g: GrenadeEntity): void {
    const distToPlayer = Math.hypot(g.x - this.playerX, g.z - this.playerZ);
    this.sound.playExplosion(Math.max(0.18, 1 - distToPlayer / 95));
    this.spawnExplosionVfx(g.x, g.y, g.z, 7.2);

    if (distToPlayer < 16) {
      this.cameraTrauma = Math.min(1.0, this.cameraTrauma + (1 - distToPlayer / 16) * 0.78);
      this.hitstopTimer = 0.05;
    }

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const d = Math.hypot(bot.x - g.x, bot.z - g.z);
      if (d < 9.5) {
        const dmg = Math.round((1 - d / 9.5) * 145);
        const dx = (bot.x - g.x) / Math.max(0.5, d);
        const dz = (bot.z - g.z) / Math.max(0.5, d);
        this.damageBot(bot, dmg, 'Player', 'allies', 'grenade', false, true, dx, dz);
      }
    }
  }

  private updateBots(dt: number): void {
    let activeEnemyAttackers = 0;
    for (let i = 0; i < this.bots.length; i++) {
      if (this.bots[i].team === 'axis' && this.bots[i].alive && this.bots[i].telegraphTimer > 0) {
        activeEnemyAttackers++;
      }
    }

    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];

      if (bot.hitFlashTimer > 0) {
        bot.hitFlashTimer -= dt;
        if (bot.hitFlashTimer <= 0) {
          for (const mat of bot.rig.hitFlashMaterials) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }

      if (bot.muzzleTimer > 0) {
        bot.muzzleTimer -= dt;
        if (bot.muzzleTimer <= 0) bot.rig.muzzleFlash.visible = false;
      }

      if (bot.spottedTimer > 0) {
        bot.spottedTimer = Math.max(0, bot.spottedTimer - dt);
      }

      if (!bot.alive) {
        if (bot.koTimer > 0) {
          bot.koTimer -= dt;
          const t = 1 - Math.max(0, bot.koTimer / 0.5);
          bot.x += bot.koVx * dt * (1 - t);
          bot.z += bot.koVz * dt * (1 - t);
          bot.y = groundHeightAt(bot.x, bot.z, this.mapId, this.foxholes);
          bot.rig.root.position.set(bot.x, bot.y, bot.z);
          bot.rig.bodyPivot.rotation.x = bot.koFallDir * t * (Math.PI / 2);
          bot.rig.bodyPivot.rotation.z = t * 0.25 * (bot.id % 2 === 0 ? 1 : -1);
          bot.rig.bodyPivot.position.y = Math.max(-0.08, -t * 0.08);
          bot.rig.weaponMount.rotation.x = t * 0.4;
          bot.rig.leftArm.rotation.x = t * 0.35;
          bot.rig.rightArm.rotation.x = t * 0.35;
        } else {
          bot.rig.root.visible = false;
        }
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          const pt = this.pickSpawnPoint(bot.team, bot.id);
          bot.x = pt.x;
          bot.z = pt.z;
          bot.y = groundHeightAt(pt.x, pt.z, this.mapId, this.foxholes);
          bot.hp = bot.maxHp;
          bot.alive = true;
          bot.crouching = false;
          bot.seekCoverTimer = 0;
          bot.telegraphTimer = 0;
          bot.aiState = 'advance';
          bot.healTimer = 0;
          bot.stuckCheckTimer = 0;
          bot.lastCheckX = pt.x;
          bot.lastCheckZ = pt.z;
          bot.detourTimer = 0;
          bot.weaponPitch = 0;
          bot.rig.healBadge.visible = false;
          bot.rig.bodyPivot.rotation.set(0, 0, 0);
          bot.rig.bodyPivot.position.y = 0;
          bot.rig.weaponMount.rotation.set(0, 0, 0);
          bot.rig.leftArm.rotation.set(0, 0, 0);
          bot.rig.rightArm.rotation.set(0, 0, 0);
          bot.rig.leftKnee.rotation.set(0, 0, 0);
          bot.rig.rightKnee.rotation.set(0, 0, 0);
          bot.rig.root.visible = true;
          bot.rig.root.position.set(bot.x, bot.y, bot.z);
        }
        continue;
      }

      // Long-range engagement & tactical awareness tested from actual muzzle height
      let targetX = 0;
      let targetY = 0;
      let targetZ = 0;
      let targetBot: BotEntity | null = null;
      let targetIsPlayer = false;
      let bestDist = bot.role === 'marksman' ? 132 : 95;
      const muzzleHeightCheck = bot.y + (bot.crouching ? 0.98 : 1.34);

      if (bot.team !== this.playerTeam && this.playerAlive) {
        const dp = Math.hypot(this.playerX - bot.x, this.playerZ - bot.z);
        if (
          dp < bestDist &&
          this.hasLineOfSight(
            bot.x,
            muzzleHeightCheck,
            bot.z,
            this.playerX,
            this.playerY + this.playerEyeHeight - 0.15,
            this.playerZ,
          )
        ) {
          bestDist = dp;
          targetX = this.playerX;
          targetY = this.playerY + this.playerEyeHeight - 0.15;
          targetZ = this.playerZ;
          targetIsPlayer = true;
        }
      }

      for (let j = 0; j < this.bots.length; j++) {
        const other = this.bots[j];
        if (!other.alive || other.team === bot.team) continue;
        const d = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (
          d < bestDist &&
          this.hasLineOfSight(bot.x, muzzleHeightCheck, bot.z, other.x, other.y + 1.3, other.z)
        ) {
          bestDist = d;
          targetBot = other;
          targetIsPlayer = false;
          targetX = other.x;
          targetY = other.y + (other.crouching ? 0.96 : 1.28);
          targetZ = other.z;
        }
      }

      const hasTarget = targetBot !== null || targetIsPlayer;
      const prevAi = bot.aiState;
      bot.aiState = chooseBotTacticalAction(bot.hp, bot.maxHp, hasTarget, bestDist, bot.role);

      let goalX = bot.x;
      let goalZ = bot.z;
      let moveSpeed = 0;

      if (bot.aiState === 'retreat_heal') {
        // Injured soldier retreats to rear cover, kneels down, bandages & recovers HP
        if (prevAi !== 'retreat_heal') {
          this.assignNearestCover(bot, hasTarget ? targetX : this.playerX, hasTarget ? targetZ : this.playerZ);
          bot.healTimer = 0;
        }
        const coverDist = Math.hypot(bot.coverX - bot.x, bot.coverZ - bot.z);
        if (coverDist > 1.5 && bot.healTimer < 1.2) {
          goalX = bot.coverX;
          goalZ = bot.coverZ;
          moveSpeed = 5.9;
          bot.crouching = false;
          bot.rig.healBadge.visible = false;
        } else {
          moveSpeed = 0;
          bot.crouching = true;
          bot.rig.healBadge.visible = true;
          bot.rig.healBadge.rotation.y += dt * 2.4;
          bot.hp = Math.min(86, bot.hp + 16 * dt);
        }
        bot.healTimer += dt;
      } else {
        bot.rig.healBadge.visible = false;
        bot.strafeTimer -= dt;
        if (bot.strafeTimer <= 0) {
          bot.strafeTimer = 1.6 + Math.random() * 1.4;
          bot.strafeDir *= -1;
        }

        if (bot.seekCoverTimer > 0) {
          bot.seekCoverTimer -= dt;
          goalX = bot.coverX;
          goalZ = bot.coverZ;
          moveSpeed = 5.4;
          if (Math.hypot(goalX - bot.x, goalZ - bot.z) < 1.4) {
            moveSpeed = 0;
            bot.crouching = true;
          } else {
            bot.crouching = false;
          }
        } else if (bot.aiState === 'hold_cover' && hasTarget) {
          // Bound & reposition periodically instead of camping crouched permanently
          if (bot.strafeTimer > 2.2) {
            bot.crouching = false;
            const sideAng =
              Math.atan2(targetZ - bot.z, targetX - bot.x) + (Math.PI * 0.42) * bot.strafeDir;
            goalX = bot.x + Math.cos(sideAng) * 3.5;
            goalZ = bot.z + Math.sin(sideAng) * 3.5;
            moveSpeed = 3.4;
          } else {
            bot.crouching = bot.role === 'marksman' || bestDist > 26;
            moveSpeed = 0;
          }
        } else if (bot.aiState === 'flank' && hasTarget) {
          bot.crouching = false;
          const angle =
            Math.atan2(targetZ - bot.z, targetX - bot.x) + (Math.PI / 2) * bot.strafeDir;
          goalX = bot.x + Math.cos(angle) * 5.0;
          goalZ = bot.z + Math.sin(angle) * 5.0;
          moveSpeed = 4.2;
        } else if (hasTarget && bot.role === 'rusher') {
          // Rushers keep advancing steadily toward enemy & flags while engaging
          bot.crouching = false;
          goalX = targetX + Math.sin(bot.id * 1.3) * 4;
          goalZ = targetZ + Math.cos(bot.id * 1.3) * 4;
          moveSpeed = 5.2;
        } else {
          bot.crouching = false;
          if (this.gameMode === 'tdm') {
            const enemyAnchorX = bot.team === 'allies' ? 28 : -28;
            const enemyAnchorZ = Math.sin(bot.id * 1.9) * 28;
            goalX = enemyAnchorX;
            goalZ = enemyAnchorZ;
            moveSpeed = 5.8;
          } else if (bot.role === 'defender') {
            const friendlyZone =
              this.zones.find((z) => z.owner === bot.team) ||
              this.zones[bot.team === 'allies' ? 0 : 2];
            const distZone = Math.hypot(friendlyZone.x - bot.x, friendlyZone.z - bot.z);
            if (distZone > 9.0) {
              goalX = friendlyZone.x;
              goalZ = friendlyZone.z;
              moveSpeed = 5.2;
            }
          } else if (bot.role === 'marksman') {
            const flankX = bot.team === 'allies' ? -38 : 38;
            const flankZ = bot.id % 4 === 0 ? -42 : 42;
            if (Math.hypot(flankX - bot.x, flankZ - bot.z) > 10) {
              goalX = flankX;
              goalZ = flankZ;
              moveSpeed = 5.2;
            }
          } else {
            const priorityZone =
              this.zones.find((z) => z.owner !== bot.team) || this.zones[1];
            goalX = priorityZone.x + Math.sin(bot.id * 1.7) * 6;
            goalZ = priorityZone.z + Math.cos(bot.id * 1.7) * 6;
            moveSpeed = 5.8;
          }
        }
      }

      const mdx = goalX - bot.x;
      const mdz = goalZ - bot.z;
      const mlen = Math.hypot(mdx, mdz);
      let actualMoveX = mdx;
      let actualMoveZ = mdz;

      if (bot.detourTimer > 0) bot.detourTimer = Math.max(0, bot.detourTimer - dt);

      if (moveSpeed > 0.1 && mlen > 0.4) {
        // Whisker-based obstacle steering + gentle teammate separation so bots never snag on walls
        const steered = steerAroundObstacles(
          bot.x,
          bot.z,
          goalX,
          goalZ,
          this.world!.obstacles,
          bot.detourDir,
        );
        let dirX = steered.dirX;
        let dirZ = steered.dirZ;

        for (let b = 0; b < this.bots.length; b++) {
          if (b === i) continue;
          const other = this.bots[b];
          if (!other.alive) continue;
          const sx = bot.x - other.x;
          const sz = bot.z - other.z;
          const sd = Math.hypot(sx, sz);
          if (sd > 0.01 && sd < 1.35) {
            const push = ((1.35 - sd) / 1.35) * 0.85;
            dirX += (sx / sd) * push;
            dirZ += (sz / sd) * push;
          }
        }
        const dNorm = Math.hypot(dirX, dirZ) || 1;
        dirX /= dNorm;
        dirZ /= dNorm;
        actualMoveX = dirX;
        actualMoveZ = dirZ;

        const stepX = bot.x + dirX * moveSpeed * dt;
        const stepZ = bot.z + dirZ * moveSpeed * dt;
        const res = resolveCircleObstacles(
          stepX,
          stepZ,
          0.54,
          this.world!.obstacles,
          ARENA_RADIUS,
        );
        bot.x = res.x;
        bot.z = res.z;
        bot.y = groundHeightAt(bot.x, bot.z, this.mapId, this.foxholes);

        // Stuck detection & automatic detour reversal
        bot.stuckCheckTimer += dt;
        if (bot.stuckCheckTimer >= 0.45) {
          const moved = Math.hypot(bot.x - bot.lastCheckX, bot.z - bot.lastCheckZ);
          if (moved < 0.28) {
            bot.detourDir *= -1;
            bot.strafeDir *= -1;
            bot.detourTimer = 1.5;
            if (bot.seekCoverTimer > 0) {
              bot.seekCoverTimer = 0;
            }
          }
          bot.lastCheckX = bot.x;
          bot.lastCheckZ = bot.z;
          bot.stuckCheckTimer = 0;
        }

        bot.walkPhase += moveSpeed * dt * 1.9;
        const swing = Math.sin(bot.walkPhase) * 0.52;
        bot.rig.leftLeg.rotation.x = swing;
        bot.rig.rightLeg.rotation.x = -swing;
        bot.rig.leftKnee.rotation.x = Math.max(0, -swing * 0.85);
        bot.rig.rightKnee.rotation.x = Math.max(0, swing * 0.85);
        // Hands stay locked on the rifle with subtle shoulder breathing sway
        bot.rig.leftArm.rotation.set(swing * 0.04, 0, 0);
        bot.rig.rightArm.rotation.set(swing * 0.04, 0, 0);
      } else {
        bot.stuckCheckTimer = 0;
        bot.lastCheckX = bot.x;
        bot.lastCheckZ = bot.z;
        const thighCrouch = bot.crouching ? -0.35 : 0;
        const kneeCrouch = bot.crouching ? 0.48 : 0;
        bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, thighCrouch, 10, dt);
        bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, thighCrouch, 10, dt);
        bot.rig.leftKnee.rotation.x = THREE.MathUtils.damp(bot.rig.leftKnee.rotation.x, kneeCrouch, 10, dt);
        bot.rig.rightKnee.rotation.x = THREE.MathUtils.damp(bot.rig.rightKnee.rotation.x, kneeCrouch, 10, dt);
        bot.rig.leftArm.rotation.x = THREE.MathUtils.damp(bot.rig.leftArm.rotation.x, 0, 10, dt);
        bot.rig.rightArm.rotation.x = THREE.MathUtils.damp(bot.rig.rightArm.rotation.x, 0, 10, dt);
      }

      const crouchY = bot.crouching ? -0.34 : 0;
      bot.rig.bodyPivot.position.y = THREE.MathUtils.damp(
        bot.rig.bodyPivot.position.y,
        crouchY,
        10,
        dt,
      );

      let targetWeaponPitch = 0;
      if (hasTarget && bot.aiState !== 'retreat_heal') {
        const desiredYaw = Math.atan2(targetX - bot.x, targetZ - bot.z);
        bot.yaw = this.dampAngle(bot.yaw, desiredYaw, 9, dt);

        const muzzleY = bot.y + (bot.crouching ? 0.96 : 1.28);
        const flatDist = Math.max(1, Math.hypot(targetX - bot.x, targetZ - bot.z));
        targetWeaponPitch = THREE.MathUtils.clamp(
          -Math.atan2(targetY - muzzleY, flatDist),
          -0.42,
          0.35,
        );

        bot.fireCooldown -= dt;
        if (bot.telegraphTimer > 0) {
          bot.telegraphTimer -= dt;
          bot.rig.telegraphGlint.visible = true;
          bot.rig.telegraphGlint.rotation.y += dt * 10;
          if (bot.telegraphTimer <= 0) {
            bot.rig.telegraphGlint.visible = false;
            if (this.hasLineOfSight(bot.x, muzzleY, bot.z, targetX, targetY, targetZ)) {
              this.fireBotWeapon(bot, targetX, targetY, targetZ, bestDist);
            } else {
              bot.crouching = false;
            }
            bot.fireCooldown =
              bot.role === 'marksman' ? 2.1 : bot.role === 'rusher' ? 0.65 : 1.05;
          }
        } else if (
          bot.fireCooldown <= 0 &&
          this.hasLineOfSight(bot.x, muzzleY, bot.z, targetX, targetY, targetZ)
        ) {
          const canAcquireToken = bot.team === this.playerTeam || activeEnemyAttackers < 4;
          if (canAcquireToken) {
            bot.telegraphTimer = bot.role === 'marksman' ? 0.5 : 0.32;
            if (bot.team !== this.playerTeam) activeEnemyAttackers++;
          } else {
            bot.fireCooldown = 0.45;
          }
        }
      } else {
        bot.rig.telegraphGlint.visible = false;
        bot.telegraphTimer = 0;
        if (mlen > 0.4) {
          const moveYaw = Math.atan2(actualMoveX, actualMoveZ);
          bot.yaw = this.dampAngle(bot.yaw, moveYaw, 7, dt);
        }
      }

      bot.weaponPitch = THREE.MathUtils.damp(bot.weaponPitch, targetWeaponPitch, 12, dt);
      const weaponBob = moveSpeed > 0.1 ? Math.sin(bot.walkPhase * 2) * 0.025 : 0;
      bot.rig.weaponMount.rotation.x = bot.weaponPitch + weaponBob;

      bot.rig.root.position.set(bot.x, bot.y, bot.z);
      bot.rig.root.rotation.y = bot.yaw;
    }
  }

  private dampAngle(current: number, target: number, lambda: number, dt: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * (1 - Math.exp(-lambda * dt));
  }

  private hasLineOfSight(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ): boolean {
    if (!this.world) return true;
    const dist2D = Math.hypot(x2 - x1, z2 - z1);
    if (dist2D < 1) return true;

    // Dug foxhole trench hides crouched/prone defenders from distant attackers
    if (dist2D > 8 && this.foxholes.length > 0) {
      for (let f = 0; f < this.foxholes.length; f++) {
        const hole = this.foxholes[f];
        if (Math.hypot(x2 - hole.x, z2 - hole.z) < hole.radius * 0.85) {
          const rimY = groundHeightAt(hole.x, hole.z, this.mapId) + 0.36;
          if (y2 < rimY) return false;
        }
      }
    }

    // Terrain ridge occlusion check so bots never shoot into hills/dirt crests between them and target
    const terrainSteps = 6;
    for (let s = 1; s < terrainSteps; s++) {
      const t = s / terrainSteps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      const sz = z1 + (z2 - z1) * t;
      if (groundHeightAt(sx, sz, this.mapId) + 0.25 > sy) {
        return false;
      }
    }

    const obs = this.world.obstacles;
    for (let i = 0; i < obs.length; i++) {
      const b = obs[i];
      if (!b.blocksSight) continue;
      if (this.segmentIntersectsAABB2D(x1, z1, x2, z2, b.minX, b.minZ, b.maxX, b.maxZ)) {
        const ox = (b.minX + b.maxX) * 0.5;
        const oz = (b.minZ + b.maxZ) * 0.5;
        const tObs = THREE.MathUtils.clamp(
          ((ox - x1) * (x2 - x1) + (oz - z1) * (z2 - z1)) / Math.max(1, dist2D * dist2D),
          0,
          1,
        );
        const rayYAtObs = y1 + (y2 - y1) * tObs;
        if (rayYAtObs < groundHeightAt(ox, oz, this.mapId) + b.height) {
          return false;
        }
      }
    }
    return true;
  }

  private segmentIntersectsAABB2D(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
  ): boolean {
    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dz = z2 - z1;

    const checks: Array<[number, number]> = [
      [-dx, x1 - minX],
      [dx, maxX - x1],
      [-dz, z1 - minZ],
      [dz, maxZ - z1],
    ];
    for (let i = 0; i < 4; i++) {
      const p = checks[i][0];
      const q = checks[i][1];
      if (Math.abs(p) < 1e-6) {
        if (q < 0) return false;
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    return t0 <= t1;
  }

  private fireBotWeapon(
    bot: BotEntity,
    tx: number,
    ty: number,
    tz: number,
    dist: number,
  ): void {
    const wId: WeaponId =
      bot.role === 'marksman'
        ? 'springfield'
        : bot.role === 'rusher'
          ? bot.team === 'axis'
            ? bot.id % 2 === 0
              ? 'ak47'
              : 'mp40'
            : 'thompson'
          : bot.team === 'axis'
            ? bot.id % 3 === 0
              ? 'stg44'
              : 'kar98k'
            : 'm1_garand';

    const weapon = WEAPONS[wId];
    const muzzleY = bot.y + (bot.crouching ? 0.96 : 1.28);
    const targetGround = groundHeightAt(tx, tz, this.mapId, this.foxholes);
    const safeTy = Math.max(ty, targetGround + 0.72);

    const dropComp = computeBallisticDrop(weapon.muzzleSpeed, dist, weapon.gravityScale);
    const spread = bot.role === 'marksman' ? 0.02 : 0.044;
    _v1.set(tx - bot.x, safeTy + dropComp - muzzleY, tz - bot.z).normalize();
    _v1.x += (Math.random() - 0.5) * spread;
    _v1.y += (Math.random() - 0.5) * spread * 0.5;
    _v1.z += (Math.random() - 0.5) * spread;
    _v1.normalize();

    // Multi-point ground clearance guard: never shoot into immediate soil or hill crest
    for (const dProbe of [1.6, 3.6, 6.0, 9.0]) {
      if (dProbe >= dist * 0.85) break;
      const probeX = bot.x + _v1.x * dProbe;
      const probeZ = bot.z + _v1.z * dProbe;
      const probeGround = groundHeightAt(probeX, probeZ, this.mapId, this.foxholes);
      if (muzzleY + _v1.y * dProbe < probeGround + 0.18) {
        bot.crouching = false;
        return;
      }
    }

    bot.rig.muzzleFlash.visible = true;
    bot.muzzleTimer = 0.05;

    const distToPlayer = Math.hypot(bot.x - this.playerX, bot.z - this.playerZ);
    if (distToPlayer < 85) {
      this.sound.playGunshot(wId, false, Math.max(0.05, 1 - distToPlayer / 85) * 0.52);
    }

    const ox = bot.x + _v1.x * 0.75;
    const oz = bot.z + _v1.z * 0.75;
    this.spawnBurst(ox, muzzleY, oz, 3, 0xd6d3d1);

    // Realistic brass-copper projectile color for all forces (never glowing red/blue lasers)
    this.spawnBallisticBullet(
      ox,
      muzzleY,
      oz,
      _v1.x * weapon.muzzleSpeed,
      _v1.y * weapon.muzzleSpeed,
      _v1.z * weapon.muzzleSpeed,
      weapon.gravityScale,
      weapon.airDrag,
      bot.team,
      bot.name,
      false,
      wId,
      false,
      0xe8b85a,
    );
  }

  private damageGroundVehicle(
    veh: GroundVehicleEntity,
    amount: number,
    killerName: string,
    killerTeam: Team,
    weaponId: KillcamInfo['killerWeaponId'],
    fromPlayer: boolean,
  ): void {
    if (!veh.alive) return;
    veh.hp -= amount;
    const distP = Math.hypot(veh.x - this.playerX, veh.z - this.playerZ);
    if (veh.hp > 0 && distP < 110) {
      this.sound.playArmorImpact(Math.max(0.2, 1 - distP / 110));
    }
    if (veh.hp <= 0) {
      veh.hp = 0;
      veh.alive = false;
      veh.respawnTimer = 28.0;
      veh.rig.root.visible = false;
      if (veh.occupantIsPlayer) {
        veh.occupantIsPlayer = false;
        if (this.activeVehicle === veh) {
          this.activeVehicle = null;
          this.weaponHolder.visible = true;
        }
        this.damagePlayer(90, killerName, killerTeam, weaponId, veh.x, veh.z);
      }
      this.spawnExplosionVfx(veh.x, veh.y + 0.8, veh.z, veh.kind === 'tank' ? 11.5 : 8.5);
      this.sound.playExplosion(Math.max(0.25, 1 - distP / 130));
      if (fromPlayer) {
        this.kills += 1;
        this.score += veh.kind === 'tank' ? 300 : 200;
        this.careerProgress = {
          ...this.careerProgress,
          careerKills: this.careerProgress.careerKills + 1,
        };
        saveCareerProgress(this.careerProgress);
        this.hitmarkerKind = 'kill';
        this.hitmarkerTimer = 0.28;
        this.sound.playHitmarker(true);
      }
      this.pushKillFeed({
        id: this.nextKillFeedId++,
        killerName,
        killerTeam,
        victimName: veh.kind === 'tank' ? 'Battle Tank' : 'Gun Truck',
        victimTeam: veh.team,
        weaponId,
        isHeadshot: false,
        timestamp: this.matchElapsed,
      });
    } else if (fromPlayer) {
      this.hitmarkerKind = 'hit';
      this.hitmarkerTimer = 0.14;
      this.sound.playHitmarker(false);
    }
  }

  private damageAircraft(
    ac: CombatAircraftEntity,
    amount: number,
    killerName: string,
    killerTeam: Team,
    weaponId: KillcamInfo['killerWeaponId'],
    fromPlayer: boolean,
  ): void {
    if (!ac.alive || ac.mode === 'crashing') return;
    ac.hp -= amount;
    if (ac.hp <= 0) {
      ac.hp = 0;
      if (ac.mode === 'player') {
        if (this.activeAircraft === ac) {
          this.activeAircraft = null;
          this.weaponHolder.visible = true;
        }
        this.damagePlayer(100, killerName, killerTeam, weaponId, ac.x, ac.z);
      }
      if (fromPlayer) {
        this.kills += 1;
        this.score += 350;
        this.careerProgress = {
          ...this.careerProgress,
          careerKills: this.careerProgress.careerKills + 1,
        };
        saveCareerProgress(this.careerProgress);
        this.hitmarkerKind = 'kill';
        this.hitmarkerTimer = 0.3;
        this.sound.playHitmarker(true);
      }
      this.pushKillFeed({
        id: this.nextKillFeedId++,
        killerName,
        killerTeam,
        victimName: ac.team === 'allies' ? 'Allied Fighter' : 'Axis Fighter',
        victimTeam: ac.team,
        weaponId,
        isHeadshot: false,
        timestamp: this.matchElapsed,
      });

      const gy = groundHeightAt(ac.x, ac.z, this.mapId);
      if (ac.y - gy > 3.5) {
        ac.mode = 'crashing';
        ac.vy = -5.5;
        ac.crashKillerName = killerName;
        ac.crashKillerTeam = killerTeam;
        ac.crashWeaponId = weaponId;
        this.spawnExplosionVfx(ac.x, ac.y, ac.z, 6.5);
      } else {
        ac.alive = false;
        ac.respawnTimer = 32.0;
        ac.rig.root.visible = false;
        this.spawnExplosionVfx(ac.x, ac.y, ac.z, 12.5);
        const distP = Math.hypot(ac.x - this.playerX, ac.z - this.playerZ);
        this.sound.playExplosion(Math.max(0.25, 1 - distP / 170));
      }
    } else if (fromPlayer) {
      this.hitmarkerKind = 'hit';
      this.hitmarkerTimer = 0.14;
      this.sound.playHitmarker(false);
    }
  }

  private fireGroundVehicleWeapon(v: GroundVehicleEntity, fromPlayer: boolean): void {
    v.ammo = Math.max(0, v.ammo - 1);
    v.fireCooldown = v.kind === 'tank' ? 2.5 : 0.12;
    v.muzzleTimer = 0.07;
    v.rig.muzzleFlash.visible = true;

    v.rig.muzzlePoint.getWorldPosition(_v1);
    if (fromPlayer) {
      _v2.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    } else {
      const cosP = Math.cos(v.gunPitch);
      _v2.set(
        Math.sin(v.turretYaw) * cosP,
        Math.sin(v.gunPitch),
        Math.cos(v.turretYaw) * cosP,
      ).normalize();
    }

    const distToP = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
    if (v.kind === 'tank') {
      v.barrelRecoil = -0.62;
      if (fromPlayer) {
        this.cameraTrauma = Math.min(0.65, this.cameraTrauma + 0.42);
      }
      if (distToP < 140) {
        this.sound.playTankCannon(fromPlayer ? 1.0 : Math.max(0.15, 1 - distToP / 140) * 0.72);
      }
      this.spawnBurst(_v1.x, _v1.y, _v1.z, 6, 0xfbbf24);
      this.spawnSmokePuff(_v1.x, _v1.y, _v1.z, _v2.x * 2.5, 0.9, _v2.z * 2.5, 1.35, 0.7, 2.8, 0xd6d3d1, 0.56);
      this.spawnSmokePuff(_v1.x + _v2.x * 0.5, _v1.y, _v1.z + _v2.z * 0.5, _v2.x * 4.2, 1.2, _v2.z * 4.2, 1.05, 0.45, 2.1, 0xe7e5e4, 0.44);
      this.spawnBallisticBullet(
        _v1.x + _v2.x * 0.6,
        _v1.y + _v2.y * 0.6,
        _v1.z + _v2.z * 0.6,
        _v2.x * 116,
        _v2.y * 116,
        _v2.z * 116,
        0.72,
        0.04,
        v.team,
        fromPlayer ? 'Player' : v.team === 'allies' ? 'Allied Armor' : 'Axis Armor',
        fromPlayer,
        'rpg7',
        true,
        0x9a3412,
      );
    } else {
      if (distToP < 105) {
        this.sound.playGunshot('bar', false, fromPlayer ? 0.92 : Math.max(0.08, 1 - distToP / 105) * 0.58);
      }
      this.spawnSmokePuff(_v1.x, _v1.y, _v1.z, _v2.x * 1.4, 0.45, _v2.z * 1.4, 0.5, 0.22, 0.85, 0xd6d3d1, 0.24);
      this.spawnBallisticBullet(
        _v1.x + _v2.x * 0.35,
        _v1.y + _v2.y * 0.35,
        _v1.z + _v2.z * 0.35,
        _v2.x * 168,
        _v2.y * 168,
        _v2.z * 168,
        0.7,
        0.1,
        v.team,
        fromPlayer ? 'Player' : v.team === 'allies' ? 'Allied Jeep' : 'Axis Jeep',
        fromPlayer,
        'bar',
        false,
        0xe8b85a,
      );
    }
  }

  private updateVehiclesAndAircraft(dt: number, elapsedSec: number, tourOnly: boolean): void {
    // 1. Ground Vehicles (Armored Gun Trucks & Heavy Battle Tanks)
    for (let i = 0; i < this.groundVehicles.length; i++) {
      const v = this.groundVehicles[i];
      if (!v.alive) {
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) {
          const y = groundHeightAt(v.patrolCenterX, v.patrolCenterZ, this.mapId);
          v.x = v.patrolCenterX;
          v.y = y;
          v.z = v.patrolCenterZ;
          v.hp = v.maxHp;
          v.ammo = v.maxAmmo;
          v.alive = true;
          v.rig.root.visible = true;
          v.rig.root.position.set(v.x, v.y, v.z);
        }
        continue;
      }

      if (v.muzzleTimer > 0) {
        v.muzzleTimer -= dt;
        if (v.muzzleTimer <= 0) v.rig.muzzleFlash.visible = false;
      }

      if (v.occupantIsPlayer) continue;

      // Hold friendly base jeep steady when player is nearby so boarding is effortless
      const holdForBoarding =
        v.team === this.playerTeam &&
        v.kind === 'jeep' &&
        this.playerAlive &&
        Math.hypot(this.playerX - v.x, this.playerZ - v.z) < 45;

      // Subtle autonomous patrol & fire support near sector
      if (!holdForBoarding) {
        v.patrolPhase += dt * (v.kind === 'tank' ? 0.16 : 0.28);
        const targetX = v.patrolCenterX + Math.cos(v.patrolPhase) * 16;
        const targetZ = v.patrolCenterZ + Math.sin(v.patrolPhase * 0.8) * 12;
        const dx = targetX - v.x;
        const dz = targetZ - v.z;
        const distToGoal = Math.hypot(dx, dz);
        if (distToGoal > 1.2) {
          const moveYaw = Math.atan2(dx, dz);
          v.yaw = this.dampAngle(v.yaw, moveYaw, 2.5, dt);
          const patrolSpd = v.kind === 'tank' ? 3.2 : 5.4;
          const nx = v.x + Math.sin(v.yaw) * patrolSpd * dt;
          const nz = v.z + Math.cos(v.yaw) * patrolSpd * dt;
          const res = resolveCircleObstacles(
            nx,
            nz,
            v.kind === 'tank' ? 2.75 : 2.15,
            this.world!.obstacles,
            ARENA_RADIUS - 8,
          );
          v.x = res.x;
          v.z = res.z;
          v.y = groundHeightAt(v.x, v.z, this.mapId);
          v.wheelSpin += patrolSpd * dt * 1.3;
        }
      }

      let aimTargetX = v.x + Math.sin(v.yaw + Math.sin(elapsedSec * 0.4) * 0.45) * 35;
      let aimTargetY = v.y + 1.4;
      let aimTargetZ = v.z + Math.cos(v.yaw + Math.sin(elapsedSec * 0.4) * 0.45) * 35;
      let hasEnemy = false;

      if (!tourOnly) {
        let bestEnemyDist = 92;
        for (let b = 0; b < this.bots.length; b++) {
          const bot = this.bots[b];
          if (!bot.alive || bot.team === v.team) continue;
          const d = Math.hypot(bot.x - v.x, bot.z - v.z);
          if (d < bestEnemyDist && this.hasLineOfSight(v.x, v.y + 2.1, v.z, bot.x, bot.y + 1.2, bot.z)) {
            bestEnemyDist = d;
            aimTargetX = bot.x;
            aimTargetY = bot.y + 1.1;
            aimTargetZ = bot.z;
            hasEnemy = true;
          }
        }
        if (v.team !== this.playerTeam && this.playerAlive) {
          const dp = Math.hypot(this.playerX - v.x, this.playerZ - v.z);
          if (dp < bestEnemyDist && this.hasLineOfSight(v.x, v.y + 2.1, v.z, this.playerX, this.playerY + 1.4, this.playerZ)) {
            aimTargetX = this.playerX;
            aimTargetY = this.playerY + 1.3;
            aimTargetZ = this.playerZ;
            hasEnemy = true;
          }
        }
      }

      const desiredTurretYaw = Math.atan2(aimTargetX - v.x, aimTargetZ - v.z);
      v.turretYaw = this.dampAngle(v.turretYaw, desiredTurretYaw, 3.8, dt);
      const flatD = Math.max(2, Math.hypot(aimTargetX - v.x, aimTargetZ - v.z));
      v.gunPitch = THREE.MathUtils.clamp(Math.atan2(aimTargetY - (v.y + 2.0), flatD), -0.18, 0.32);

      v.barrelRecoil = THREE.MathUtils.damp(v.barrelRecoil, 0, 6.5, dt);
      v.steerAngle = THREE.MathUtils.damp(v.steerAngle, 0, 8, dt);
      v.rig.driverMesh.visible = !holdForBoarding;
      this.applyGroundVehicleSuspension(v, 0, 0, dt);

      v.fireCooldown = Math.max(0, v.fireCooldown - dt);
      if (hasEnemy && v.fireCooldown <= 0 && !tourOnly) {
        if (v.ammo <= 0) v.ammo = v.maxAmmo;
        this.fireGroundVehicleWeapon(v, false);
        v.fireCooldown = v.kind === 'tank' ? 3.8 : 0.42;
      }
    }

    // 2. Combat Warplanes (Parked at Runway, AI CAP Orbit, Player-Controlled, Abandoned or Crashing)
    for (let i = 0; i < this.aircrafts.length; i++) {
      const ac = this.aircrafts[i];
      if (!ac.alive) {
        ac.respawnTimer -= dt;
        if (ac.respawnTimer <= 0) {
          ac.hp = ac.maxHp;
          ac.ammo = ac.maxAmmo;
          ac.bombsLeft = ac.bombsMax;
          ac.missilesLeft = ac.missilesMax;
          ac.flaresLeft = ac.flaresMax;
          ac.alive = true;
          ac.rig.root.visible = true;
          if (ac.id === 100 || ac.id === 101 || ac.id === 103 || ac.id === 104) {
            ac.mode = 'parked';
            ac.x = ac.homeX;
            ac.z = ac.homeZ;
            ac.y = groundHeightAt(ac.homeX, ac.homeZ, this.mapId) + 1.05;
            ac.yaw = ac.homeYaw;
            ac.pitch = 0;
            ac.bankRoll = 0;
            ac.speed = 0;
            ac.vy = 0;
            ac.throttlePct = 0;
            ac.rig.pilotMesh.visible = false;
            ac.rig.landingGear.visible = true;
          } else {
            ac.mode = 'ai_orbit';
            ac.y = ac.altitude;
            ac.speed = 31;
            ac.vy = 0;
            ac.bankRoll = -0.32;
            ac.rig.pilotMesh.visible = true;
          }
          ac.rig.wingBombs[0].visible = true;
          ac.rig.wingBombs[1].visible = true;
          ac.rig.wingMissiles[0].visible = true;
          ac.rig.wingMissiles[1].visible = true;
        }
        continue;
      }

      if (ac.mode === 'player') continue;

      if (ac.muzzleTimer > 0) {
        ac.muzzleTimer -= dt;
        if (ac.muzzleTimer <= 0) {
          ac.rig.muzzleFlashL.visible = false;
          ac.rig.muzzleFlashR.visible = false;
        }
      }

      if (ac.mode === 'abandoned' || ac.mode === 'crashing') {
        const isCrashing = ac.mode === 'crashing';
        ac.rig.propeller.rotation.z += dt * (isCrashing ? 16 : 22);
        ac.rig.propDisc.visible = false;
        ac.rig.pilotMesh.visible = isCrashing;
        ac.vy -= (isCrashing ? 16.5 : 10.5) * dt;
        ac.speed = Math.max(14, ac.speed - dt * 3.5);
        ac.bankRoll += dt * (isCrashing ? 1.85 : 0.45);
        ac.yaw -= dt * (isCrashing ? 0.55 : 0.18);
        ac.pitch = THREE.MathUtils.clamp(Math.atan2(ac.vy, ac.speed), -1.1, 0.25);

        ac.x += Math.sin(ac.yaw) * ac.speed * dt;
        ac.z += Math.cos(ac.yaw) * ac.speed * dt;
        ac.y += ac.vy * dt;

        ac.rig.root.position.set(ac.x, ac.y, ac.z);
        ac.rig.root.rotation.y = ac.yaw;
        ac.rig.airframe.rotation.set(-ac.pitch, 0, ac.bankRoll);

        ac.smokeAccum += dt;
        if (ac.smokeAccum >= 0.055) {
          ac.smokeAccum = 0;
          this.spawnParticle(
            ac.x,
            ac.y,
            ac.z,
            (Math.random() - 0.5) * 2.5,
            1.8,
            (Math.random() - 0.5) * 2.5,
            0.9,
            0.65,
            isCrashing ? (Math.random() > 0.35 ? 0x1c1917 : 0xf97316) : 0x57534e,
            -1.8,
          );
        }

        const gy = groundHeightAt(ac.x, ac.z, this.mapId);
        if (ac.y <= gy + 1.2) {
          ac.alive = false;
          ac.respawnTimer = 32.0;
          ac.rig.root.visible = false;
          this.detonateOrdnance(
            ac.x,
            gy + 0.4,
            ac.z,
            14.5,
            180,
            ac.crashKillerTeam,
            ac.crashKillerName,
            false,
            ac.crashWeaponId,
          );
        }
        continue;
      }

      if (ac.mode === 'parked') {
        ac.rig.propeller.rotation.z += dt * 3.5;
        ac.rig.propDisc.visible = false;
        ac.rig.landingGear.visible = true;
        ac.rig.root.position.set(ac.x, ac.y, ac.z);
        ac.rig.root.rotation.y = ac.yaw;
        ac.rig.airframe.rotation.set(0, 0, 0);
        ac.rig.pilotMesh.visible = false;
        continue;
      }

      ac.rig.pilotMesh.visible = true;
      ac.rig.propeller.rotation.z += dt * 36;
      ac.rig.propDisc.visible = true;
      ac.rig.landingGear.visible = false;
      const angularRate = ac.speed / ac.orbitRadius;
      ac.orbitAngle += angularRate * dt;
      const nextX = Math.cos(ac.orbitAngle) * ac.orbitRadius;
      const nextZ = ac.centerOffsetZ + Math.sin(ac.orbitAngle) * ac.orbitRadius;
      const bobY = ac.altitude + Math.sin(elapsedSec * 0.7 + i * 2) * 2.2;

      const tangentX = -Math.sin(ac.orbitAngle);
      const tangentZ = Math.cos(ac.orbitAngle);
      ac.yaw = Math.atan2(tangentX, tangentZ);
      ac.x = nextX;
      ac.y = bobY;
      ac.z = nextZ;

      ac.rig.root.position.set(ac.x, ac.y, ac.z);
      ac.rig.root.rotation.y = ac.yaw;
      ac.rig.airframe.rotation.z = ac.bankRoll;
      ac.rig.airframe.rotation.x = Math.cos(elapsedSec * 0.7 + i * 2) * 0.04;

      if (!tourOnly) {
        ac.fireCooldown -= dt;
        if (ac.fireCooldown <= 0) {
          let strafeX = 0;
          let strafeY = groundHeightAt(0, 0, this.mapId) + 1.0;
          let strafeZ = 0;
          let foundTarget = false;
          let bestAirD = 125;
          for (let b = 0; b < this.bots.length; b++) {
            const bot = this.bots[b];
            if (!bot.alive || bot.team === ac.team) continue;
            const d = Math.hypot(bot.x - ac.x, bot.z - ac.z);
            if (d < bestAirD) {
              bestAirD = d;
              strafeX = bot.x;
              strafeY = bot.y + 1.0;
              strafeZ = bot.z;
              foundTarget = true;
            }
          }
          if (foundTarget) {
            ac.fireCooldown = 3.2;
            ac.muzzleTimer = 0.06;
            ac.rig.muzzleFlashL.visible = true;
            ac.rig.muzzleFlashR.visible = true;
            ac.rig.muzzleL.getWorldPosition(_v1);
            ac.rig.muzzleR.getWorldPosition(_v2);
            for (const mPos of [_v1, _v2]) {
              _v3.set(strafeX - mPos.x, strafeY - mPos.y, strafeZ - mPos.z).normalize();
              this.spawnBallisticBullet(
                mPos.x,
                mPos.y,
                mPos.z,
                _v3.x * 165,
                _v3.y * 165,
                _v3.z * 165,
                0.45,
                0.08,
                ac.team,
                ac.team === 'allies' ? 'Allied Air Support' : 'Axis Air Support',
                false,
                'bar',
                false,
                0xe8b85a,
              );
            }
            const dp = Math.hypot(ac.x - this.playerX, ac.z - this.playerZ);
            if (dp < 150) {
              this.sound.playAircraftCannon(Math.max(0.08, 1 - dp / 150) * 0.48);
            }
          } else {
            ac.fireCooldown = 1.4;
          }
        }

        // Enemy CAP Fighter fires threat-gated IR Homing Missile when player is flying nearby
        ac.rocketCooldown = Math.max(0, ac.rocketCooldown - dt);
        if (
          ac.rocketCooldown <= 0 &&
          this.activeAircraft &&
          this.playerAlive &&
          ac.team !== this.activeAircraft.team
        ) {
          const pAc = this.activeAircraft;
          const dx = pAc.x - ac.x;
          const dy = pAc.y - ac.y;
          const dz = pAc.z - ac.z;
          const dist = Math.hypot(dx, dy, dz);
          if (dist > 65 && dist < 185) {
            ac.rocketCooldown = 16.5;
            const fwdX = Math.sin(ac.yaw);
            const fwdZ = Math.cos(ac.yaw);
            const mMesh = this.createMissileMesh();
            const mx = ac.x + fwdX * 2.5;
            const my = ac.y - 0.5;
            const mz = ac.z + fwdZ * 2.5;
            mMesh.position.set(mx, my, mz);
            this.scene.add(mMesh);

            const dirX = dx / dist;
            const dirY = dy / dist;
            const dirZ = dz / dist;
            this.homingMissiles.push({
              mesh: mMesh,
              x: mx,
              y: my,
              z: mz,
              vx: dirX * 76,
              vy: dirY * 76,
              vz: dirZ * 76,
              targetAircraftId: pAc.id,
              targetVehicleId: null,
              divertedByFlare: false,
              ownerTeam: ac.team,
              ownerName: ac.team === 'allies' ? 'Allied Air Support' : 'Axis Air Support',
              fromPlayer: false,
              life: 5.4,
              smokeAccum: 0,
            });
            if (dist < 160) this.sound.playMissileLaunch();
          }
        }
      }
    }

    // 3. Combat Helicopters (Parked Helipad, AI Gunship Patrol, Player-Piloted, Crashing)
    for (let i = 0; i < this.helicopters.length; i++) {
      const h = this.helicopters[i];
      if (!h.alive) {
        h.respawnTimer -= dt;
        if (h.respawnTimer <= 0) {
          h.hp = h.maxHp;
          h.ammo = h.maxAmmo;
          h.rocketsLeft = h.rocketsMax;
          h.flaresLeft = h.flaresMax;
          h.alive = true;
          h.rig.root.visible = true;
          const isBaseHeli = h.id === 200 || h.id === 202;
          const gy = groundHeightAt(h.homeX, h.homeZ, this.mapId);
          h.mode = isBaseHeli ? 'parked' : 'ai_orbit';
          h.flight = {
            x: isBaseHeli ? h.homeX : Math.cos(h.orbitAngle) * h.orbitRadius,
            y: isBaseHeli ? gy + 1.35 : h.altitude,
            z: isBaseHeli ? h.homeZ : Math.sin(h.orbitAngle) * h.orbitRadius,
            vx: 0,
            vy: 0,
            vz: 0,
            yaw: h.homeYaw,
            pitch: 0,
            roll: 0,
            collective: isBaseHeli ? 0.25 : 0.54,
            rotorPhase: 0,
          };
          h.rig.pilotMesh.visible = !isBaseHeli;
          h.rig.mainRotorDisc.visible = !isBaseHeli;
          h.rig.root.position.set(h.flight.x, h.flight.y, h.flight.z);
        }
        continue;
      }

      if (h.mode === 'player') continue;

      if (h.muzzleTimer > 0) {
        h.muzzleTimer -= dt;
        if (h.muzzleTimer <= 0) h.rig.muzzleFlash.visible = false;
      }

      if (h.mode === 'crashing') {
        h.flight.rotorPhase += dt * 16;
        h.rig.mainRotor.rotation.y = h.flight.rotorPhase;
        h.rig.mainRotorDisc.visible = false;
        h.rig.tailRotor.rotation.x = h.flight.rotorPhase * 2;
        h.rig.pilotMesh.visible = false;
        h.flight.vy -= 14.5 * dt;
        h.flight.yaw += dt * 3.8;
        h.flight.roll = Math.min(0.85, h.flight.roll + dt * 0.8);
        h.flight.x += h.flight.vx * dt * 0.6;
        h.flight.z += h.flight.vz * dt * 0.6;
        h.flight.y += h.flight.vy * dt;
        h.rig.root.position.set(h.flight.x, h.flight.y, h.flight.z);
        h.rig.root.rotation.y = h.flight.yaw;
        h.rig.airframe.rotation.set(-h.flight.pitch, 0, -h.flight.roll);

        h.smokeAccum += dt;
        if (h.smokeAccum >= 0.08) {
          h.smokeAccum = 0;
          this.spawnSmokePuff(
            h.flight.x,
            h.flight.y + 0.5,
            h.flight.z,
            (Math.random() - 0.5) * 1.8,
            2.2,
            (Math.random() - 0.5) * 1.8,
            1.2,
            0.75,
            2.6,
            0x292524,
            0.6,
          );
        }

        const gy = groundHeightAt(h.flight.x, h.flight.z, this.mapId);
        if (h.flight.y <= gy + 1.35) {
          h.alive = false;
          h.respawnTimer = 34.0;
          h.rig.root.visible = false;
          this.detonateOrdnance(
            h.flight.x,
            gy + 0.4,
            h.flight.z,
            14.0,
            175,
            h.crashKillerTeam,
            h.crashKillerName,
            false,
            'helicopter_cannon',
          );
        }
        continue;
      }

      if (h.mode === 'parked') {
        h.flight.rotorPhase += dt * 4.5;
        h.rig.mainRotor.rotation.y = h.flight.rotorPhase;
        h.rig.mainRotorDisc.visible = false;
        h.rig.tailRotor.rotation.x = h.flight.rotorPhase * 2.1;
        h.rig.pilotMesh.visible = false;
        h.rig.root.position.set(h.flight.x, h.flight.y, h.flight.z);
        h.rig.root.rotation.y = h.flight.yaw;
        h.rig.airframe.rotation.set(0, 0, 0);
        continue;
      }

      // AI Patrol Orbit & Gunship Support
      h.rig.pilotMesh.visible = true;
      h.flight.rotorPhase += dt * 32;
      h.rig.mainRotor.rotation.y = h.flight.rotorPhase;
      h.rig.mainRotorDisc.visible = true;
      h.rig.tailRotor.rotation.x = h.flight.rotorPhase * 2.1;

      const orbitSpd = 18.5;
      h.orbitAngle += (orbitSpd / h.orbitRadius) * dt;
      h.flight.x = Math.cos(h.orbitAngle) * h.orbitRadius;
      h.flight.z = h.centerOffsetZ + Math.sin(h.orbitAngle) * h.orbitRadius;
      h.flight.y = h.altitude + Math.sin(elapsedSec * 0.9 + i) * 1.8;
      h.flight.yaw = Math.atan2(-Math.sin(h.orbitAngle), Math.cos(h.orbitAngle));
      h.flight.pitch = -0.14;
      h.flight.roll = 0.24;
      h.rig.root.position.set(h.flight.x, h.flight.y, h.flight.z);
      h.rig.root.rotation.y = h.flight.yaw;
      h.rig.airframe.rotation.set(-h.flight.pitch, 0, -h.flight.roll);

      if (!tourOnly) {
        h.fireCooldown -= dt;
        if (h.fireCooldown <= 0) {
          let tx = 0;
          let ty = groundHeightAt(0, 0, this.mapId) + 1.0;
          let tz = 0;
          let found = false;
          let bestD = 120;
          for (let b = 0; b < this.bots.length; b++) {
            const bot = this.bots[b];
            if (!bot.alive || bot.team === h.team) continue;
            const d = Math.hypot(bot.x - h.flight.x, bot.z - h.flight.z);
            if (d < bestD) {
              bestD = d;
              tx = bot.x;
              ty = bot.y + 1.0;
              tz = bot.z;
              found = true;
            }
          }
          if (h.team !== this.playerTeam && this.playerAlive && !this.activeAircraft) {
            const dp = Math.hypot(this.playerX - h.flight.x, this.playerZ - h.flight.z);
            if (dp < bestD) {
              tx = this.playerX;
              ty = this.playerY + 1.2;
              tz = this.playerZ;
              found = true;
            }
          }
          if (found) {
            h.fireCooldown = 2.6;
            h.muzzleTimer = 0.06;
            h.rig.muzzleFlash.visible = true;
            h.rig.muzzlePoint.getWorldPosition(_v1);
            _v3.set(tx - _v1.x, ty - _v1.y, tz - _v1.z).normalize();
            this.spawnBallisticBullet(
              _v1.x,
              _v1.y,
              _v1.z,
              _v3.x * 165,
              _v3.y * 165,
              _v3.z * 165,
              0.42,
              0.08,
              h.team,
              h.team === 'allies' ? 'Allied Gunship' : 'Axis Gunship',
              false,
              'bar',
              false,
              0xe8b85a,
            );
            const dp = Math.hypot(h.flight.x - this.playerX, h.flight.z - this.playerZ);
            if (dp < 140) {
              this.sound.playAircraftCannon(Math.max(0.08, 1 - dp / 140) * 0.42);
            }
          } else {
            h.fireCooldown = 1.2;
          }
        }
      }
    }
  }

  private updateCaptureZonesAndTickets(dt: number): void {
    let playerInZone: CaptureZoneState | null = null;

    if (this.gameMode !== 'tdm') {
      for (let i = 0; i < this.zones.length; i++) {
        const z = this.zones[i];
        let alliesIn = 0;
        let axisIn = 0;

        if (this.playerAlive && Math.hypot(this.playerX - z.x, this.playerZ - z.z) <= z.radius) {
          if (this.playerTeam === 'allies') alliesIn += 1;
          else axisIn += 1;
          playerInZone = z;
        }

        for (let b = 0; b < this.bots.length; b++) {
          const bot = this.bots[b];
          if (!bot.alive) continue;
          if (Math.hypot(bot.x - z.x, bot.z - z.z) <= z.radius) {
            if (bot.team === 'allies') alliesIn += 1;
            else axisIn += 1;
          }
        }

        const prevOwner = z.owner;
        const res = stepCaptureZone(z, alliesIn, axisIn, dt);
        this.zones[i] = res.zone;

        if (res.newlyCapturedBy) {
          this.sound.playZoneCaptured(res.newlyCapturedBy === this.playerTeam);
          if (res.newlyCapturedBy === this.playerTeam && playerInZone?.id === z.id) {
            this.captures += 1;
            this.score += 250;
          }
        } else if (prevOwner !== null && res.zone.owner === null && playerInZone?.id === z.id) {
          this.score += 50;
        }
      }

      const bleed = calculateTicketBleed(this.zones, dt);
      this.alliesTickets = Math.max(0, this.alliesTickets - bleed.alliesBleed);
      this.axisTickets = Math.max(0, this.axisTickets - bleed.axisBleed);
    }

    // Finite Ammo Resupply: ONLY at Allied Base Supply Depot or Allied-owned Zone Supply Crates!
    if (this.playerAlive && this.isNearAlliedResupply()) {
      this.resupplyAccum += dt;
      if (this.resupplyAccum >= 0.85) {
        this.resupplyAccum = 0;
        const s1Spec = this.getEffectiveWeapon(this.slot1Id).spec;
        const s2Spec = this.getEffectiveWeapon(this.slot2Id).spec;
        const s3Spec = this.getEffectiveWeapon(this.secondaryId).spec;
        const prevNeed =
          this.slotAmmo[1].reserve < s1Spec.reserveMax ||
          this.slotAmmo[2].reserve < s2Spec.reserveMax ||
          this.slotAmmo[3].reserve < s3Spec.reserveMax ||
          this.grenadesCount < 2 ||
          this.backpackMedkits < this.backpackMedkitsMax;

        if (this.gameMode !== 'hardcore') {
          this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 8);
        }
        this.slotAmmo[1].reserve = Math.min(s1Spec.reserveMax, this.slotAmmo[1].reserve + 15);
        this.slotAmmo[2].reserve = Math.min(
          s2Spec.reserveMax,
          this.slotAmmo[2].reserve + (s2Spec.isExplosive ? 1 : 12),
        );
        this.slotAmmo[3].reserve = Math.min(s3Spec.reserveMax, this.slotAmmo[3].reserve + 7);
        this.grenadesCount = Math.min(2, this.grenadesCount + 1);
        this.backpackMedkits = this.backpackMedkitsMax;

        if (prevNeed && this.resupplyFlashTimer <= 0) {
          this.resupplyFlashTimer = 1.6;
          this.sound.playResupply();
        }
      }
    } else {
      this.resupplyAccum = 0;
    }
  }

  private updateFlagVisuals(dt: number, elapsedSec: number): void {
    if (!this.world) return;
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const vis = this.world.flagVisuals[i];
      if (!vis) continue;

      const targetY = 2.0 + Math.abs(z.progress) * 5.8;
      vis.banner.position.y = THREE.MathUtils.damp(vis.banner.position.y, targetY, 8, dt);
      vis.banner.rotation.y = Math.sin(elapsedSec * 4.5 + i) * 0.14;

      if (z.owner === 'allies') {
        vis.bannerMat.color.setHex(0x2563eb);
        vis.bannerMat.emissive.setHex(0x1d4ed8);
        vis.bannerMat.emissiveIntensity = 0.25;
        vis.ringMat.color.setHex(0x3b82f6);
      } else if (z.owner === 'axis') {
        vis.bannerMat.color.setHex(0xdc2626);
        vis.bannerMat.emissive.setHex(0xb91c1c);
        vis.bannerMat.emissiveIntensity = 0.25;
        vis.ringMat.color.setHex(0xef4444);
      } else {
        vis.bannerMat.color.setHex(0xe5e7eb);
        vis.bannerMat.emissive.setHex(0x000000);
        vis.bannerMat.emissiveIntensity = 0;
        vis.ringMat.color.setHex(
          z.capturingTeam === 'allies'
            ? 0x60a5fa
            : z.capturingTeam === 'axis'
              ? 0xf87171
              : 0xe5e7eb,
        );
      }
    }
  }

  private updateCameraAndViewmodel(dt: number): void {
    this.camera.up.set(0, 1, 0);
    const terrainNow = groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes);
    if (!this.playerAlive) {
      this.deathTimer += dt;
      const pose = computeDirectionalDeathPose(
        this.damageDirectionRad,
        this.playerYaw,
        terrainNow,
        this.deathStartEye,
        this.deathTimer / 0.65,
      );
      this.camera.position.set(this.playerX, terrainNow + pose.eyeHeight, this.playerZ);
      if (this.deathTimer > 0.65 && this.killerEntityPos) {
        _v1.set(this.killerEntityPos.x, this.killerEntityPos.y, this.killerEntityPos.z);
        this.camera.lookAt(_v1);
      } else {
        this.camera.rotation.set(
          THREE.MathUtils.clamp(this.playerPitch + pose.pitchOffset, -1.2, 1.2),
          this.playerYaw,
          pose.roll,
          'YXZ',
        );
      }
      this.weaponHolder.visible = false;
      this.digPreviewMesh.visible = false;
      return;
    }

    const shake = this.cameraTrauma * this.cameraTrauma;
    const shakePitch = (Math.random() - 0.5) * 0.028 * shake;
    const shakeYaw = (Math.random() - 0.5) * 0.028 * shake;

    if (this.activeAircraft) {
      const ac = this.activeAircraft;
      const fwdX = Math.sin(ac.yaw);
      const fwdZ = Math.cos(ac.yaw);
      const desiredCamX = ac.x - fwdX * 14.5;
      const desiredCamZ = ac.z - fwdZ * 14.5;
      const desiredCamY = Math.max(
        groundHeightAt(desiredCamX, desiredCamZ, this.mapId) + 1.6,
        ac.y + 4.1 - Math.sin(ac.pitch) * 6.5,
      );
      const lookX = ac.x + fwdX * 19;
      const lookY = ac.y + Math.sin(ac.pitch) * 14;
      const lookZ = ac.z + fwdZ * 19;

      const rightX = Math.cos(ac.yaw);
      const rightZ = -Math.sin(ac.yaw);
      const rollAngle = ac.bankRoll * 0.34;
      _v5.set(-rightX * Math.sin(rollAngle), Math.cos(rollAngle), -rightZ * Math.sin(rollAngle)).normalize();

      if (this.cameraSnapPending) {
        this.camera.position.set(desiredCamX, desiredCamY, desiredCamZ);
        this.camLookTarget.set(lookX, lookY, lookZ);
        this.camera.up.copy(_v5);
        this.cameraSnapPending = false;
      } else {
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredCamX, 10.5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredCamY, 10.5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredCamZ, 10.5, dt);
        this.camLookTarget.x = THREE.MathUtils.damp(this.camLookTarget.x, lookX, 12.5, dt);
        this.camLookTarget.y = THREE.MathUtils.damp(this.camLookTarget.y, lookY, 12.5, dt);
        this.camLookTarget.z = THREE.MathUtils.damp(this.camLookTarget.z, lookZ, 12.5, dt);
        this.camera.up.x = THREE.MathUtils.damp(this.camera.up.x, _v5.x, 8.5, dt);
        this.camera.up.y = THREE.MathUtils.damp(this.camera.up.y, _v5.y, 8.5, dt);
        this.camera.up.z = THREE.MathUtils.damp(this.camera.up.z, _v5.z, 8.5, dt);
        this.camera.up.normalize();
      }
      this.camera.lookAt(this.camLookTarget);
      this.weaponHolder.visible = false;
      this.worldFlashlight.visible = false;
      this.digPreviewMesh.visible = false;
      const airFov = Math.min(98, this.settings.fov + (ac.speed - 25) * 0.25);
      if (Math.abs(this.camera.fov - airFov) > 0.15) {
        this.camera.fov = airFov;
        this.camera.updateProjectionMatrix();
        this.fpCamera.fov = airFov;
        this.fpCamera.updateProjectionMatrix();
      }
      return;
    }

    if (this.activeVehicle) {
      const v = this.activeVehicle;
      const camDist = v.kind === 'tank' ? 7.6 : 5.8;
      const camHeight = v.kind === 'tank' ? 3.55 : 2.95;
      const fwdX = -Math.sin(this.playerYaw);
      const fwdZ = -Math.cos(this.playerYaw);
      const desiredX = v.x - fwdX * camDist;
      const desiredZ = v.z - fwdZ * camDist;
      const safeCamPos = resolveCircleObstacles(
        desiredX,
        desiredZ,
        0.5,
        this.world!.obstacles,
        ARENA_RADIUS,
      );
      const groundUnderCam = groundHeightAt(safeCamPos.x, safeCamPos.z, this.mapId);
      const camY = Math.max(groundUnderCam + 1.15, v.y + camHeight - Math.sin(this.playerPitch) * 2.1);

      if (this.cameraSnapPending) {
        this.camera.position.set(safeCamPos.x, camY, safeCamPos.z);
        this.cameraSnapPending = false;
      } else {
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, safeCamPos.x, 12.5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 12.5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, safeCamPos.z, 12.5, dt);
      }
      this.camera.rotation.set(
        THREE.MathUtils.clamp(this.playerPitch * 0.85 + shakePitch, -0.42, 0.55),
        this.playerYaw + shakeYaw,
        0,
        'YXZ',
      );
      this.weaponHolder.visible = false;
      this.worldFlashlight.visible = false;
      this.digPreviewMesh.visible = false;
      if (Math.abs(this.camera.fov - this.settings.fov) > 0.1) {
        this.camera.fov = this.settings.fov;
        this.camera.updateProjectionMatrix();
        this.fpCamera.fov = this.settings.fov;
        this.fpCamera.updateProjectionMatrix();
      }
      return;
    }

    const moveSpeedRatio = this.playerGrounded
      ? Math.min(1.25, Math.hypot(this.playerVx, this.playerVz) / 7.0)
      : 0;
    const bobSuppress = 1 - this.adsBlend * 0.88;

    // Realistic human gait camera headbob + stride roll sway + breathing motion
    const camBobY =
      (Math.sin(this.weaponBobPhase * 2) * 0.036 * moveSpeedRatio +
        Math.sin(this.breathPhase) * 0.005) *
      bobSuppress;
    const camBobX =
      Math.cos(this.weaponBobPhase) * 0.022 * moveSpeedRatio * bobSuppress;
    const gaitRoll =
      Math.sin(this.weaponBobPhase) * 0.015 * moveSpeedRatio * bobSuppress;

    const rightX = Math.cos(this.playerYaw);
    const rightZ = -Math.sin(this.playerYaw);
    const desiredCamX =
      this.playerX + rightX * (this.playerLean * 0.48 + camBobX);
    const desiredCamZ =
      this.playerZ + rightZ * (this.playerLean * 0.48 + camBobX);
    const clampedCam = resolveCircleObstacles(
      desiredCamX,
      desiredCamZ,
      0.28,
      this.world!.obstacles,
      ARENA_RADIUS,
    );

    const safeCamY = Math.max(
      terrainNow + 0.36,
      this.playerY + this.playerEyeHeight - this.landingDip + camBobY,
    );
    this.camera.position.set(clampedCam.x, safeCamY, clampedCam.z);
    this.camera.rotation.set(
      this.playerPitch + this.recoilPitchOffset + shakePitch + Math.sin(this.breathPhase) * 0.0018,
      this.playerYaw + shakeYaw,
      this.cameraRoll + gaitRoll + this.recoilRollOffset * 0.4,
      'YXZ',
    );
    this.cameraSnapPending = false;

    if (this.activeSlot === 5 && this.phase === 'playing') {
      const target = this.getShovelDigTarget();
      this.digPreviewMesh.visible = true;
      this.digPreviewMesh.position.set(target.x, target.y + 0.09, target.z);
      this.digPreviewMat.color.setHex(target.valid ? 0x34d399 : 0xf87171);
    } else {
      this.digPreviewMesh.visible = false;
    }

    const effWeapon = this.getEffectiveWeapon(this.getActiveWeaponId());
    const weapon = effWeapon.spec;
    const targetFov = THREE.MathUtils.lerp(
      this.settings.fov + this.sprintBlend * 3.5,
      weapon.adsFov,
      this.adsBlend,
    );
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
      this.fpCamera.fov = targetFov;
      this.fpCamera.updateProjectionMatrix();
    }

    const using2dScopeOverlay =
      this.activeSlot <= 3 &&
      this.adsBlend > 0.55 &&
      ['optic_2x', 'optic_3x', 'scope_4x', 'scope_6x', 'scope_8x'].includes(effWeapon.loadout.optic);
    this.weaponHolder.visible =
      this.phase === 'playing' && !this.isBinocularsZoomed && !using2dScopeOverlay;
    this.worldFlashlight.visible =
      this.phase === 'playing' &&
      this.activeSlot <= 3 &&
      this.accessoryActive &&
      effWeapon.hasFlashlight;

    // Proximity wall/tree/vehicle probe for realistic 1P weapon pullback tuck
    let nearestObsDist = Infinity;
    _v1.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    if (this.world && this.weaponHolder.visible) {
      const hitD = this.raycastWorldAnalytical(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
        _v1.x,
        _v1.y,
        _v1.z,
        1.15,
      );
      if (hitD !== null) nearestObsDist = hitD;
    }
    if (this.weaponHolder.visible) {
      for (let i = 0; i < this.groundVehicles.length; i++) {
        const gv = this.groundVehicles[i];
        if (!gv.alive) continue;
        const dx = gv.x - this.playerX;
        const dz = gv.z - this.playerZ;
        const d = Math.hypot(dx, dz) - (gv.kind === 'tank' ? 2.95 : 2.3);
        if (d < nearestObsDist && (dx * _v1.x + dz * _v1.z) > 0) {
          nearestObsDist = Math.max(0.25, d);
        }
      }
      for (let i = 0; i < this.aircrafts.length; i++) {
        const ac = this.aircrafts[i];
        if (!ac.alive || ac.y - groundHeightAt(ac.x, ac.z, this.mapId) >= 4.5) continue;
        const dx = ac.x - this.playerX;
        const dz = ac.z - this.playerZ;
        const d = Math.hypot(dx, dz) - 3.2;
        if (d < nearestObsDist && (dx * _v1.x + dz * _v1.z) > 0) {
          nearestObsDist = Math.max(0.25, d);
        }
      }
    }
    const rawTuck = computeWeaponWallTuck(nearestObsDist);
    this.wallTuckFactor = THREE.MathUtils.damp(this.wallTuckFactor, rawTuck.factor, 14, dt);

    // Keep live tactical laser dot projected onto forward target distance
    if (this.fpRig?.accessoryEffectGroup && this.accessoryActive && this.fpRig.laserBeam && this.fpRig.laserDot) {
      let laserLen = 28;
      if (this.world) {
        const hitD = this.raycastWorldAnalytical(
          this.camera.position.x,
          this.camera.position.y,
          this.camera.position.z,
          _v1.x,
          _v1.y,
          _v1.z,
          42,
        );
        if (hitD !== null) laserLen = Math.max(0.8, hitD - 0.3);
      }
      this.fpRig.laserBeam.scale.set(1, 1, laserLen);
      this.fpRig.laserDot.position.z = -0.048 - laserLen;
    }

    if (this.fpRig) {
      const bobX =
        Math.cos(this.weaponBobPhase) * 0.018 * moveSpeedRatio * (1 - this.adsBlend * 0.9);
      const bobY =
        Math.abs(Math.sin(this.weaponBobPhase)) *
        0.02 *
        moveSpeedRatio *
        (1 - this.adsBlend * 0.9);
      const breathY = Math.sin(this.breathPhase) * 0.0028 * (1 - this.adsBlend * 0.65);

      let reloadDrop = 0;
      let reloadTiltZ = 0;
      let reloadPitch = 0;
      let magDropY = 0;
      let boltPullZ = 0;
      if (this.isReloading) {
        const p = 1 - Math.max(0, this.reloadTimer / weapon.reloadTime);
        reloadDrop = -Math.sin(p * Math.PI) * 0.085;
        reloadTiltZ = Math.sin(p * Math.PI) * 0.45;
        reloadPitch = Math.sin(p * Math.PI) * -0.2;
        if (p < 0.35) magDropY = -(p / 0.35) * 0.24;
        else if (p < 0.7) magDropY = -(1 - (p - 0.35) / 0.35) * 0.24;
        else if (p < 0.9) boltPullZ = Math.sin(((p - 0.7) / 0.2) * Math.PI) * 0.08;
      }

      // Shovel dig/melee chop swing animation
      const swingP = this.shovelSwingTimer > 0 ? 1 - this.shovelSwingTimer / 0.38 : 0;
      const shovelChopPitch = swingP > 0 ? -Math.sin(swingP * Math.PI) * 0.95 : 0;
      const shovelChopDrop = swingP > 0 ? -Math.sin(swingP * Math.PI) * 0.14 : 0;

      this.fpRig.magGroup.position.y = magDropY;
      this.fpRig.boltGroup.position.z = this.boltKick + boltPullZ;

      const sprintEffect = this.sprintBlend * (1 - this.adsBlend);
      const sprintSwing = Math.sin(this.weaponBobPhase) * 0.045 * sprintEffect;

      const hipX = 0.22 - sprintEffect * 0.06 + sprintSwing * 0.45;
      const hipY = -0.23 - sprintEffect * 0.045;
      const hipZ = -0.54 + sprintEffect * 0.04;

      const tuckFactor = this.wallTuckFactor * (1 - this.adsBlend * 0.7);
      const tuckZ = tuckFactor * 0.22;
      const tuckYaw = tuckFactor * 0.42;
      const tuckPitch = tuckFactor * 0.24;

      const hx =
        THREE.MathUtils.lerp(hipX, this.fpRig.adsOffset.x, this.adsBlend) +
        bobX -
        this.weaponSwayYaw * 0.34 * (1 - this.adsBlend * 0.85) -
        tuckFactor * 0.05;
      const hy =
        THREE.MathUtils.lerp(hipY, this.fpRig.adsOffset.y, this.adsBlend) -
        bobY +
        breathY +
        reloadDrop +
        shovelChopDrop -
        this.landingDip * 0.28 -
        this.weaponSwayPitch * 0.28 * (1 - this.adsBlend * 0.85) -
        tuckFactor * 0.04;
      // Backward shoulder impulse along +Z (toward shooter's shoulder) + wall proximity tuck
      const hz =
        THREE.MathUtils.lerp(hipZ, this.fpRig.adsOffset.z, this.adsBlend) + this.recoilKickZ + tuckZ;

      const crouchCant = this.crouchBlend * 0.065 * (1 - this.adsBlend);
      this.weaponHolder.position.set(hx, hy, hz);
      this.weaponHolder.rotation.set(
        this.recoilKickZ * 0.35 -
          this.weaponSwayPitch * 0.38 * (1 - this.adsBlend * 0.75) +
          reloadPitch +
          shovelChopPitch -
          sprintEffect * 0.16 -
          tuckPitch,
        THREE.MathUtils.lerp(0.038, 0, this.adsBlend) -
          this.weaponSwayYaw * 0.45 * (1 - this.adsBlend * 0.75) +
          sprintEffect * 0.44 +
          tuckYaw,
        reloadTiltZ +
          this.recoilRollOffset -
          this.playerLean * 0.09 -
          this.weaponStrafeBank +
          crouchCant +
          sprintEffect * 0.22 +
          sprintSwing,
      );
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
    color: number,
    gravity: number,
  ): void {
    const p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.gravity = gravity;
  }

  private spawnExplosionVfx(x: number, y: number, z: number, radius: number): void {
    const gy = groundHeightAt(x, z, this.mapId, this.foxholes);
    const baseY = Math.max(gy + 0.12, y);

    const ex = this.explosions[this.explosionCursor];
    this.explosionCursor = (this.explosionCursor + 1) % MAX_EXPLOSIONS;
    ex.active = true;
    ex.maxLife = 0.42;
    ex.life = ex.maxLife;
    ex.radius = radius;
    ex.fireball.position.set(x, baseY + 0.4, z);
    ex.fireball.scale.setScalar(0.6);
    ex.fireballMat.color.setHex(0xfffbeb);
    ex.fireballMat.opacity = 0.96;
    ex.fireball.visible = true;

    ex.shockwave.position.set(x, gy + 0.14, z);
    ex.shockwave.scale.setScalar(0.6);
    ex.shockMat.opacity = 0.72;
    ex.shockwave.visible = true;

    // 1. Bright core fireball & orange blast embers
    for (let i = 0; i < 32; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.8 + Math.random() * 8.5;
      const col = i < 10 ? 0xfef08a : i < 22 ? 0xf97316 : 0xdc2626;
      this.spawnParticle(
        x + (Math.random() - 0.5) * 0.8,
        baseY + 0.3 + Math.random() * 0.5,
        z + (Math.random() - 0.5) * 0.8,
        Math.cos(a) * spd,
        2.5 + Math.random() * 7.2,
        Math.sin(a) * spd,
        0.38 + Math.random() * 0.34,
        0.42 + Math.random() * 0.38,
        col,
        4.2,
      );
    }

    // 2. Buoyant rising dark mushroom smoke plume
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const rSpd = 0.7 + Math.random() * 4.2;
      const smokeCol = i % 3 === 0 ? 0x292524 : i % 3 === 1 ? 0x44403c : 0x57534e;
      if (i < 12) {
        this.spawnSmokePuff(
          x + (Math.random() - 0.5) * 2.0,
          baseY + 0.5 + Math.random() * 1.1,
          z + (Math.random() - 0.5) * 2.0,
          Math.cos(a) * rSpd * 0.75,
          2.2 + Math.random() * 3.4,
          Math.sin(a) * rSpd * 0.75,
          1.7 + Math.random() * 1.1,
          1.2,
          4.2 + Math.random() * 1.6,
          smokeCol,
          0.55,
        );
      } else {
        this.spawnParticle(
          x + (Math.random() - 0.5) * 1.3,
          baseY + 0.35 + Math.random() * 0.7,
          z + (Math.random() - 0.5) * 1.3,
          Math.cos(a) * rSpd,
          2.8 + Math.random() * 4.8,
          Math.sin(a) * rSpd,
          1.25 + Math.random() * 0.95,
          0.65 + Math.random() * 0.65,
          smokeCol,
          -2.4,
        );
      }
    }

    // 3. Heavy ballistic dirt clods & shrapnel arcs
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 4.5 + Math.random() * 11.0;
      this.spawnParticle(
        x,
        baseY + 0.15,
        z,
        Math.cos(a) * spd,
        5.8 + Math.random() * 8.8,
        Math.sin(a) * spd,
        0.7 + Math.random() * 0.45,
        0.16 + Math.random() * 0.14,
        i % 2 === 0 ? 0x5c4938 : 0x3b332b,
        21,
      );
    }
  }

  private spawnSmokePuff(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    startSize: number,
    endSize: number,
    colorHex: number,
    baseOpacity: number,
  ): void {
    const sp = this.smokePuffs[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE_PUFFS;
    sp.active = true;
    sp.x = x;
    sp.y = y;
    sp.z = z;
    sp.vx = vx;
    sp.vy = vy;
    sp.vz = vz;
    sp.life = life;
    sp.maxLife = Math.max(0.05, life);
    sp.startSize = startSize;
    sp.endSize = endSize;
    sp.baseOpacity = baseOpacity;
    sp.mat.color.setHex(colorHex);
    sp.mat.opacity = baseOpacity;
    sp.sprite.position.set(x, y, z);
    sp.sprite.scale.set(startSize, startSize, 1);
    sp.sprite.visible = true;
  }

  private updateSmokePuffs(dt: number): void {
    for (let i = 0; i < MAX_SMOKE_PUFFS; i++) {
      const sp = this.smokePuffs[i];
      if (!sp.active) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.active = false;
        sp.sprite.visible = false;
        continue;
      }
      const prog = 1 - sp.life / sp.maxLife;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.z += sp.vz * dt;
      sp.vx *= Math.max(0, 1 - dt * 1.4);
      sp.vz *= Math.max(0, 1 - dt * 1.4);
      sp.vy += dt * 0.35;
      const sz = THREE.MathUtils.lerp(sp.startSize, sp.endSize, Math.pow(prog, 0.7));
      sp.sprite.position.set(sp.x, sp.y, sp.z);
      sp.sprite.scale.set(sz, sz, 1);
      sp.mat.opacity = sp.baseOpacity * (1 - prog * prog);
    }
  }

  private updateExplosions(dt: number): void {
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      const ex = this.explosions[i];
      if (!ex.active) continue;
      ex.life -= dt;
      if (ex.life <= 0) {
        ex.active = false;
        ex.fireball.visible = false;
        ex.shockwave.visible = false;
        continue;
      }
      const p = 1 - ex.life / ex.maxLife;
      // Fast fiery core flash (fades out cleanly before smoke takes over)
      const fbProgress = Math.min(1, p * 1.55);
      const fbScale = (0.4 + Math.sin(fbProgress * Math.PI * 0.5) * 0.75) * (ex.radius * 0.22);
      ex.fireball.scale.set(fbScale, fbScale * 0.9, fbScale);
      ex.fireball.position.y += dt * 2.2;
      if (fbProgress < 0.35) {
        ex.fireballMat.color.setHex(0xfffbeb);
      } else if (fbProgress < 0.72) {
        ex.fireballMat.color.setHex(0xf97316);
      } else {
        ex.fireballMat.color.setHex(0xdc2626);
      }
      ex.fireballMat.opacity = Math.max(0, (1 - fbProgress) * 0.92);
      ex.fireball.visible = fbProgress < 1;

      const swScale = 0.7 + p * ex.radius * 0.98;
      ex.shockwave.scale.setScalar(swScale);
      ex.shockMat.opacity = Math.max(0, (1 - p) * 0.65);
    }
  }

  private spawnBurst(x: number, y: number, z: number, count: number, color: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 7;
      this.spawnParticle(
        x,
        y,
        z,
        Math.cos(angle) * spd,
        1.5 + Math.random() * 6,
        Math.sin(angle) * spd,
        0.28 + Math.random() * 0.35,
        0.08 + Math.random() * 0.14,
        color,
        14,
      );
    }
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.gravity < 0) {
        p.vx *= Math.max(0, 1 - dt * 1.6);
        p.vz *= Math.max(0, 1 - dt * 1.6);
      }
      const progress = 1 - p.life / p.maxLife;
      const s =
        p.gravity < 0
          ? p.size * (0.75 + progress * 0.95) * (1 - Math.pow(progress, 2.2))
          : p.size * (p.life / p.maxLife);
      _v3.set(p.x, p.y, p.z);
      _scale.set(s, s, s);
      _quat.identity();
      _mat.compose(_v3, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat);
      this.particleMesh.setColorAt(i, _color.setHex(p.color));
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private emitHud(): void {
    const activeWId = this.getActiveWeaponId();
    const eff = this.getEffectiveWeapon(activeWId);
    const spec = eff.spec;
    const ammo =
      this.activeSlot <= 3
        ? this.slotAmmo[this.activeSlot as 1 | 2 | 3]
        : { mag: 0, reserve: 0 };

    let activeZoneId: string | null = null;
    if (this.gameMode !== 'tdm') {
      for (let i = 0; i < this.zones.length; i++) {
        if (
          Math.hypot(this.playerX - this.zones[i].x, this.playerZ - this.zones[i].z) <=
          this.zones[i].radius
        ) {
          activeZoneId = this.zones[i].id;
          break;
        }
      }
    }

    const minimapActors: MinimapActor[] = [];
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (!b.alive) continue;
      const dist = Math.hypot(b.x - this.playerX, b.z - this.playerZ);
      const showOnMap =
        b.team === this.playerTeam ||
        b.spottedTimer > 0 ||
        (this.gameMode !== 'hardcore' && dist < 95);
      if (showOnMap) {
        minimapActors.push({ x: b.x, z: b.z, team: b.team });
      }
    }
    for (const entry of this.remotePlayers.values()) {
      if (!entry.snap.alive) continue;
      if (entry.snap.team === this.playerTeam || this.gameMode !== 'hardcore') {
        minimapActors.push({ x: entry.snap.x, z: entry.snap.z, team: entry.snap.team });
      }
    }
    for (let i = 0; i < this.groundVehicles.length; i++) {
      const v = this.groundVehicles[i];
      if (!v.alive) continue;
      minimapActors.push({ x: v.x, z: v.z, team: v.team, vehicleKind: v.kind });
    }
    for (let i = 0; i < this.aircrafts.length; i++) {
      const a = this.aircrafts[i];
      if (!a.alive) continue;
      minimapActors.push({ x: a.x, z: a.z, team: a.team, vehicleKind: 'aircraft' });
    }

    const speedNow = Math.hypot(this.playerVx, this.playerVz);
    const wantsWalk = this.heldKeys.has(this.settings.bindings.walk) || this.walkToggle;
    const isSprinting =
      this.isActionHeld('sprint') &&
      speedNow > 7.5 &&
      this.stanceMode === 'stand';

    const currentStance: Stance =
      this.stanceMode === 'prone'
        ? 'prone'
        : this.stanceMode === 'crouch'
          ? 'crouch'
          : isSprinting
            ? 'sprint'
            : wantsWalk
              ? 'walk'
              : 'stand';

    const maxTix = this.gameMode === 'tdm' ? TDM_MAX_TICKETS : MAX_TICKETS;
    const inAircraft = this.activeAircraft;
    const inGroundVeh = this.activeVehicle;
    const terrainUnderAc = inAircraft ? groundHeightAt(inAircraft.x, inAircraft.z, this.mapId) : 0;

    this.onHudUpdate({
      phase: this.phase,
      mapId: this.mapId,
      gameMode: this.gameMode,
      loadoutId: this.loadoutId,
      playerTeam: this.playerTeam,
      isOnline: this.isOnline,
      onlineStatus: this.onlineStatus,
      onlineRoomCode: this.onlineRoomCode,
      onlinePlayerCount: this.onlinePlayerCount,
      health: Math.round(this.playerHealth),
      maxHealth: this.playerMaxHealth,
      stamina: Math.round(this.playerStamina),
      stance: currentStance,
      lean: Math.round(this.playerLean * 10) / 10,
      weaponId: activeWId,
      slot1Id: this.slot1Id,
      slot2Id: this.slot2Id,
      secondaryId: this.secondaryId,
      activeSlot: this.activeSlot,
      activeOptic: eff.loadout.optic,
      activeMuzzle: eff.loadout.muzzle,
      activeRail: eff.loadout.rail,
      accessoryActive: this.accessoryActive,
      magAmmo: ammo.mag,
      magMax: spec.magSize,
      reserveAmmo: ammo.reserve,
      grenades: this.grenadesCount,
      foxholesUsed: this.foxholes.length,
      foxholesMax: MAX_PLAYER_FOXHOLES,
      isReloading: this.isReloading,
      reloadProgress:
        this.isReloading && spec.reloadTime > 0
          ? 1 - Math.max(0, this.reloadTimer / spec.reloadTime)
          : 0,
      isAds: this.adsBlend > 0.55 && this.activeSlot <= 3 && !inGroundVeh && !inAircraft,
      isBinocularsActive: this.isBinocularsZoomed && this.playerAlive && !inGroundVeh && !inAircraft,
      showAimArrow: this.settings.showAimArrow,
      nearResupply: this.isNearAlliedResupply(),
      nearArmory: this.isNearAlliedArmory() && !inGroundVeh && !inAircraft,
      outOfAmmo: this.activeSlot <= 3 && ammo.mag === 0 && ammo.reserve === 0 && !inGroundVeh && !inAircraft,
      resupplyFlash: this.resupplyFlashTimer > 0,
      crosshairSpread:
        6 + speedNow * 1.3 + this.recoilKickZ * 180 - this.adsBlend * 6,
      aimArrowX: Math.round(this.aimArrowX),
      aimArrowY: Math.round(this.aimArrowY),
      aimTargetDist: this.aimTargetDist,
      alliesTickets: Math.round(this.alliesTickets),
      axisTickets: Math.round(this.axisTickets),
      maxTickets: maxTix,
      timeRemaining: Math.ceil(this.timeRemaining),
      zones: this.gameMode === 'tdm' ? [] : this.zones.map((z) => ({ ...z })),
      activeZoneId,
      kills: this.kills,
      deaths: this.deaths,
      captures: this.captures,
      score: this.score,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      hitmarkerKind: this.hitmarkerKind,
      damageFlashAlpha: this.damageFlashAlpha,
      damageDirectionRad: this.damageDirectionRad,
      pointerLocked: this.pointerLocked,
      muted: this.sound.isMuted(),
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerYaw: this.playerYaw,
      minimapActors,
      killFeed: [...this.killFeed],
      winner: this.winner,
      matchElapsed: Math.round(this.matchElapsed),
      respawnTimer: Math.max(0, Number(this.playerRespawnTimer.toFixed(1))),
      killcam: this.lastKillcam,
      nearbyVehicleKind: this.nearbyAircraft
        ? 'aircraft'
        : this.nearbyVehicle
          ? this.nearbyVehicle.kind
          : null,
      inVehicleKind: inAircraft ? 'aircraft' : inGroundVeh ? inGroundVeh.kind : null,
      vehicleHp: inAircraft
        ? Math.round(inAircraft.hp)
        : inGroundVeh
          ? Math.round(inGroundVeh.hp)
          : 0,
      vehicleMaxHp: inAircraft ? inAircraft.maxHp : inGroundVeh ? inGroundVeh.maxHp : 0,
      vehicleSpeedKmh: inAircraft
        ? Math.round(inAircraft.speed * 3.6)
        : inGroundVeh
          ? Math.round(Math.abs(inGroundVeh.speed) * 3.6)
          : 0,
      vehicleAmmo: inAircraft ? inAircraft.ammo : inGroundVeh ? inGroundVeh.ammo : 0,
      vehicleAltitudeM: inAircraft ? Math.max(0, Math.round(inAircraft.y - terrainUnderAc)) : 0,
      vehicleReticleX: Math.round(this.vehicleReticleX),
      vehicleReticleY: Math.round(this.vehicleReticleY),
      vehicleReticleVisible: this.vehicleReticleVisible && (Boolean(inAircraft) || Boolean(inGroundVeh)),
      aircraftBombs: inAircraft ? inAircraft.bombsLeft : 0,
      aircraftBombsMax: inAircraft ? inAircraft.bombsMax : 2,
      aircraftMissiles: inAircraft ? inAircraft.missilesLeft : 0,
      aircraftMissilesMax: inAircraft ? inAircraft.missilesMax : 2,
      aircraftFlares: inAircraft ? inAircraft.flaresLeft : 0,
      aircraftFlaresMax: inAircraft ? inAircraft.flaresMax : 4,
      aircraftThreatWarning: inAircraft ? this.aircraftThreatWarning : 'none',
      aircraftThrottlePct: inAircraft ? Math.round(inAircraft.throttlePct) : 0,
      aircraftLockActive: Boolean(inAircraft && this.aircraftLockTargetName && inAircraft.missilesLeft > 0),
      aircraftLockTargetName: inAircraft ? this.aircraftLockTargetName : null,
      flightAimX: Math.round(this.flightAimX),
      flightAimY: Math.round(this.flightAimY),
      isParachuting: this.isParachuting,
      parachuteAltitudeM: this.isParachuting
        ? Math.max(0, Math.round(this.playerY - groundHeightAt(this.playerX, this.playerZ, this.mapId, this.foxholes)))
        : 0,
      backpackMedkits: this.backpackMedkits,
      backpackMedkitsMax: this.backpackMedkitsMax,
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.sound.stopCockpitWarnings();
    this.sound.stopEngineCue();
    this.mp.disconnect();
    this.clearRemotePlayers();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.unbindEvents();
    if (this.world) {
      this.world.dispose();
    }
    this.skyGeo.dispose();
    this.skyMat.dispose();
    this.digPreviewMesh.geometry.dispose();
    this.digPreviewMat.dispose();
    this.flareGeo.dispose();
    this.flareMat.dispose();
    this.flareHaloGeo.dispose();
    this.flareHaloMat.dispose();
    this.grenadeGeo.dispose();
    this.grenadeMat.dispose();
    this.explosionSphereGeo.dispose();
    this.explosionRingGeo.dispose();
    for (const ex of this.explosions) {
      ex.fireballMat.dispose();
      ex.shockMat.dispose();
    }
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.bulletMesh.geometry.dispose();
    (this.bulletMesh.material as THREE.Material).dispose();
    this.casingMesh.geometry.dispose();
    (this.casingMesh.material as THREE.Material).dispose();
    this.ambientMesh.geometry.dispose();
    (this.ambientMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
