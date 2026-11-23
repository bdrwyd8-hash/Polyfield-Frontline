import * as THREE from 'three';
import type { MapId } from './types';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

const cachedSets = new Map<string, PbrTextureSet>();
const cachedSingleTextures = new Map<string, THREE.CanvasTexture>();
const allTextures: THREE.CanvasTexture[] = [];

function seededRand(seed: number): () => number {
  let s = seed | 0 || 1337;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function makeTexture(
  canvas: HTMLCanvasElement,
  isSrgb: boolean,
  repeatX = 1,
  repeatY = 1,
  clampEdge = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isSrgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  allTextures.push(tex);
  return tex;
}

export function applyTextureAnisotropy(maxAniso: number): void {
  const a = Math.max(1, Math.min(8, Math.round(maxAniso)));
  for (let i = 0; i < allTextures.length; i++) {
    const tex = allTextures[i];
    if (tex.anisotropy !== a) {
      tex.anisotropy = a;
      tex.needsUpdate = true;
    }
  }
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function paintNoiseField(
  size: number,
  seed: number,
  baseRgb: [number, number, number],
  varRgb: [number, number, number],
  blotchCount: number,
  blotchColors: Array<[number, number, number, number]>,
  streakHoriz = false,
): PbrTextureSet {
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const [roughC, roughCtx] = makeCanvas(size, size);
  const rand = seededRand(seed);

  albedoCtx.fillStyle = `rgb(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]})`;
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(128,128,128)';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = 'rgb(205,205,205)';
  roughCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < blotchCount; i++) {
    const col = blotchColors[i % blotchColors.length];
    const x = rand() * size;
    const y = rand() * size;
    const rw = streakHoriz ? 12 + rand() * 34 : 4 + rand() * 20;
    const rh = streakHoriz ? 1 + rand() * 2.5 : 4 + rand() * 20;
    const alpha = col[3] * (0.45 + rand() * 0.55);

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        albedoCtx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha.toFixed(3)})`;
        albedoCtx.beginPath();
        albedoCtx.ellipse(x + ox, y + oy, rw, rh, streakHoriz ? 0 : rand() * Math.PI, 0, Math.PI * 2);
        albedoCtx.fill();

        const bVal = clampByte(100 + rand() * 68);
        bumpCtx.fillStyle = `rgba(${bVal},${bVal},${bVal},${(alpha * 0.85).toFixed(3)})`;
        bumpCtx.beginPath();
        bumpCtx.ellipse(x + ox, y + oy, rw, rh, 0, 0, Math.PI * 2);
        bumpCtx.fill();

        const rVal = clampByte(170 + rand() * 75);
        roughCtx.fillStyle = `rgba(${rVal},${rVal},${rVal},${(alpha * 0.65).toFixed(3)})`;
        roughCtx.beginPath();
        roughCtx.ellipse(x + ox, y + oy, rw, rh, 0, 0, Math.PI * 2);
        roughCtx.fill();
      }
    }
  }

  // Pixel micro-grain pass for crisp close-up texture without plastic sheen
  const aImg = albedoCtx.getImageData(0, 0, size, size);
  const bImg = bumpCtx.getImageData(0, 0, size, size);
  const rImg = roughCtx.getImageData(0, 0, size, size);
  const ad = aImg.data;
  const bd = bImg.data;
  const rd = rImg.data;
  for (let i = 0; i < ad.length; i += 4) {
    const n = (rand() - 0.5) * 2;
    ad[i] = clampByte(ad[i] + n * varRgb[0]);
    ad[i + 1] = clampByte(ad[i + 1] + n * varRgb[1]);
    ad[i + 2] = clampByte(ad[i + 2] + n * varRgb[2]);

    const bn = clampByte(bd[i] + n * 24);
    bd[i] = bn;
    bd[i + 1] = bn;
    bd[i + 2] = bn;

    const rn = clampByte(rd[i] + n * 16);
    rd[i] = rn;
    rd[i + 1] = rn;
    rd[i + 2] = rn;
  }
  albedoCtx.putImageData(aImg, 0, 0);
  bumpCtx.putImageData(bImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  return {
    map: makeTexture(albedoC, true),
    bumpMap: makeTexture(bumpC, false),
    roughnessMap: makeTexture(roughC, false),
  };
}

export function getTerrainPbrSet(mapId: MapId): PbrTextureSet {
  const key = `terrain:${mapId}`;
  const existing = cachedSets.get(key);
  if (existing) return existing;

  let set: PbrTextureSet;
  if (mapId === 'desert') {
    set = paintNoiseField(
      512,
      101,
      [194, 165, 118],
      [14, 12, 9],
      480,
      [
        [176, 146, 102, 0.34],
        [208, 181, 134, 0.32],
        [152, 126, 88, 0.25],
      ],
      true,
    );
  } else if (mapId === 'normandy') {
    set = paintNoiseField(
      512,
      202,
      [146, 134, 98],
      [15, 14, 11],
      520,
      [
        [114, 112, 74, 0.38],
        [168, 152, 112, 0.32],
        [92, 82, 56, 0.28],
      ],
    );
  } else if (mapId === 'stalingrad') {
    set = paintNoiseField(
      512,
      303,
      [126, 122, 114],
      [16, 15, 14],
      560,
      [
        [98, 92, 84, 0.42],
        [156, 154, 148, 0.32],
        [72, 66, 58, 0.35],
      ],
    );
  } else {
    set = paintNoiseField(
      512,
      404,
      [108, 116, 78],
      [13, 14, 10],
      520,
      [
        [86, 98, 60, 0.38],
        [124, 112, 76, 0.28],
        [74, 82, 52, 0.32],
      ],
    );
  }

  set.map.repeat.set(64, 64);
  set.bumpMap.repeat.set(64, 64);
  if (set.roughnessMap) set.roughnessMap.repeat.set(64, 64);
  cachedSets.set(key, set);
  return set;
}

export function getGunmetalPbrSet(): PbrTextureSet {
  const key = 'gunmetal';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const [roughC, roughCtx] = makeCanvas(size, size);
  const rand = seededRand(505);

  albedoCtx.fillStyle = 'rgb(225,228,232)';
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(128,128,128)';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = 'rgb(145,145,145)';
  roughCtx.fillRect(0, 0, size, size);

  // Anisotropic brushed steel striations & edge wear
  for (let i = 0; i < 650; i++) {
    const y = rand() * size;
    const x = rand() * size;
    const w = 18 + rand() * 75;
    const shade = Math.floor(198 + rand() * 52);
    albedoCtx.fillStyle = `rgba(${shade},${shade},${shade + 2},0.16)`;
    albedoCtx.fillRect(x, y, w, 1);
    const b = Math.floor(110 + rand() * 38);
    bumpCtx.fillStyle = `rgba(${b},${b},${b},0.22)`;
    bumpCtx.fillRect(x, y, w, 1);
    const r = Math.floor(110 + rand() * 68);
    roughCtx.fillStyle = `rgba(${r},${r},${r},0.18)`;
    roughCtx.fillRect(x, y, w, 1);
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 2),
    bumpMap: makeTexture(bumpC, false, 2, 2),
    roughnessMap: makeTexture(roughC, false, 2, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getWoodStockPbrSet(): PbrTextureSet {
  const key = 'woodStock';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const [roughC, roughCtx] = makeCanvas(size, size);
  const rand = seededRand(606);

  albedoCtx.fillStyle = 'rgb(218,196,174)';
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(128,128,128)';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = 'rgb(172,172,172)';
  roughCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.19) * 14 + Math.sin(y * 0.47) * 6;
    const v = clampByte(192 + wave + (rand() - 0.5) * 18);
    albedoCtx.fillStyle = `rgb(${v},${clampByte(v - 18)},${clampByte(v - 34)})`;
    albedoCtx.fillRect(0, y, size, 1);
    const b = clampByte(128 + wave * 1.4 + (rand() - 0.5) * 16);
    bumpCtx.fillStyle = `rgb(${b},${b},${b})`;
    bumpCtx.fillRect(0, y, size, 1);
  }

  // Fine pore streaks
  for (let i = 0; i < 360; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 14 + rand() * 52;
    albedoCtx.fillStyle = 'rgba(72,44,24,0.18)';
    albedoCtx.fillRect(x, y, w, 1.3);
    bumpCtx.fillStyle = 'rgba(84,84,84,0.28)';
    bumpCtx.fillRect(x, y, w, 1.3);
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 2),
    bumpMap: makeTexture(bumpC, false, 2, 2),
    roughnessMap: makeTexture(roughC, false, 2, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getPolymerPbrSet(): PbrTextureSet {
  const key = 'polymer';
  const existing = cachedSets.get(key);
  if (existing) return existing;
  const set = paintNoiseField(
    128,
    707,
    [220, 222, 224],
    [12, 12, 12],
    180,
    [
      [188, 190, 194, 0.28],
      [235, 236, 238, 0.22],
    ],
  );
  set.map.repeat.set(3, 3);
  set.bumpMap.repeat.set(3, 3);
  if (set.roughnessMap) set.roughnessMap.repeat.set(3, 3);
  cachedSets.set(key, set);
  return set;
}

export function getBduCamoPbrSet(team: 'allies' | 'axis'): PbrTextureSet {
  const key = `bdu:${team}`;
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const [roughC, roughCtx] = makeCanvas(size, size);
  const rand = seededRand(team === 'allies' ? 808 : 909);

  if (team === 'allies') {
    albedoCtx.fillStyle = 'rgb(112,118,88)';
  } else {
    albedoCtx.fillStyle = 'rgb(106,110,104)';
  }
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(128,128,128)';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = 'rgb(228,228,228)';
  roughCtx.fillRect(0, 0, size, size);

  const camoPatches: Array<[number, number, number, number]> =
    team === 'allies'
      ? [
          [78, 86, 56, 0.48],
          [126, 114, 78, 0.4],
          [56, 62, 42, 0.36],
        ]
      : [
          [76, 80, 72, 0.46],
          [122, 114, 96, 0.38],
          [58, 60, 54, 0.34],
        ];

  for (let i = 0; i < 160; i++) {
    const col = camoPatches[i % camoPatches.length];
    const x = rand() * size;
    const y = rand() * size;
    const rx = 10 + rand() * 24;
    const ry = 8 + rand() * 20;
    albedoCtx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${col[3]})`;
    albedoCtx.beginPath();
    albedoCtx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    albedoCtx.fill();
  }

  // Ripstop cloth twill grid
  albedoCtx.strokeStyle = 'rgba(0,0,0,0.08)';
  bumpCtx.strokeStyle = 'rgba(155,155,155,0.45)';
  albedoCtx.lineWidth = 1;
  bumpCtx.lineWidth = 1;
  for (let p = 0; p < size; p += 4) {
    albedoCtx.beginPath();
    albedoCtx.moveTo(p, 0);
    albedoCtx.lineTo(p, size);
    albedoCtx.moveTo(0, p);
    albedoCtx.lineTo(size, p);
    albedoCtx.stroke();

    bumpCtx.beginPath();
    bumpCtx.moveTo(p, 0);
    bumpCtx.lineTo(p, size);
    bumpCtx.moveTo(0, p);
    bumpCtx.lineTo(size, p);
    bumpCtx.stroke();
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 2),
    bumpMap: makeTexture(bumpC, false, 2, 2),
    roughnessMap: makeTexture(roughC, false, 2, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getBrickPbrSet(): PbrTextureSet {
  const key = 'brick';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const [roughC, roughCtx] = makeCanvas(size, size);
  const rand = seededRand(1010);

  // Mortar background
  albedoCtx.fillStyle = 'rgb(162,154,142)';
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(75,75,75)';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = 'rgb(235,235,235)';
  roughCtx.fillRect(0, 0, size, size);

  const rows = 10;
  const cols = 5;
  const bh = size / rows;
  const bw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 0.8 + rand() * 0.35;
      const cr = clampByte(152 * shade);
      const cg = clampByte(92 * shade);
      const cb = clampByte(72 * shade);
      albedoCtx.fillStyle = `rgb(${cr},${cg},${cb})`;
      albedoCtx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
      const b = clampByte(168 + rand() * 48);
      bumpCtx.fillStyle = `rgb(${b},${b},${b})`;
      bumpCtx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 2),
    bumpMap: makeTexture(bumpC, false, 2, 2),
    roughnessMap: makeTexture(roughC, false, 2, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getConcretePbrSet(): PbrTextureSet {
  const key = 'concrete';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const set = paintNoiseField(
    256,
    1111,
    [164, 162, 156],
    [15, 14, 14],
    240,
    [
      [130, 128, 122, 0.35],
      [186, 184, 178, 0.28],
      [104, 102, 96, 0.24],
    ],
  );
  // Add subtle formwork panel seams
  const ctx = set.map.image.getContext('2d') as CanvasRenderingContext2D | null;
  const bctx = set.bumpMap.image.getContext('2d') as CanvasRenderingContext2D | null;
  if (ctx && bctx) {
    ctx.strokeStyle = 'rgba(55,54,50,0.34)';
    ctx.lineWidth = 2;
    bctx.strokeStyle = 'rgba(45,45,45,0.65)';
    bctx.lineWidth = 2;
    for (let y = 64; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      bctx.beginPath();
      bctx.moveTo(0, y);
      bctx.lineTo(256, y);
      bctx.stroke();
    }
  }
  set.map.repeat.set(2, 2);
  set.bumpMap.repeat.set(2, 2);
  cachedSets.set(key, set);
  return set;
}

export function getStuccoPbrSet(): PbrTextureSet {
  const key = 'stucco';
  const existing = cachedSets.get(key);
  if (existing) return existing;
  const set = paintNoiseField(
    256,
    1212,
    [224, 214, 198],
    [12, 11, 10],
    220,
    [
      [196, 184, 166, 0.3],
      [238, 230, 216, 0.25],
      [164, 150, 134, 0.2],
    ],
  );
  set.map.repeat.set(2, 2);
  set.bumpMap.repeat.set(2, 2);
  cachedSets.set(key, set);
  return set;
}

export function getTimberPbrSet(): PbrTextureSet {
  const key = 'timber';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const rand = seededRand(1313);

  albedoCtx.fillStyle = 'rgb(172,138,104)';
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(142,142,142)';
  bumpCtx.fillRect(0, 0, size, size);

  const planks = 6;
  const pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const shade = 0.82 + rand() * 0.3;
    albedoCtx.fillStyle = `rgb(${clampByte(172 * shade)},${clampByte(138 * shade)},${clampByte(104 * shade)})`;
    albedoCtx.fillRect(p * pw + 1, 0, pw - 2, size);
    // Plank gap
    albedoCtx.fillStyle = 'rgb(64,48,34)';
    albedoCtx.fillRect(p * pw, 0, 2, size);
    bumpCtx.fillStyle = 'rgb(52,52,52)';
    bumpCtx.fillRect(p * pw, 0, 2, size);

    for (let g = 0; g < 35; g++) {
      const gx = p * pw + 3 + rand() * (pw - 6);
      const gy = rand() * size;
      const gh = 22 + rand() * 75;
      albedoCtx.fillStyle = 'rgba(72,48,28,0.18)';
      albedoCtx.fillRect(gx, gy, 1.4, gh);
      bumpCtx.fillStyle = 'rgba(95,95,95,0.28)';
      bumpCtx.fillRect(gx, gy, 1.4, gh);
    }
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 2),
    bumpMap: makeTexture(bumpC, false, 2, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getArmorSteelPbrSet(): PbrTextureSet {
  const key = 'armorSteel';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const set = paintNoiseField(
    256,
    1414,
    [224, 224, 220],
    [11, 11, 10],
    180,
    [
      [194, 194, 188, 0.28],
      [238, 238, 234, 0.24],
    ],
  );
  // Plate weld seams & rivet dots
  const ctx = set.map.image.getContext('2d') as CanvasRenderingContext2D | null;
  const bctx = set.bumpMap.image.getContext('2d') as CanvasRenderingContext2D | null;
  if (ctx && bctx) {
    ctx.strokeStyle = 'rgba(70,72,68,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 248);
    bctx.strokeStyle = 'rgba(70,70,70,0.5)';
    bctx.lineWidth = 2;
    bctx.strokeRect(4, 4, 248, 248);
    for (let i = 16; i < 256; i += 32) {
      for (const y of [12, 244]) {
        ctx.fillStyle = 'rgba(65,65,65,0.35)';
        ctx.beginPath();
        ctx.arc(i, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        bctx.fillStyle = 'rgb(220,220,220)';
        bctx.beginPath();
        bctx.arc(i, y, 2.5, 0, Math.PI * 2);
        bctx.fill();
      }
    }
  }
  cachedSets.set(key, set);
  return set;
}

export function getAsphaltPbrSet(): PbrTextureSet {
  const key = 'asphalt';
  const existing = cachedSets.get(key);
  if (existing) return existing;
  const set = paintNoiseField(
    256,
    1515,
    [76, 78, 82],
    [16, 16, 16],
    260,
    [
      [58, 60, 64, 0.35],
      [96, 98, 102, 0.28],
    ],
  );
  set.map.repeat.set(3, 12);
  set.bumpMap.repeat.set(3, 12);
  if (set.roughnessMap) set.roughnessMap.repeat.set(3, 12);
  cachedSets.set(key, set);
  return set;
}

export function getRubberTreadPbrSet(): PbrTextureSet {
  const key = 'rubber';
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 128;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  albedoCtx.fillStyle = 'rgb(48,50,52)';
  albedoCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = 'rgb(90,90,90)';
  bumpCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 16) {
    albedoCtx.fillStyle = 'rgb(34,36,38)';
    albedoCtx.fillRect(0, y, size, 8);
    bumpCtx.fillStyle = 'rgb(210,210,210)';
    bumpCtx.fillRect(8, y + 1, size * 0.42, 6);
    bumpCtx.fillRect(size * 0.52, y + 6, size * 0.42, 6);
  }
  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 2, 4),
    bumpMap: makeTexture(bumpC, false, 2, 4),
  };
  cachedSets.set(key, set);
  return set;
}

export function getRockPbrSet(mapId: MapId): PbrTextureSet {
  const key = `rock:${mapId}`;
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const base: [number, number, number] =
    mapId === 'desert' ? [168, 146, 114] : [132, 134, 132];
  const set = paintNoiseField(
    256,
    1616 + mapId.length,
    base,
    [18, 17, 16],
    220,
    [
      [base[0] - 28, base[1] - 26, base[2] - 24, 0.36],
      [base[0] + 22, base[1] + 20, base[2] + 18, 0.28],
    ],
    true,
  );
  cachedSets.set(key, set);
  return set;
}

export function getBarkPbrSet(kind: 'pine' | 'palm'): PbrTextureSet {
  const key = `bark:${kind}`;
  const existing = cachedSets.get(key);
  if (existing) return existing;

  const size = 256;
  const [albedoC, albedoCtx] = makeCanvas(size, size);
  const [bumpC, bumpCtx] = makeCanvas(size, size);
  const rand = seededRand(kind === 'pine' ? 1717 : 1818);

  if (kind === 'pine') {
    albedoCtx.fillStyle = 'rgb(104,78,56)';
    albedoCtx.fillRect(0, 0, size, size);
    bumpCtx.fillStyle = 'rgb(128,128,128)';
    bumpCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const w = 2 + rand() * 6;
      const h = 18 + rand() * 54;
      const dark = rand() > 0.45;
      albedoCtx.fillStyle = dark ? 'rgba(54,38,26,0.45)' : 'rgba(136,104,76,0.32)';
      albedoCtx.fillRect(x, y, w, h);
      bumpCtx.fillStyle = dark ? 'rgba(56,56,56,0.55)' : 'rgba(196,196,196,0.45)';
      bumpCtx.fillRect(x, y, w, h);
    }
  } else {
    albedoCtx.fillStyle = 'rgb(142,118,92)';
    albedoCtx.fillRect(0, 0, size, size);
    bumpCtx.fillStyle = 'rgb(128,128,128)';
    bumpCtx.fillRect(0, 0, size, size);
    // Horizontal ringed palm trunk scars
    for (let y = 0; y < size; y += 14) {
      albedoCtx.fillStyle = 'rgba(92,72,52,0.45)';
      albedoCtx.fillRect(0, y, size, 4);
      bumpCtx.fillStyle = 'rgb(64,64,64)';
      bumpCtx.fillRect(0, y, size, 4);
    }
  }

  const set: PbrTextureSet = {
    map: makeTexture(albedoC, true, 1, 2),
    bumpMap: makeTexture(bumpC, false, 1, 2),
  };
  cachedSets.set(key, set);
  return set;
}

export function getFoliageAlphaTexture(kind: 'pine' | 'palm'): THREE.CanvasTexture {
  const key = `foliageAlpha:${kind}`;
  const existing = cachedSingleTextures.get(key);
  if (existing) return existing;

  const size = 256;
  const [c, ctx] = makeCanvas(size, size);
  const rand = seededRand(kind === 'pine' ? 1919 : 2020);
  ctx.clearRect(0, 0, size, size);

  if (kind === 'pine') {
    // Rich conifer branchlet + dense radiating needles (opaque center tapering to detailed needle silhouette)
    ctx.strokeStyle = 'rgb(88,66,44)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.96);
    ctx.lineTo(size * 0.5, size * 0.1);
    ctx.stroke();

    const subBranches = 16;
    for (let b = 0; b < subBranches; b++) {
      const t = b / subBranches;
      const y = size * (0.9 - t * 0.78);
      const span = size * (0.44 - t * 0.34);
      for (const side of [-1, 1]) {
        const ex = size * 0.5 + side * span;
        const ey = y - size * (0.08 + rand() * 0.06);
        ctx.strokeStyle = 'rgb(44,68,36)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(size * 0.5, y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Conifer needle sprays along each sub-branch
        const needles = 34;
        for (let n = 0; n < needles; n++) {
          const nt = n / needles;
          const bx = THREE.MathUtils.lerp(size * 0.5, ex, nt);
          const by = THREE.MathUtils.lerp(y, ey, nt);
          const nAng = (side * 0.7 + (rand() - 0.5) * 1.1) - Math.PI * 0.5;
          const nLen = 12 + rand() * 14;
          const g = clampByte(72 + rand() * 48);
          const r = clampByte(36 + rand() * 28);
          const bl = clampByte(28 + rand() * 20);
          ctx.strokeStyle = `rgb(${r},${g},${bl})`;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(nAng) * nLen, by + Math.sin(nAng) * nLen);
          ctx.stroke();
        }
      }
    }
  } else {
    // Pinnate desert palm frond leaflets radiating from central rachis
    ctx.strokeStyle = 'rgb(112,118,58)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.98);
    ctx.lineTo(size * 0.5, size * 0.06);
    ctx.stroke();

    const pairs = 22;
    for (let i = 0; i < pairs; i++) {
      const t = i / pairs;
      const y = size * (0.9 - t * 0.82);
      const len = size * (0.44 * Math.sin(Math.PI * (0.14 + t * 0.8)));
      for (const side of [-1, 1]) {
        const g = clampByte(96 + rand() * 44);
        const r = clampByte(74 + rand() * 32);
        const bl = clampByte(38 + rand() * 22);
        ctx.fillStyle = `rgb(${r},${g},${bl})`;
        ctx.beginPath();
        ctx.moveTo(size * 0.5, y);
        ctx.quadraticCurveTo(
          size * 0.5 + side * len * 0.6,
          y - 10,
          size * 0.5 + side * len,
          y + 6,
        );
        ctx.quadraticCurveTo(
          size * 0.5 + side * len * 0.5,
          y + 4,
          size * 0.5,
          y + 5,
        );
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const tex = makeTexture(c, true, 1, 1, true);
  cachedSingleTextures.set(key, tex);
  return tex;
}
