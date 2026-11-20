import type {
  BotAiState,
  BotRole,
  CaptureZoneConfig,
  CaptureZoneState,
  FoxholeRecord,
  LoadoutId,
  MapId,
  ObstacleBox,
  Team,
  WeaponId,
  WeaponSpec,
} from './types';

export const MAX_TICKETS = 250;
export const TDM_MAX_TICKETS = 50;
export const MATCH_DURATION_SECONDS = 420;
export const ARENA_RADIUS = 260;
export const GRAVITY_ACCEL = 9.81;
export const MAX_PLAYER_FOXHOLES = 8;

export const ALLY_BASE_CENTER = { x: -192, z: 66 };
export const AXIS_BASE_CENTER = { x: 192, z: -66 };
export const ALLY_AIRFIELD_CENTER = { x: -178, z: 102 };
export const AXIS_AIRFIELD_CENTER = { x: 178, z: -102 };

export const PRIMARY_WEAPON_IDS: WeaponId[] = [
  'ak47',
  'ppsh41',
  'm1_garand',
  'kar98k',
  'thompson',
  'mp40',
  'stg44',
  'bar',
  'springfield',
];

export const SLOT2_WEAPON_IDS: WeaponId[] = [
  'rpg7',
  'bazooka',
  'panzerschreck',
  'ak47',
  'ppsh41',
  'thompson',
  'stg44',
  'springfield',
];

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  ak47: {
    id: 'ak47',
    slotType: 'primary',
    nameEn: 'AK-47 Kalashnikov',
    nameAr: 'بندقية AK-47 كلاشنكوف',
    roleEn: '7.62×39mm Assault Rifle',
    roleAr: 'بندقية هجومية 7.62 · قوة ومدى',
    damage: 38,
    fireInterval: 0.112,
    magSize: 30,
    reserveMax: 180,
    reloadTime: 1.85,
    hipSpread: 0.028,
    adsSpread: 0.0018,
    recoilPitch: 0.013,
    recoilYaw: 0.006,
    automatic: true,
    adsFov: 48,
    muzzleSpeed: 132,
    gravityScale: 1.8,
    airDrag: 0.19,
    rangeFalloffStart: 62,
  },
  ppsh41: {
    id: 'ppsh41',
    slotType: 'primary',
    nameEn: 'PPSh-41 Drum SMG',
    nameAr: 'رشاش PPSh-41 (قرص 71)',
    roleEn: '7.62×25mm High-Capacity SMG',
    roleAr: 'رشاش سريع بمخزن قرصي 71 طلقة',
    damage: 23,
    fireInterval: 0.078,
    magSize: 71,
    reserveMax: 213,
    reloadTime: 2.15,
    hipSpread: 0.036,
    adsSpread: 0.0046,
    recoilPitch: 0.008,
    recoilYaw: 0.006,
    automatic: true,
    adsFov: 52,
    muzzleSpeed: 108,
    gravityScale: 2.0,
    airDrag: 0.27,
    rangeFalloffStart: 42,
  },
  m1_garand: {
    id: 'm1_garand',
    slotType: 'primary',
    nameEn: 'M1 Garand',
    nameAr: 'بندقية M1 Garand',
    roleEn: 'Semi-Auto Rifle · Precision',
    roleAr: 'بندقية نصف آلية · دقة عالية',
    damage: 45,
    fireInterval: 0.24,
    magSize: 8,
    reserveMax: 72,
    reloadTime: 1.55,
    hipSpread: 0.022,
    adsSpread: 0.0009,
    recoilPitch: 0.018,
    recoilYaw: 0.005,
    automatic: false,
    adsFov: 46,
    muzzleSpeed: 138,
    gravityScale: 1.75,
    airDrag: 0.18,
    rangeFalloffStart: 65,
  },
  kar98k: {
    id: 'kar98k',
    slotType: 'primary',
    nameEn: 'Karabiner 98k',
    nameAr: 'بندقية Kar98k',
    roleEn: 'Bolt-Action · Heavy Impact',
    roleAr: 'بندقية يدوية · ضرر عالٍ',
    damage: 68,
    fireInterval: 0.72,
    magSize: 5,
    reserveMax: 45,
    reloadTime: 1.85,
    hipSpread: 0.028,
    adsSpread: 0.0007,
    recoilPitch: 0.024,
    recoilYaw: 0.006,
    automatic: false,
    adsFov: 44,
    muzzleSpeed: 152,
    gravityScale: 1.6,
    airDrag: 0.15,
    rangeFalloffStart: 85,
  },
  thompson: {
    id: 'thompson',
    slotType: 'primary',
    nameEn: 'Thompson M1A1',
    nameAr: 'رشاش Thompson',
    roleEn: 'Submachine Gun · Rapid',
    roleAr: 'رشاش خفيف · إطلاق سريع',
    damage: 25,
    fireInterval: 0.095,
    magSize: 30,
    reserveMax: 180,
    reloadTime: 1.65,
    hipSpread: 0.034,
    adsSpread: 0.0044,
    recoilPitch: 0.009,
    recoilYaw: 0.006,
    automatic: true,
    adsFov: 52,
    muzzleSpeed: 96,
    gravityScale: 2.15,
    airDrag: 0.32,
    rangeFalloffStart: 35,
  },
  mp40: {
    id: 'mp40',
    slotType: 'primary',
    nameEn: 'MP 40',
    nameAr: 'رشاش MP 40',
    roleEn: 'Tactical SMG · Controlled',
    roleAr: 'رشاش متوازن · ثبات عالٍ',
    damage: 27,
    fireInterval: 0.115,
    magSize: 32,
    reserveMax: 192,
    reloadTime: 1.6,
    hipSpread: 0.028,
    adsSpread: 0.0036,
    recoilPitch: 0.008,
    recoilYaw: 0.0045,
    automatic: true,
    adsFov: 52,
    muzzleSpeed: 102,
    gravityScale: 2.05,
    airDrag: 0.28,
    rangeFalloffStart: 40,
  },
  stg44: {
    id: 'stg44',
    slotType: 'primary',
    nameEn: 'StG 44',
    nameAr: 'بندقية هجومية StG-44',
    roleEn: 'Assault Rifle · Versatile',
    roleAr: 'بندقية هجومية · مدى متوسط',
    damage: 34,
    fireInterval: 0.13,
    magSize: 30,
    reserveMax: 180,
    reloadTime: 1.75,
    hipSpread: 0.026,
    adsSpread: 0.002,
    recoilPitch: 0.011,
    recoilYaw: 0.005,
    automatic: true,
    adsFov: 48,
    muzzleSpeed: 126,
    gravityScale: 1.85,
    airDrag: 0.21,
    rangeFalloffStart: 58,
  },
  bar: {
    id: 'bar',
    slotType: 'primary',
    nameEn: 'BAR M1918A2',
    nameAr: 'رشاش ثقيل BAR',
    roleEn: 'Automatic Rifle · High Power',
    roleAr: 'رشاش آلي ثقيل · اختراق عالٍ',
    damage: 42,
    fireInterval: 0.165,
    magSize: 20,
    reserveMax: 140,
    reloadTime: 2.05,
    hipSpread: 0.032,
    adsSpread: 0.0025,
    recoilPitch: 0.015,
    recoilYaw: 0.007,
    automatic: true,
    adsFov: 47,
    muzzleSpeed: 140,
    gravityScale: 1.7,
    airDrag: 0.17,
    rangeFalloffStart: 70,
  },
  springfield: {
    id: 'springfield',
    slotType: 'primary',
    nameEn: 'Springfield M1903A4',
    nameAr: 'قناصة Springfield',
    roleEn: 'Scoped Sniper · Long Range',
    roleAr: 'قناصة بمنظار · مدى بعيد',
    damage: 88,
    fireInterval: 0.88,
    magSize: 5,
    reserveMax: 40,
    reloadTime: 2.0,
    hipSpread: 0.045,
    adsSpread: 0.0005,
    recoilPitch: 0.028,
    recoilYaw: 0.006,
    automatic: false,
    adsFov: 24,
    muzzleSpeed: 172,
    gravityScale: 1.48,
    airDrag: 0.12,
    rangeFalloffStart: 120,
  },
  rpg7: {
    id: 'rpg7',
    slotType: 'launcher',
    nameEn: 'RPG-7V2 Rocket Launcher',
    nameAr: 'قاذفة صواريخ RPG-7',
    roleEn: '85mm PG-7V Anti-Tank Launcher',
    roleAr: 'قاذفة مضادة للدبابات والمركبات',
    damage: 215,
    fireInterval: 1.4,
    magSize: 1,
    reserveMax: 5,
    reloadTime: 2.2,
    hipSpread: 0.012,
    adsSpread: 0.0011,
    recoilPitch: 0.032,
    recoilYaw: 0.007,
    automatic: false,
    adsFov: 44,
    muzzleSpeed: 78,
    gravityScale: 1.32,
    airDrag: 0.04,
    rangeFalloffStart: 160,
    isExplosive: true,
    blastRadius: 10.5,
  },
  bazooka: {
    id: 'bazooka',
    slotType: 'launcher',
    nameEn: 'M1A1 Bazooka',
    nameAr: 'قاذفة صواريخ Bazooka',
    roleEn: 'Anti-Armor Rocket Launcher',
    roleAr: 'قاذفة صواريخ مضادة للتحصينات',
    damage: 175,
    fireInterval: 1.45,
    magSize: 1,
    reserveMax: 5,
    reloadTime: 2.3,
    hipSpread: 0.015,
    adsSpread: 0.0014,
    recoilPitch: 0.035,
    recoilYaw: 0.008,
    automatic: false,
    adsFov: 50,
    muzzleSpeed: 64,
    gravityScale: 1.55,
    airDrag: 0.06,
    rangeFalloffStart: 140,
    isExplosive: true,
    blastRadius: 9.0,
  },
  panzerschreck: {
    id: 'panzerschreck',
    slotType: 'launcher',
    nameEn: 'Panzerschreck RPzB',
    nameAr: 'قاذفة Panzerschreck',
    roleEn: 'Heavy Blast Rocket Tube',
    roleAr: 'قاذفة ثقيلة · انفجار واسع',
    damage: 195,
    fireInterval: 1.6,
    magSize: 1,
    reserveMax: 4,
    reloadTime: 2.5,
    hipSpread: 0.016,
    adsSpread: 0.0014,
    recoilPitch: 0.038,
    recoilYaw: 0.009,
    automatic: false,
    adsFov: 50,
    muzzleSpeed: 70,
    gravityScale: 1.45,
    airDrag: 0.05,
    rangeFalloffStart: 150,
    isExplosive: true,
    blastRadius: 10.0,
  },
  m1911: {
    id: 'm1911',
    slotType: 'sidearm',
    nameEn: 'Colt M1911',
    nameAr: 'مسدس Colt 1911',
    roleEn: 'Sidearm · Quick Draw',
    roleAr: 'مسدس ثانوي · سحب سريع',
    damage: 32,
    fireInterval: 0.21,
    magSize: 7,
    reserveMax: 56,
    reloadTime: 1.15,
    hipSpread: 0.026,
    adsSpread: 0.006,
    recoilPitch: 0.012,
    recoilYaw: 0.0045,
    automatic: false,
    adsFov: 56,
    muzzleSpeed: 88,
    gravityScale: 2.3,
    airDrag: 0.36,
    rangeFalloffStart: 25,
  },
  binoculars: {
    id: 'binoculars',
    slotType: 'gadget',
    nameEn: 'Field Binoculars 6×30',
    nameAr: 'منظار ميداني يدوي 6×30',
    roleEn: 'Recon Optics · Non-Firing',
    roleAr: 'منظار استطلاع بعيد المدى (لا يُطلق النار)',
    damage: 0,
    fireInterval: 0.2,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    hipSpread: 0,
    adsSpread: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    automatic: false,
    adsFov: 16,
    muzzleSpeed: 100,
    gravityScale: 1,
    airDrag: 0,
    rangeFalloffStart: 200,
  },
  shovel: {
    id: 'shovel',
    slotType: 'gadget',
    nameEn: 'Entrenching Shovel',
    nameAr: 'مجرفة الحفر التكتيكية',
    roleEn: 'Dig Foxholes & Cover',
    roleAr: 'حفر خنادق وسواتر للاختباء',
    damage: 55,
    fireInterval: 0.55,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    hipSpread: 0,
    adsSpread: 0,
    recoilPitch: 0.012,
    recoilYaw: 0.005,
    automatic: false,
    adsFov: 64,
    muzzleSpeed: 40,
    gravityScale: 1,
    airDrag: 0,
    rangeFalloffStart: 3,
  },
};

export const LOADOUT_PRIMARY: Record<LoadoutId, WeaponId> = {
  rifleman: 'm1_garand',
  assault: 'thompson',
  heavy: 'stg44',
  marksman: 'springfield',
};

export const MAP_ZONES: Record<MapId, CaptureZoneConfig[]> = {
  forest: [
    {
      id: 'zone_a',
      label: 'A',
      nameEn: 'Timber Outpost',
      nameAr: 'موقع الأخشاب',
      x: -106,
      z: 34,
      radius: 13,
      initialOwner: 'allies',
    },
    {
      id: 'zone_b',
      label: 'B',
      nameEn: 'River Crossing',
      nameAr: 'معبر النهر',
      x: 0,
      z: 0,
      radius: 13.5,
      initialOwner: null,
    },
    {
      id: 'zone_c',
      label: 'C',
      nameEn: 'Pine Ridge Bunker',
      nameAr: 'حصن الغابة',
      x: 106,
      z: -34,
      radius: 13,
      initialOwner: 'axis',
    },
  ],
  desert: [
    {
      id: 'zone_a',
      label: 'A',
      nameEn: 'Fuel Depot',
      nameAr: 'مستودع الوقود',
      x: -114,
      z: -28,
      radius: 13,
      initialOwner: 'allies',
    },
    {
      id: 'zone_b',
      label: 'B',
      nameEn: 'Oasis Ruins',
      nameAr: 'أطلال الواحة',
      x: 0,
      z: 6,
      radius: 13.5,
      initialOwner: null,
    },
    {
      id: 'zone_c',
      label: 'C',
      nameEn: 'Sandstone Fort',
      nameAr: 'قلعة الرمال',
      x: 114,
      z: 28,
      radius: 13,
      initialOwner: 'axis',
    },
  ],
  normandy: [
    {
      id: 'zone_a',
      label: 'A',
      nameEn: 'Village Square',
      nameAr: 'ساحة القرية',
      x: -104,
      z: 34,
      radius: 13,
      initialOwner: 'allies',
    },
    {
      id: 'zone_b',
      label: 'B',
      nameEn: 'Stone Bridge',
      nameAr: 'الجسر الحجري',
      x: 0,
      z: 0,
      radius: 13.5,
      initialOwner: null,
    },
    {
      id: 'zone_c',
      label: 'C',
      nameEn: 'Ridge Bunker',
      nameAr: 'حصن التلة',
      x: 104,
      z: -34,
      radius: 13,
      initialOwner: 'axis',
    },
  ],
  stalingrad: [
    {
      id: 'zone_a',
      label: 'A',
      nameEn: 'Railway Yard',
      nameAr: 'ساحة السكة الحديد',
      x: -108,
      z: 30,
      radius: 13,
      initialOwner: 'allies',
    },
    {
      id: 'zone_b',
      label: 'B',
      nameEn: 'Central Square',
      nameAr: 'الميدان المدمر',
      x: 0,
      z: 0,
      radius: 14,
      initialOwner: null,
    },
    {
      id: 'zone_c',
      label: 'C',
      nameEn: 'Tractor Factory',
      nameAr: 'مصنع الجبهة',
      x: 108,
      z: -30,
      radius: 13,
      initialOwner: 'axis',
    },
  ],
};

export function createInitialZones(mapId: MapId): CaptureZoneState[] {
  return MAP_ZONES[mapId].map((cfg) => ({
    ...cfg,
    owner: cfg.initialOwner,
    capturingTeam: null,
    progress: cfg.initialOwner === 'allies' ? 1 : cfg.initialOwner === 'axis' ? -1 : 0,
  }));
}

/**
 * Advances a physical bullet or rocket projectile by dt with realistic gravity drop & drag.
 */
export function stepBallisticProjectile(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  gravityScale: number,
  airDrag: number,
  dt: number,
): { x: number; y: number; z: number; vx: number; vy: number; vz: number } {
  const dragFactor = Math.max(0.18, 1 - airDrag * dt);
  const nextVx = vx * dragFactor;
  const nextVz = vz * dragFactor;
  const nextVy = vy * dragFactor - GRAVITY_ACCEL * gravityScale * dt;

  return {
    x: x + nextVx * dt,
    y: y + nextVy * dt,
    z: z + nextVz * dt,
    vx: nextVx,
    vy: nextVy,
    vz: nextVz,
  };
}

/**
 * Estimates vertical projectile drop in meters at a horizontal distance.
 */
export function computeBallisticDrop(
  muzzleSpeed: number,
  distance: number,
  gravityScale: number,
): number {
  if (muzzleSpeed <= 0 || distance <= 0) return 0;
  const flightTime = distance / muzzleSpeed;
  return 0.5 * GRAVITY_ACCEL * gravityScale * flightTime * flightTime;
}

/**
 * Computes vertical terrain displacement from dug foxholes (pit inside + raised earth parapet around rim).
 */
export function foxholeHeightDelta(
  x: number,
  z: number,
  foxholes: FoxholeRecord[],
): number {
  let delta = 0;
  for (let i = 0; i < foxholes.length; i++) {
    const f = foxholes[i];
    const d = Math.hypot(x - f.x, z - f.z);
    if (d > f.radius * 1.45) continue;
    const innerR = f.radius * 0.78;
    if (d <= innerR) {
      const t = 1 - (d / innerR) * (d / innerR);
      delta = Math.min(delta, -f.depth * (0.45 + 0.55 * t));
    } else {
      // Raised protective dirt parapet around the foxhole edge
      const rimDist = (d - innerR) / (f.radius * 0.67);
      const ridge = Math.sin(Math.min(1, rimDist) * Math.PI);
      delta += ridge * 0.44;
    }
  }
  return delta;
}

export function groundHeightAt(
  x: number,
  z: number,
  mapId: MapId = 'forest',
  foxholes?: FoxholeRecord[],
): number {
  const zones = MAP_ZONES[mapId];
  let hill =
    Math.sin(x * 0.026) * Math.cos(z * 0.026) * 2.8 +
    Math.sin(x * 0.055 + 1.1) * Math.sin(z * 0.052 - 0.5) * 0.85;

  if (mapId === 'desert') {
    hill =
      Math.sin(x * 0.022 + z * 0.012) * 3.4 +
      Math.cos(z * 0.038 - 0.6) * 1.15;
  } else if (mapId === 'forest') {
    hill =
      Math.sin(x * 0.024) * Math.cos(z * 0.028) * 3.1 +
      Math.sin(x * 0.062 + 0.4) * Math.cos(z * 0.055) * 0.9;
  } else if (mapId === 'stalingrad') {
    hill =
      Math.sin(x * 0.018) * Math.cos(z * 0.02) * 1.5 +
      Math.sin(x * 0.065) * Math.sin(z * 0.06) * 0.45;
  }

  const distFromCenter = Math.hypot(x, z);
  const rimRise = Math.max(0, distFromCenter - 238) * 0.28;

  let flatMask = 1.0;

  for (let i = 0; i < zones.length; i++) {
    const d = Math.hypot(x - zones[i].x, z - zones[i].z);
    if (d < 24) {
      const t = Math.max(0, (d - 14) / 10);
      flatMask = Math.min(flatMask, t * t * (3 - 2 * t));
    }
  }

  const dAllySpawn = Math.hypot(x - ALLY_BASE_CENTER.x, z - ALLY_BASE_CENTER.z);
  const dAxisSpawn = Math.hypot(x - AXIS_BASE_CENTER.x, z - AXIS_BASE_CENTER.z);
  const dAllyAir = Math.hypot(x - ALLY_AIRFIELD_CENTER.x, z - ALLY_AIRFIELD_CENTER.z);
  const dAxisAir = Math.hypot(x - AXIS_AIRFIELD_CENTER.x, z - AXIS_AIRFIELD_CENTER.z);
  const minSpawnDist = Math.min(dAllySpawn, dAxisSpawn, dAllyAir, dAxisAir);
  if (minSpawnDist < 28) {
    const t = Math.max(0, (minSpawnDist - 16) / 12);
    flatMask = Math.min(flatMask, t * t * (3 - 2 * t));
  }

  let riverDip = 0;
  if (mapId === 'normandy' || mapId === 'forest') {
    const riverDist = Math.abs(x - z * 0.32);
    if (riverDist < 8.5) {
      const bridgeDist = Math.abs(z);
      if (bridgeDist > 6.5) {
        const dipT = 1 - riverDist / 8.5;
        const bridgeFade = Math.min(1, (bridgeDist - 6.5) / 4.0);
        riverDip = -1.4 * dipT * bridgeFade;
      }
    }
  }

  const baseH = hill * flatMask + rimRise + riverDip;
  return foxholes && foxholes.length > 0 ? baseH + foxholeHeightDelta(x, z, foxholes) : baseH;
}

/**
 * Computes normalized terrain surface normal at (x, z) for physical slope movement.
 */
export function groundNormalAt(
  x: number,
  z: number,
  mapId: MapId = 'forest',
): { nx: number; ny: number; nz: number } {
  const eps = 0.6;
  const hL = groundHeightAt(x - eps, z, mapId);
  const hR = groundHeightAt(x + eps, z, mapId);
  const hD = groundHeightAt(x, z - eps, mapId);
  const hU = groundHeightAt(x, z + eps, mapId);
  const dx = (hL - hR) / (2 * eps);
  const dz = (hD - hU) / (2 * eps);
  const len = Math.hypot(dx, 1, dz);
  return { nx: dx / len, ny: 1 / len, nz: dz / len };
}

/**
 * Evaluates dynamic tactical AI state by role so bots advance to effective combat distance
 * instead of crouching far away and shooting at the ground.
 */
export function chooseBotTacticalAction(
  hp: number,
  maxHp: number,
  hasTarget: boolean,
  targetDist: number,
  role: BotRole = 'rusher',
): BotAiState {
  if (hp < maxHp * 0.36) {
    return 'retreat_heal';
  }
  if (hasTarget) {
    if (role === 'rusher') {
      return targetDist > 20 ? 'advance' : 'flank';
    }
    if (role === 'defender') {
      if (targetDist > 34) return 'advance';
      return targetDist < 12 ? 'flank' : 'hold_cover';
    }
    // marksman
    if (targetDist > 64) return 'advance';
    return targetDist < 15 ? 'flank' : 'hold_cover';
  }
  return 'advance';
}

/**
 * Computes grounded directional death fall pose (never clips camera below ground).
 */
export function computeDirectionalDeathPose(
  damageDirectionRad: number | null,
  playerYaw: number,
  terrainY: number,
  startEyeHeight: number,
  progress: number,
): { eyeHeight: number; roll: number; pitchOffset: number } {
  const p = Math.max(0, Math.min(1, progress));
  const easeOut = 1 - Math.pow(1 - p, 2.5);
  const minClearEye = 0.36; // Keeps camera lens safely above terrain soil
  const eyeHeight = Math.max(
    minClearEye,
    startEyeHeight - (startEyeHeight - minClearEye) * easeOut,
  );

  // Relative angle of incoming damage determines fall direction (left/right/back/forward)
  const rel = damageDirectionRad !== null ? damageDirectionRad - playerYaw : 0;
  const sideBias = Math.sin(rel);
  const frontBias = Math.cos(rel);
  const rollSign = Math.abs(sideBias) > 0.2 ? Math.sign(sideBias) : 1;
  const roll = rollSign * 1.18 * easeOut;
  const pitchOffset = (frontBias >= 0 ? 0.34 : -0.28) * easeOut;

  void terrainY;
  return { eyeHeight, roll, pitchOffset };
}

export function isPointBlockedByObstacles(
  x: number,
  z: number,
  radius: number,
  obstacles: ObstacleBox[],
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    const box = obstacles[i];
    const cx = Math.max(box.minX, Math.min(x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

/**
 * Proactive forward whisker steering around house/bunker walls so bots never grind or stick on corners.
 */
export function steerAroundObstacles(
  bx: number,
  bz: number,
  goalX: number,
  goalZ: number,
  obstacles: ObstacleBox[],
  preferredSide: number,
): { dirX: number; dirZ: number; blockedCenter: boolean } {
  const gx = goalX - bx;
  const gz = goalZ - bz;
  const len = Math.hypot(gx, gz);
  if (len < 1e-4) return { dirX: 0, dirZ: 0, blockedCenter: false };

  const baseAngle = Math.atan2(gz, gx);
  const probeClear = (ang: number) => {
    const px1 = bx + Math.cos(ang) * 1.45;
    const pz1 = bz + Math.sin(ang) * 1.45;
    const px2 = bx + Math.cos(ang) * 2.85;
    const pz2 = bz + Math.sin(ang) * 2.85;
    return (
      !isPointBlockedByObstacles(px1, pz1, 0.58, obstacles) &&
      !isPointBlockedByObstacles(px2, pz2, 0.58, obstacles)
    );
  };

  if (probeClear(baseAngle)) {
    return { dirX: gx / len, dirZ: gz / len, blockedCenter: false };
  }

  const side = preferredSide >= 0 ? 1 : -1;
  const candidateOffsets = [
    side * 0.65,
    -side * 0.65,
    side * 1.22,
    -side * 1.22,
    side * 1.75,
    -side * 1.75,
  ];
  for (let i = 0; i < candidateOffsets.length; i++) {
    const ang = baseAngle + candidateOffsets[i];
    if (probeClear(ang)) {
      return { dirX: Math.cos(ang), dirZ: Math.sin(ang), blockedCenter: true };
    }
  }

  const fallbackAng = baseAngle + side * (Math.PI * 0.6);
  return { dirX: Math.cos(fallbackAng), dirZ: Math.sin(fallbackAng), blockedCenter: true };
}

function segmentSphereDist(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
): number {
  const ocX = ox - cx;
  const ocY = oy - cy;
  const ocZ = oz - cz;
  const b = ocX * dx + ocY * dy + ocZ * dz;
  const c = ocX * ocX + ocY * ocY + ocZ * ocZ - r * r;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  if (t >= 0 && t <= maxDist) return t;
  if (c < 0) return 0;
  return -1;
}

/**
 * Continuous 4-zone anatomical soldier hitbox (head, upper chest, pelvis/abdomen, legs)
 * eliminating hollow gaps between torso and head or waist.
 */
export function testSoldierHitbox(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  sx: number,
  sy: number,
  sz: number,
  crouching: boolean,
): { hit: boolean; isHead: boolean; dist: number } {
  const crouchShift = crouching ? -0.35 : 0;
  const headT = segmentSphereDist(ox, oy, oz, dx, dy, dz, maxDist, sx, sy + 1.62 + crouchShift, sz, 0.30);
  const chestT = segmentSphereDist(ox, oy, oz, dx, dy, dz, maxDist, sx, sy + 1.24 + crouchShift * 0.72, sz, 0.44);
  const hipT = segmentSphereDist(ox, oy, oz, dx, dy, dz, maxDist, sx, sy + 0.84 + crouchShift * 0.4, sz, 0.42);
  const legT = segmentSphereDist(ox, oy, oz, dx, dy, dz, maxDist, sx, sy + 0.44 + crouchShift * 0.15, sz, 0.36);

  let bestT = Infinity;
  let isHead = false;
  if (headT >= 0 && headT < bestT) {
    bestT = headT;
    isHead = true;
  }
  for (const t of [chestT, hipT, legT]) {
    if (t >= 0 && t < bestT) {
      bestT = t;
      isHead = false;
    }
  }
  return bestT < Infinity
    ? { hit: true, isHead, dist: bestT }
    : { hit: false, isHead: false, dist: -1 };
}

export function resolveCircleObstacles(
  x: number,
  z: number,
  radius: number,
  obstacles: ObstacleBox[],
  arenaRadius: number = ARENA_RADIUS,
): { x: number; z: number; hitBoundary: boolean } {
  let nx = x;
  let nz = z;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < obstacles.length; i++) {
      const box = obstacles[i];
      const closestX = Math.max(box.minX, Math.min(nx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ));
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else {
          const leftPen = nx - box.minX;
          const rightPen = box.maxX - nx;
          const topPen = nz - box.minZ;
          const bottomPen = box.maxZ - nz;
          const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
          if (minPen === leftPen) nx = box.minX - radius;
          else if (minPen === rightPen) nx = box.maxX + radius;
          else if (minPen === topPen) nz = box.minZ - radius;
          else nz = box.maxZ + radius;
        }
      }
    }
  }

  let hitBoundary = false;
  const maxR = arenaRadius - radius;
  const len = Math.hypot(nx, nz);
  if (len > maxR && len > 1e-6) {
    nx = (nx / len) * maxR;
    nz = (nz / len) * maxR;
    hitBoundary = true;
  }

  return { x: nx, z: nz, hitBoundary };
}

export function stepCaptureZone(
  zone: CaptureZoneState,
  alliesCount: number,
  axisCount: number,
  dt: number,
): { zone: CaptureZoneState; newlyCapturedBy: Team | null } {
  const diff = alliesCount - axisCount;
  if (diff === 0) {
    let nextProgress = zone.progress;
    if (zone.owner === 'allies' && nextProgress < 1 && nextProgress > 0) {
      nextProgress = Math.min(1, nextProgress + dt * 0.08);
    } else if (zone.owner === 'axis' && nextProgress > -1 && nextProgress < 0) {
      nextProgress = Math.max(-1, nextProgress - dt * 0.08);
    }
    return {
      zone: {
        ...zone,
        capturingTeam: null,
        progress: nextProgress,
      },
      newlyCapturedBy: null,
    };
  }

  const capturingTeam: Team = diff > 0 ? 'allies' : 'axis';
  const dir = diff > 0 ? 1 : -1;
  const rate = (0.16 + Math.min(3, Math.abs(diff) - 1) * 0.06) * dt;
  const nextProgress = Math.max(-1, Math.min(1, zone.progress + dir * rate));

  let nextOwner = zone.owner;
  let newlyCapturedBy: Team | null = null;

  if (zone.owner === 'allies' && nextProgress <= 0) {
    nextOwner = null;
  } else if (zone.owner === 'axis' && nextProgress >= 0) {
    nextOwner = null;
  }

  if (nextProgress >= 1 && nextOwner !== 'allies') {
    nextOwner = 'allies';
    newlyCapturedBy = 'allies';
  } else if (nextProgress <= -1 && nextOwner !== 'axis') {
    nextOwner = 'axis';
    newlyCapturedBy = 'axis';
  }

  return {
    zone: {
      ...zone,
      owner: nextOwner,
      capturingTeam:
        (capturingTeam === 'allies' && nextProgress < 1) ||
        (capturingTeam === 'axis' && nextProgress > -1)
          ? capturingTeam
          : null,
      progress: nextProgress,
    },
    newlyCapturedBy,
  };
}

export function calculateTicketBleed(
  zones: CaptureZoneState[],
  dt: number,
): { alliesBleed: number; axisBleed: number } {
  let alliesFlags = 0;
  let axisFlags = 0;
  for (let i = 0; i < zones.length; i++) {
    if (zones[i].owner === 'allies') alliesFlags++;
    else if (zones[i].owner === 'axis') axisFlags++;
  }

  const diff = alliesFlags - axisFlags;
  if (diff > 0) {
    return { alliesBleed: 0, axisBleed: diff * 1.4 * dt };
  }
  if (diff < 0) {
    return { alliesBleed: Math.abs(diff) * 1.4 * dt, axisBleed: 0 };
  }
  return { alliesBleed: 0, axisBleed: 0 };
}

export function computeHitDamage(
  weapon: WeaponSpec,
  distance: number,
  isHeadshot: boolean,
): number {
  const over = Math.max(0, distance - weapon.rangeFalloffStart);
  const falloff = Math.max(0.5, 1 - over * 0.008);
  const mult = isHeadshot ? 1.85 : 1.0;
  return Math.round(weapon.damage * falloff * mult);
}

export function checkMatchOutcome(
  alliesTickets: number,
  axisTickets: number,
  timeRemaining: number,
): Team | 'draw' | null {
  if (alliesTickets <= 0 && axisTickets <= 0) return 'draw';
  if (axisTickets <= 0) return 'allies';
  if (alliesTickets <= 0) return 'axis';
  if (timeRemaining <= 0) {
    if (alliesTickets > axisTickets) return 'allies';
    if (axisTickets > alliesTickets) return 'axis';
    return 'draw';
  }
  return null;
}

export interface AimAssistCandidate {
  x: number;
  y: number;
  z: number;
}

/**
 * Light aim assist: computes a subtle yaw/pitch nudge toward the nearest visible
 * enemy inside a narrow forward cone without hard-locking onto targets.
 */
export function computeLightAimAssist(
  camX: number,
  camY: number,
  camZ: number,
  playerYaw: number,
  playerPitch: number,
  candidates: AimAssistCandidate[],
  maxAngleRad = 0.085,
  maxDist = 115,
  strength = 0.16,
  dt = 0.016,
): { yawDelta: number; pitchDelta: number; active: boolean } {
  if (candidates.length === 0 || dt <= 0) {
    return { yawDelta: 0, pitchDelta: 0, active: false };
  }

  const cosPitch = Math.cos(playerPitch);
  const fwdX = -Math.sin(playerYaw) * cosPitch;
  const fwdY = Math.sin(playerPitch);
  const fwdZ = -Math.cos(playerYaw) * cosPitch;

  let bestAngle = maxAngleRad;
  let bestTarget: AimAssistCandidate | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const vx = c.x - camX;
    const vy = c.y - camY;
    const vz = c.z - camZ;
    const dist = Math.hypot(vx, vy, vz);
    if (dist < 1.2 || dist > maxDist) continue;
    const inv = 1 / dist;
    const dot = Math.max(-1, Math.min(1, (vx * fwdX + vy * fwdY + vz * fwdZ) * inv));
    const ang = Math.acos(dot);
    if (ang < bestAngle) {
      bestAngle = ang;
      bestTarget = c;
    }
  }

  if (!bestTarget) {
    return { yawDelta: 0, pitchDelta: 0, active: false };
  }

  const dx = bestTarget.x - camX;
  const dy = bestTarget.y - camY;
  const dz = bestTarget.z - camZ;
  const horizDist = Math.max(0.01, Math.hypot(dx, dz));
  const targetYaw = Math.atan2(-dx, -dz);
  const targetPitch = Math.atan2(dy, horizDist);

  let diffYaw = targetYaw - playerYaw;
  while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
  while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
  const diffPitch = targetPitch - playerPitch;

  // Taper off assist smoothly near dead-center so fine micro-aim stays natural
  const blend = Math.min(0.32, dt * strength * 14);
  return {
    yawDelta: diffYaw * blend,
    pitchDelta: diffPitch * blend * 0.75,
    active: true,
  };
}

export interface FlightStepState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
}

/**
 * Steps player-piloted combat aircraft aerodynamics (throttle, pitch climb/dive,
 * coordinated banking turn, minimum takeoff lift speed, and arena boundary turnback).
 */
export function stepFlightPhysics(
  state: FlightStepState,
  throttleInput: number, // -1 (brake) .. +1 (boost)
  steerInput: number, // -1 (left) .. +1 (right)
  pitchInput: number, // -1 (nose down) .. +1 (nose up)
  groundY: number,
  dt: number,
  arenaRadius: number = ARENA_RADIUS,
): FlightStepState {
  const minCruise = 22;
  const maxSpeed = 68;
  const targetAccel = throttleInput > 0 ? 22 : throttleInput < 0 ? -18 : 0;
  const nextSpeed = Math.max(
    minCruise,
    Math.min(maxSpeed, state.speed + targetAccel * dt + (28 - state.speed) * 0.25 * dt),
  );

  const targetRoll = -steerInput * 0.68;
  const nextRoll = state.roll + (targetRoll - state.roll) * Math.min(1, dt * 5.2);
  const nextYaw = state.yaw - steerInput * 1.15 * dt;

  const targetPitch = Math.max(-0.55, Math.min(0.55, state.pitch + pitchInput * 1.1 * dt));
  const nextPitch = targetPitch - targetPitch * 0.45 * dt;

  const cosP = Math.cos(nextPitch);
  let nx = state.x + Math.sin(nextYaw) * cosP * nextSpeed * dt;
  let nz = state.z + Math.cos(nextYaw) * cosP * nextSpeed * dt;
  let ny = state.y + Math.sin(nextPitch) * nextSpeed * dt;

  // Lift keeps aircraft airborne smoothly above ground
  const minSafeAlt = groundY + 4.2;
  if (ny < minSafeAlt) {
    ny = minSafeAlt;
  } else if (ny > 115) {
    ny = 115;
  }

  const dist = Math.hypot(nx, nz);
  const bound = arenaRadius - 10;
  if (dist > bound && dist > 0.01) {
    nx = (nx / dist) * bound;
    nz = (nz / dist) * bound;
  }

  return {
    x: nx,
    y: ny,
    z: nz,
    yaw: nextYaw,
    pitch: nextPitch,
    roll: nextRoll,
    speed: nextSpeed,
  };
}

