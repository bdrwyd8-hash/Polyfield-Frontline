import * as THREE from 'three';
import {
  createCaptureFlagpole,
  createChurchBellRuin,
  createConcreteBunker,
  createCzechHedgehog,
  createDesertAdobeHouse,
  createDesertPalmCanopyGeometry,
  createFactoryRuins,
  createFuelDrumCluster,
  createMultiTierPineCanopyGeometry,
  createOrganicBoulderGeometry,
  createSandbagBarrier,
  createStoneBridge,
  createSupplyCrate,
  createVillageHouse,
  createWoodenWatchtower,
  createWreckedVehicle,
  type FlagpoleVisual,
} from './models';
import {
  getArmorSteelPbrSet,
  getAsphaltPbrSet,
  getBarkPbrSet,
  getFoliageAlphaTexture,
  getRockPbrSet,
  getTerrainPbrSet,
} from './pbrTextures';
import {
  ALLY_AIRFIELD_CENTER,
  ALLY_BASE_CENTER,
  AXIS_AIRFIELD_CENTER,
  AXIS_BASE_CENTER,
  MAP_ZONES,
  groundHeightAt,
} from './rules';
import type { FoxholeRecord, MapId, ObstacleBox, Team } from './types';

export interface BuiltWorld {
  group: THREE.Group;
  obstacles: ObstacleBox[];
  raycastTargets: THREE.Object3D[];
  flagVisuals: FlagpoleVisual[];
  allySpawns: Array<{ x: number; z: number }>;
  axisSpawns: Array<{ x: number; z: number }>;
  resupplyPoints: Array<{ x: number; z: number; zoneId?: string }>;
  armoryPoints: Array<{ x: number; z: number; team: Team }>;
  skyColor: number;
  ambientColor: number;
  applyFoxholesToTerrain: (foxholes: FoxholeRecord[]) => void;
  updateWater: (dt: number, elapsedSec: number) => void;
  dispose: () => void;
}

function addObstacleFromCenter(
  obstacles: ObstacleBox[],
  id: string,
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  height: number,
  blocksSight = true,
): void {
  obstacles.push({
    id,
    minX: cx - halfW,
    maxX: cx + halfW,
    minZ: cz - halfD,
    maxZ: cz + halfD,
    height,
    blocksSight,
  });
}

/**
 * Adds rotated wall AABBs for a hollow enterable structure rotated by discrete 90° steps (0..3)
 * so doorways and window openings match the 3D mesh pixel-for-pixel.
 */
function addRotatedBoxObstacle(
  obstacles: ObstacleBox[],
  id: string,
  cx: number,
  cz: number,
  rotQuad: 0 | 1 | 2 | 3,
  lx: number,
  lz: number,
  halfW: number,
  halfD: number,
  height: number,
  blocksSight: boolean,
): void {
  let wx = lx;
  let wz = lz;
  let whw = halfW;
  let whd = halfD;
  if (rotQuad === 1) {
    // +90 deg around Y: (x, z) -> (z, -x)
    wx = lz;
    wz = -lx;
    whw = halfD;
    whd = halfW;
  } else if (rotQuad === 2) {
    wx = -lx;
    wz = -lz;
  } else if (rotQuad === 3) {
    wx = -lz;
    wz = lx;
    whw = halfD;
    whd = halfW;
  }
  addObstacleFromCenter(obstacles, id, cx + wx, cz + wz, whw, whd, height, blocksSight);
}

function addEnterableHouseObstacles(
  obstacles: ObstacleBox[],
  idPrefix: string,
  cx: number,
  cz: number,
  w: number,
  d: number,
  h: number,
  rotQuad: 0 | 1 | 2 | 3,
): void {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const wallT = 0.36;
  const halfT = wallT * 0.5;
  const doorW = 1.75;
  const winW = 1.45;
  const frontSideW = Math.max(0.8, (w - doorW) * 0.5);
  const sideSegD = Math.max(0.7, (d - winW) * 0.5);

  // Back wall (-Z)
  addRotatedBoxObstacle(
    obstacles,
    `${idPrefix}_back`,
    cx,
    cz,
    rotQuad,
    0,
    -hd + halfT,
    hw,
    halfT,
    h + 1,
    true,
  );
  // Front left & right walls (+Z) leaving open doorway
  for (const dir of [-1, 1] as const) {
    addRotatedBoxObstacle(
      obstacles,
      `${idPrefix}_front_${dir}`,
      cx,
      cz,
      rotQuad,
      dir * (doorW * 0.5 + frontSideW * 0.5),
      hd - halfT,
      frontSideW * 0.5,
      halfT,
      h + 1,
      true,
    );
  }
  // Side walls (-X, +X) with shooting windows (open above 1.18m sill!)
  for (const dirX of [-1, 1] as const) {
    const sx = dirX * (hw - halfT);
    for (const dirZ of [-1, 1] as const) {
      addRotatedBoxObstacle(
        obstacles,
        `${idPrefix}_side_${dirX}_${dirZ}`,
        cx,
        cz,
        rotQuad,
        sx,
        dirZ * (winW * 0.5 + sideSegD * 0.5),
        halfT,
        sideSegD * 0.5,
        h + 1,
        true,
      );
    }
    // Low window sill (blocks walking, lets bullets & sight pass over!)
    addRotatedBoxObstacle(
      obstacles,
      `${idPrefix}_sill_${dirX}`,
      cx,
      cz,
      rotQuad,
      sx,
      0,
      halfT,
      winW * 0.5,
      1.18,
      false,
    );
  }
  // Interior wooden table cover
  addRotatedBoxObstacle(
    obstacles,
    `${idPrefix}_table`,
    cx,
    cz,
    rotQuad,
    -hw * 0.32,
    -hd * 0.3,
    0.65,
    0.42,
    0.95,
    false,
  );
}

function addEnterableBunkerObstacles(
  obstacles: ObstacleBox[],
  idPrefix: string,
  cx: number,
  cz: number,
  rotQuad: 0 | 1 | 2 | 3,
): void {
  // Side walls (-X, +X)
  for (const dirX of [-1, 1] as const) {
    addRotatedBoxObstacle(
      obstacles,
      `${idPrefix}_side_${dirX}`,
      cx,
      cz,
      rotQuad,
      dirX * 3.2,
      0,
      0.42,
      2.7,
      3.1,
      true,
    );
  }
  // Front low parapet (+Z) — shoot out the embrasure slit!
  addRotatedBoxObstacle(
    obstacles,
    `${idPrefix}_front_low`,
    cx,
    cz,
    rotQuad,
    0,
    2.45,
    3.4,
    0.4,
    1.28,
    false,
  );
  // Rear wings (-Z) leaving center entrance open
  for (const dirX of [-1, 1] as const) {
    addRotatedBoxObstacle(
      obstacles,
      `${idPrefix}_rear_${dirX}`,
      cx,
      cz,
      rotQuad,
      dirX * 2.25,
      -2.4,
      1.15,
      0.38,
      3.1,
      true,
    );
  }
}

function minGroundUnderFootprint(
  cx: number,
  cz: number,
  halfSpan: number,
  mapId: MapId,
): number {
  return Math.min(
    groundHeightAt(cx, cz, mapId),
    groundHeightAt(cx + halfSpan, cz, mapId),
    groundHeightAt(cx - halfSpan, cz, mapId),
    groundHeightAt(cx, cz + halfSpan, mapId),
    groundHeightAt(cx, cz - halfSpan, mapId),
  );
}

export function buildBattlefieldWorld(mapId: MapId): BuiltWorld {
  const group = new THREE.Group();
  const obstacles: ObstacleBox[] = [];
  const raycastTargets: THREE.Object3D[] = [];
  const flagVisuals: FlagpoleVisual[] = [];
  const resupplyPoints: Array<{ x: number; z: number; zoneId?: string }> = [];
  const armoryPoints: Array<{ x: number; z: number; team: Team }> = [];
  const disposables: Array<{ dispose: () => void }> = [];

  const isDesert = mapId === 'desert';
  const isForest = mapId === 'forest';
  const isNormandy = mapId === 'normandy';
  const isStalingrad = mapId === 'stalingrad';

  const skyColor = isDesert
    ? 0xdfb980
    : isForest
      ? 0x9cb3bf
      : isStalingrad
        ? 0x858f99
        : 0x9fc8e8;
  const ambientColor = isDesert
    ? 0xcca068
    : isForest
      ? 0xc2d4b8
      : isStalingrad
        ? 0xb8c0c8
        : 0xd6cfc2;

  const terrainPbr = typeof document !== 'undefined' ? getTerrainPbrSet(mapId) : null;

  // 1. Massive rolling terrain (1120m x 1120m) with fine 216x216 grid for crisp foxhole pits & airfields
  const terrainSize = 1120;
  const segs = 216;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const baseColors = new Float32Array(posAttr.count * 3);
  const colors = new Float32Array(posAttr.count * 3);
  const cTmp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = groundHeightAt(vx, vz, mapId);
    posAttr.setY(i, vy);

    const roadDist = Math.abs(vz + vx * 0.31);
    const onRoad = roadDist < 4.8 && Math.abs(vx) < 310;

    if (isDesert) {
      if (onRoad) cTmp.setHex(0x8a643b);
      else if (vy > 3.6) cTmp.setHex(0x9a6933);
      else if (vy < -0.4) cTmp.setHex(0x7c8e58);
      else {
        const tint = (Math.sin(vx * 0.14) + Math.cos(vz * 0.14)) * 0.028;
        cTmp.setHex(0xb88443).offsetHSL(0, 0.04, tint);
      }
    } else if (isStalingrad) {
      const tint = (Math.sin(vx * 0.16) + Math.cos(vz * 0.15)) * 0.04;
      if (onRoad) cTmp.setHex(0x525256);
      else if (vy > 2.2) cTmp.setHex(0x6e6a65);
      else cTmp.setHex(0x8c9094).offsetHSL(0, 0, tint);
    } else if (isForest) {
      const riverDist = Math.abs(vx - vz * 0.32);
      if (onRoad) cTmp.setHex(0x7c6c56);
      else if (riverDist < 6.0 && Math.abs(vz) > 5.5) cTmp.setHex(0x5b5848);
      else if (vy > 4.0) cTmp.setHex(0x4b5c42);
      else {
        const tint = (Math.sin(vx * 0.13) + Math.cos(vz * 0.15)) * 0.03;
        cTmp.setHex(0x3f6336).offsetHSL(0, 0, tint);
      }
    } else {
      const riverDist = Math.abs(vx - vz * 0.32);
      if (onRoad) cTmp.setHex(0x9a8668);
      else if (riverDist < 6.0 && Math.abs(vz) > 5.5) cTmp.setHex(0x6e6a59);
      else if (vy > 4.2) cTmp.setHex(0x6c7c56);
      else {
        const tint = (Math.sin(vx * 0.14) + Math.cos(vz * 0.16)) * 0.025;
        cTmp.setHex(0x5e8a47).offsetHSL(0, 0, tint);
      }
    }
    baseColors[i * 3] = cTmp.r;
    baseColors[i * 3 + 1] = cTmp.g;
    baseColors[i * 3 + 2] = cTmp.b;
    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  const colorAttr = new THREE.BufferAttribute(colors, 3);
  terrainGeo.setAttribute('color', colorAttr);
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: isDesert ? 0.96 : 0.93,
    metalness: 0.02,
    flatShading: false,
    ...(terrainPbr
      ? {
          map: terrainPbr.map,
          bumpMap: terrainPbr.bumpMap,
          bumpScale: isDesert ? 0.24 : 0.32,
          ...(terrainPbr.roughnessMap ? { roughnessMap: terrainPbr.roughnessMap } : {}),
        }
      : {}),
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  raycastTargets.push(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  const applyFoxholesToTerrain = (foxholes: FoxholeRecord[]) => {
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const newY = groundHeightAt(vx, vz, mapId, foxholes);
      posAttr.setY(i, newY);

      let inHole = false;
      for (let f = 0; f < foxholes.length; f++) {
        if (Math.hypot(vx - foxholes[f].x, vz - foxholes[f].z) <= foxholes[f].radius * 1.35) {
          inHole = true;
          break;
        }
      }
      if (inHole) {
        colorAttr.setXYZ(i, 0.3, 0.24, 0.17);
      } else {
        colorAttr.setXYZ(i, baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2]);
      }
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();
  };

  // Animated flowing river in Forest & Normandy
  let waterTex: THREE.CanvasTexture | null = null;
  let waterBumpTex: THREE.CanvasTexture | null = null;
  let waterMat: THREE.MeshStandardMaterial | null = null;
  let foamMat: THREE.MeshBasicMaterial | null = null;

  if (!isDesert && !isStalingrad) {
    if (typeof document !== 'undefined') {
      const wc = document.createElement('canvas');
      wc.width = 128;
      wc.height = 256;
      const wctx = wc.getContext('2d');
      const wbc = document.createElement('canvas');
      wbc.width = 128;
      wbc.height = 256;
      const wbctx = wbc.getContext('2d');
      if (wctx && wbctx) {
        wctx.fillStyle = isForest ? '#2a6a85' : '#327c9e';
        wctx.fillRect(0, 0, 128, 256);
        wbctx.fillStyle = '#808080';
        wbctx.fillRect(0, 0, 128, 256);
        for (let i = 0; i < 64; i++) {
          const rx = (i * 41) % 128;
          const ry = (i * 59) % 256;
          const len = 18 + (i % 24);
          wctx.fillStyle = i % 3 === 0 ? 'rgba(186, 230, 253, 0.32)' : 'rgba(14, 65, 92, 0.34)';
          wctx.fillRect(rx, ry, 5 + (i % 7), len);
          wbctx.fillStyle = i % 2 === 0 ? '#b8b8b8' : '#585858';
          wbctx.fillRect(rx, ry, 6 + (i % 6), len);
        }
        waterTex = new THREE.CanvasTexture(wc);
        waterTex.colorSpace = THREE.SRGBColorSpace;
        waterTex.wrapS = THREE.RepeatWrapping;
        waterTex.wrapT = THREE.RepeatWrapping;
        waterTex.repeat.set(2.5, 42);

        waterBumpTex = new THREE.CanvasTexture(wbc);
        waterBumpTex.wrapS = THREE.RepeatWrapping;
        waterBumpTex.wrapT = THREE.RepeatWrapping;
        waterBumpTex.repeat.set(2.5, 42);
        disposables.push(waterTex, waterBumpTex);
      }
    }

    const waterGeo = new THREE.PlaneGeometry(14, 1040);
    waterGeo.rotateX(-Math.PI / 2);
    waterMat = new THREE.MeshStandardMaterial({
      color: waterTex ? 0xffffff : isForest ? 0x2d6680 : 0x3b82a6,
      ...(waterTex ? { map: waterTex } : {}),
      ...(waterBumpTex ? { bumpMap: waterBumpTex, bumpScale: 0.22 } : {}),
      roughness: 0.16,
      metalness: 0.22,
      transparent: true,
      opacity: 0.88,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -0.42, 0);
    water.rotation.y = -Math.atan(0.32);
    group.add(water);
    disposables.push(waterGeo, waterMat);

    // Subtle shoreline foam ribbons on both riverbanks
    const foamGeo = new THREE.PlaneGeometry(0.65, 1040);
    foamGeo.rotateX(-Math.PI / 2);
    foamMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const riverAngle = -Math.atan(0.32);
    for (const bankOffset of [-6.3, 6.3]) {
      const foam = new THREE.Mesh(foamGeo, foamMat);
      foam.rotation.y = riverAngle;
      foam.position.set(
        Math.cos(riverAngle) * bankOffset,
        -0.4,
        -Math.sin(riverAngle) * bankOffset,
      );
      group.add(foam);
    }
    disposables.push(foamGeo, foamMat);
  }

  // Allied Home Base Resupply Depot (at ALLY_BASE_CENTER for finite ammo resupply)
  const depotPos = { x: ALLY_BASE_CENTER.x + 10, z: ALLY_BASE_CENTER.z - 6 };
  resupplyPoints.push({ x: depotPos.x, z: depotPos.z });
  for (let d = 0; d < 2; d++) {
    const crate = createSupplyCrate();
    const cx = depotPos.x + (d === 0 ? -1.1 : 1.1);
    const cz = depotPos.z + (d === 0 ? 0.6 : -0.6);
    crate.position.set(cx, minGroundUnderFootprint(cx, cz, 0.7, mapId), cz);
    crate.rotation.y = d * 0.9;
    group.add(crate);
    addObstacleFromCenter(obstacles, `base_crate_${d}`, cx, cz, 0.72, 0.55, 1.0, false);
  }

  // Team Base Armory Loadout & Attachment Stations [B]
  const armoryConfigs: Array<{ x: number; z: number; team: Team; rot: number }> = [
    { x: ALLY_BASE_CENTER.x + 3.5, z: ALLY_BASE_CENTER.z + 3.5, team: 'allies', rot: -0.35 },
    { x: AXIS_BASE_CENTER.x - 3.5, z: AXIS_BASE_CENTER.z - 3.5, team: 'axis', rot: Math.PI - 0.35 },
  ];
  const armoryFrameMat = new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.45, metalness: 0.75 });
  const armoryRoofMat = new THREE.MeshStandardMaterial({ color: 0x3b4836, roughness: 0.8, metalness: 0.15 });
  const armoryBenchMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.65, metalness: 0.1 });
  const armorySteelMat = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.35, metalness: 0.85 });
  const armoryBeaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  disposables.push(armoryFrameMat, armoryRoofMat, armoryBenchMat, armorySteelMat, armoryBeaconMat);

  armoryConfigs.forEach((ac, idx) => {
    armoryPoints.push({ x: ac.x, z: ac.z, team: ac.team });
    const ay = minGroundUnderFootprint(ac.x, ac.z, 2.2, mapId);
    const station = new THREE.Group();
    station.position.set(ac.x, ay, ac.z);
    station.rotation.y = ac.rot;

    const pad = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 3.0), armoryFrameMat);
    pad.position.y = 0.08;
    pad.receiveShadow = true;
    station.add(pad);

    for (const [px, pz] of [
      [-1.95, -1.25],
      [1.95, -1.25],
      [-1.95, 1.25],
      [1.95, 1.25],
    ] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.45, 0.16), armoryFrameMat);
      post.position.set(px, 1.3, pz);
      post.castShadow = true;
      station.add(post);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.18, 3.2), armoryRoofMat);
    canopy.position.y = 2.55;
    canopy.castShadow = true;
    const beaconStrip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.12), armoryBeaconMat);
    beaconStrip.position.set(0, 2.52, 1.62);
    station.add(canopy, beaconStrip);

    // Weapon bench + upright rifle rack
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.88, 0.8), armoryBenchMat);
    bench.position.set(0, 0.52, -0.78);
    bench.castShadow = true;
    station.add(bench);

    for (let r = -2; r <= 2; r++) {
      const rifleStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.09), armoryBenchMat);
      rifleStock.position.set(r * 0.45, 1.22, -0.82);
      const rifleBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.65, 6), armorySteelMat);
      rifleBarrel.position.set(r * 0.45, 1.64, -0.82);
      station.add(rifleStock, rifleBarrel);
    }

    const ammoCrate = createSupplyCrate();
    ammoCrate.position.set(1.45, 0.16, 0.45);
    station.add(ammoCrate);

    group.add(station);
    raycastTargets.push(station);
    addObstacleFromCenter(obstacles, `armory_${idx}`, ac.x, ac.z, 1.75, 0.65, 2.4, false);
  });

  // Allied & Axis Airfield Runways (elevated level aprons + centerline stripes)
  const asphaltPbr = typeof document !== 'undefined' ? getAsphaltPbrSet() : null;
  const steelHangarPbr = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const runwayAsphaltMat = new THREE.MeshStandardMaterial({
    color: isDesert ? 0x9c8e7a : 0x80848c,
    roughness: 0.9,
    metalness: 0.05,
    ...(asphaltPbr
      ? {
          map: asphaltPbr.map,
          bumpMap: asphaltPbr.bumpMap,
          bumpScale: 0.08,
          ...(asphaltPbr.roughnessMap ? { roughnessMap: asphaltPbr.roughnessMap } : {}),
        }
      : {}),
  });
  if (steelHangarPbr) {
    armoryFrameMat.bumpMap = steelHangarPbr.bumpMap;
    armoryFrameMat.bumpScale = 0.012;
  }
  const runwayLineMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  disposables.push(runwayAsphaltMat, runwayLineMat);

  for (const af of [ALLY_AIRFIELD_CENTER, AXIS_AIRFIELD_CENTER]) {
    const afY = groundHeightAt(af.x, af.z, mapId);
    const runwayGrp = new THREE.Group();
    runwayGrp.position.set(af.x, afY + 0.04, af.z);
    runwayGrp.rotation.y = -0.31;

    const strip = new THREE.Mesh(new THREE.BoxGeometry(15.0, 0.12, 68), runwayAsphaltMat);
    strip.receiveShadow = true;
    runwayGrp.add(strip);

    for (let s = -28; s <= 28; s += 7) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 3.2), runwayLineMat);
      dash.position.set(0, 0.01, s);
      runwayGrp.add(dash);
    }

    // Open steel aircraft hangar shelter flanking the runway apron
    const hangarX = 11.8;
    const hangarZ = -10;
    for (const hz of [hangarZ - 6, hangarZ, hangarZ + 6]) {
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.35), armoryFrameMat);
      postL.position.set(hangarX - 4.4, 2.2, hz);
      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.35), armoryFrameMat);
      postR.position.set(hangarX + 4.4, 2.2, hz);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.35, 0.4), armoryFrameMat);
      beam.position.set(hangarX, 4.45, hz);
      runwayGrp.add(postL, postR, beam);
    }
    const hangarRoof = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 13.4), armoryRoofMat);
    hangarRoof.position.set(hangarX, 4.65, hangarZ);
    hangarRoof.castShadow = true;
    hangarRoof.receiveShadow = true;
    runwayGrp.add(hangarRoof);

    const windsockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6), armoryFrameMat);
    windsockPole.position.set(-9.2, 2.3, -24);
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.25, 8), armoryBeaconMat);
    sock.rotation.z = Math.PI / 2;
    sock.position.set(-8.5, 4.35, -24);
    runwayGrp.add(windsockPole, sock);

    group.add(runwayGrp);
  }

  // 2. Capture Zone Flagpoles + Resupply Crates
  const zoneConfigs = MAP_ZONES[mapId];
  for (let i = 0; i < zoneConfigs.length; i++) {
    const zc = zoneConfigs[i];
    const flag = createCaptureFlagpole(zc.label, zc.radius);
    const gy = minGroundUnderFootprint(zc.x, zc.z, 1.0, mapId);
    flag.group.position.set(zc.x, gy, zc.z);
    group.add(flag.group);
    flagVisuals.push(flag);

    const crate = createSupplyCrate();
    const cx = zc.x + 2.8;
    const cz = zc.z + 2.2;
    crate.position.set(cx, minGroundUnderFootprint(cx, cz, 0.7, mapId), cz);
    crate.rotation.y = 0.4 + i * 0.7;
    group.add(crate);
    addObstacleFromCenter(obstacles, `crate_z_${i}`, cx, cz, 0.72, 0.55, 1.0, false);
    resupplyPoints.push({ x: cx, z: cz, zoneId: zc.id });
  }

  // 3. Enterable Hollow Houses, Bunkers, Bridge & Watchtowers
  if (!isDesert && !isStalingrad) {
    const bridge = createStoneBridge();
    bridge.position.set(0, groundHeightAt(0, 0, mapId) - 0.15, 0);
    group.add(bridge);
    raycastTargets.push(bridge);
    addObstacleFromCenter(obstacles, 'bridge_n', 0, -3.85, 8.2, 0.4, 1.4, false);
    addObstacleFromCenter(obstacles, 'bridge_s', 0, 3.85, 8.2, 0.4, 1.4, false);
  }

  const houseConfigs: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    rotQuad: 0 | 1 | 2 | 3;
    roof: number;
    ruined?: boolean;
  }> = isStalingrad
    ? [
        { x: -196, z: 60, w: 7.4, d: 6.0, h: 4.2, rotQuad: 1, roof: 0x45494e, ruined: true },
        { x: -102, z: 32, w: 7.4, d: 6.0, h: 4.2, rotQuad: 1, roof: 0x45494e, ruined: true },
        { x: -64, z: 16, w: 7.2, d: 5.8, h: 4.1, rotQuad: 0, roof: 0x3b3f44, ruined: true },
        { x: 64, z: -16, w: 7.4, d: 6.0, h: 4.2, rotQuad: 2, roof: 0x45494e, ruined: true },
        { x: 196, z: -60, w: 7.4, d: 6.0, h: 4.2, rotQuad: 3, roof: 0x3b3f44, ruined: true },
      ]
    : isDesert
      ? [
          { x: -196, z: 60, w: 7.2, d: 5.8, h: 4.0, rotQuad: 1, roof: 0xb69362 },
          { x: -104, z: 32, w: 7.2, d: 5.8, h: 4.0, rotQuad: 1, roof: 0xb69362 },
          { x: -64, z: 10, w: 7.0, d: 5.6, h: 3.9, rotQuad: 0, roof: 0xb69362 },
          { x: 64, z: -10, w: 7.0, d: 5.6, h: 3.9, rotQuad: 2, roof: 0xa48051 },
          { x: 104, z: -32, w: 7.2, d: 5.8, h: 4.0, rotQuad: 3, roof: 0xb69362 },
          { x: 196, z: -60, w: 7.2, d: 5.8, h: 4.0, rotQuad: 2, roof: 0xa48051 },
        ]
      : [
          { x: -194, z: 58, w: 7.4, d: 5.8, h: 4.2, rotQuad: 1, roof: isForest ? 0x4b423b : 0x9b4836 },
          { x: -102, z: 32, w: 7.2, d: 5.8, h: 4.1, rotQuad: 1, roof: isForest ? 0x4b423b : 0x9b4836 },
          { x: -86, z: 14, w: 7.4, d: 5.8, h: 4.2, rotQuad: 0, roof: isForest ? 0x4b423b : 0x9b4836 },
          { x: -34, z: -26, w: 6.6, d: 5.4, h: 3.9, rotQuad: 1, roof: 0x5c4c42 },
          { x: 38, z: 28, w: 6.8, d: 5.6, h: 4.0, rotQuad: 3, roof: 0x6b473a },
          { x: 194, z: -58, w: 7.4, d: 5.8, h: 4.2, rotQuad: 3, roof: isForest ? 0x4b423b : 0x9b4836 },
        ];

  houseConfigs.forEach((hc, idx) => {
    const house = isDesert
      ? createDesertAdobeHouse(hc.w, hc.d, hc.h)
      : createVillageHouse(hc.w, hc.d, hc.h, hc.roof, Boolean(hc.ruined));
    house.position.set(hc.x, minGroundUnderFootprint(hc.x, hc.z, 3.4, mapId), hc.z);
    house.rotation.y = hc.rotQuad * (Math.PI / 2);
    group.add(house);
    raycastTargets.push(house);
    addEnterableHouseObstacles(obstacles, `house_${idx}`, hc.x, hc.z, hc.w, hc.d, hc.h, hc.rotQuad);
  });

  // Signature Map-Exclusive Landmarks (Church in Normandy, Bombed Factories + Trams in Stalingrad, Tank Wrecks in Desert)
  if (isNormandy) {
    const churchPos = { x: -42, z: 16, rotQuad: 1 as const };
    const church = createChurchBellRuin();
    church.position.set(
      churchPos.x,
      minGroundUnderFootprint(churchPos.x, churchPos.z, 4.5, mapId),
      churchPos.z,
    );
    church.rotation.y = churchPos.rotQuad * (Math.PI / 2);
    group.add(church);
    raycastTargets.push(church);
    addEnterableHouseObstacles(
      obstacles,
      'normandy_church',
      churchPos.x,
      churchPos.z,
      8.4,
      10.6,
      4.8,
      churchPos.rotQuad,
    );

    const tank = createWreckedVehicle('tank');
    tank.position.set(22, minGroundUnderFootprint(22, -8, 2.2, mapId), -8);
    tank.rotation.y = 0.65;
    group.add(tank);
    raycastTargets.push(tank);
    addObstacleFromCenter(obstacles, 'normandy_tank', 22, -8, 2.1, 2.6, 2.1, true);
  } else if (isStalingrad) {
    const factories: Array<{ x: number; z: number; rotQuad: 0 | 1 | 2 | 3 }> = [
      { x: -24, z: -22, rotQuad: 0 },
      { x: 24, z: 22, rotQuad: 2 },
    ];
    factories.forEach((fc, idx) => {
      const fac = createFactoryRuins(11.4, 8.2, 4.6);
      fac.position.set(fc.x, minGroundUnderFootprint(fc.x, fc.z, 4.8, mapId), fc.z);
      fac.rotation.y = fc.rotQuad * (Math.PI / 2);
      group.add(fac);
      raycastTargets.push(fac);
      addEnterableHouseObstacles(
        obstacles,
        `factory_${idx}`,
        fc.x,
        fc.z,
        11.4,
        8.2,
        4.8,
        fc.rotQuad,
      );
    });

    const trams = [
      { x: -10, z: 3, rot: -0.31 },
      { x: 16, z: -5, rot: -0.31 },
    ];
    trams.forEach((tr, idx) => {
      const tram = createWreckedVehicle('tram');
      tram.position.set(tr.x, minGroundUnderFootprint(tr.x, tr.z, 2.5, mapId), tr.z);
      tram.rotation.y = tr.rot;
      group.add(tram);
      raycastTargets.push(tram);
      addObstacleFromCenter(obstacles, `tram_${idx}`, tr.x, tr.z, 1.6, 3.6, 2.5, true);
    });
  } else if (isDesert) {
    const wrecks = [
      { x: -24, z: 8, rot: 0.7 },
      { x: 24, z: -10, rot: -0.8 },
    ];
    wrecks.forEach((wk, idx) => {
      const tank = createWreckedVehicle('tank');
      tank.position.set(wk.x, minGroundUnderFootprint(wk.x, wk.z, 2.2, mapId), wk.z);
      tank.rotation.y = wk.rot;
      group.add(tank);
      raycastTargets.push(tank);
      addObstacleFromCenter(obstacles, `desert_tank_${idx}`, wk.x, wk.z, 2.1, 2.6, 2.1, true);
    });
  }

  const bunkerConfigs: Array<{ x: number; z: number; rotQuad: 0 | 1 | 2 | 3 }> = isDesert
    ? [
        { x: -175, z: 36, rotQuad: 1 },
        { x: -92, z: -32, rotQuad: 1 },
        { x: 92, z: 32, rotQuad: 3 },
        { x: 175, z: -36, rotQuad: 3 },
      ]
    : isStalingrad
      ? [
          { x: -165, z: 42, rotQuad: 1 },
          { x: 86, z: -12, rotQuad: 3 },
          { x: 165, z: -42, rotQuad: 3 },
        ]
      : [
          { x: -172, z: 42, rotQuad: 1 },
          { x: 86, z: -12, rotQuad: 3 },
          { x: 52, z: -42, rotQuad: 2 },
          { x: -48, z: 46, rotQuad: 0 },
          { x: 172, z: -42, rotQuad: 3 },
        ];

  bunkerConfigs.forEach((bc, idx) => {
    const bunker = createConcreteBunker(isDesert);
    bunker.position.set(bc.x, minGroundUnderFootprint(bc.x, bc.z, 3.2, mapId), bc.z);
    bunker.rotation.y = bc.rotQuad * (Math.PI / 2);
    group.add(bunker);
    raycastTargets.push(bunker);
    addEnterableBunkerObstacles(obstacles, `bunker_${idx}`, bc.x, bc.z, bc.rotQuad);
  });

  if (isDesert) {
    const drumSpots = [
      { x: -182, z: 54 },
      { x: -74, z: -14 },
      { x: 74, z: 14 },
      { x: -8, z: 12 },
      { x: 8, z: -12 },
      { x: 182, z: -54 },
    ];
    drumSpots.forEach((ds, idx) => {
      const drums = createFuelDrumCluster();
      drums.position.set(ds.x, minGroundUnderFootprint(ds.x, ds.z, 0.7, mapId), ds.z);
      drums.rotation.y = idx * 1.1;
      group.add(drums);
      raycastTargets.push(drums);
      addObstacleFromCenter(obstacles, `drums_${idx}`, ds.x, ds.z, 0.9, 0.9, 1.2, false);
    });
  } else if (isForest) {
    const towers = [
      { x: -168, z: 32 },
      { x: -24, z: 22 },
      { x: 26, z: -22 },
      { x: -96, z: -16 },
      { x: 96, z: 16 },
      { x: 168, z: -32 },
    ];
    towers.forEach((tw, idx) => {
      const tower = createWoodenWatchtower();
      tower.position.set(tw.x, minGroundUnderFootprint(tw.x, tw.z, 1.5, mapId), tw.z);
      group.add(tower);
      raycastTargets.push(tower);
      addObstacleFromCenter(obstacles, `tower_${idx}`, tw.x, tw.z, 1.5, 1.5, 6.0, false);
    });
  } else if (isNormandy) {
    const towers = [
      { x: -168, z: 32 },
      { x: -96, z: -16 },
      { x: 96, z: 16 },
      { x: 168, z: -32 },
    ];
    towers.forEach((tw, idx) => {
      const tower = createWoodenWatchtower();
      tower.position.set(tw.x, minGroundUnderFootprint(tw.x, tw.z, 1.5, mapId), tw.z);
      group.add(tower);
      raycastTargets.push(tower);
      addObstacleFromCenter(obstacles, `tower_${idx}`, tw.x, tw.z, 1.5, 1.5, 6.0, false);
    });
  }

  // 4. Tactical Sandbag Walls & Anti-Tank Hedgehogs (across all 5 combat sectors)
  const sandbags = [
    { x: -188, z: 54, rot: 0.7 },
    { x: -162, z: 48, rot: 1.1 },
    { x: -46, z: 16, rot: 1.2 },
    { x: -24, z: -10, rot: 0.9 },
    { x: 24, z: 10, rot: 1.1 },
    { x: 46, z: -16, rot: 1.3 },
    { x: -94, z: 28, rot: 0.5 },
    { x: 94, z: -28, rot: 0.5 },
    { x: -12, z: 16, rot: 0.1 },
    { x: 12, z: -16, rot: 0.1 },
    { x: -58, z: -18, rot: 0.7 },
    { x: 58, z: 18, rot: 0.7 },
    { x: 162, z: -48, rot: 1.1 },
    { x: 188, z: -54, rot: 0.7 },
  ];
  sandbags.forEach((sb, idx) => {
    const barrier = createSandbagBarrier();
    barrier.position.set(sb.x, minGroundUnderFootprint(sb.x, sb.z, 1.4, mapId), sb.z);
    barrier.rotation.y = sb.rot;
    group.add(barrier);
    raycastTargets.push(barrier);
    addObstacleFromCenter(obstacles, `sandbag_${idx}`, sb.x, sb.z, 1.7, 0.85, 0.9, false);
  });

  const hedgehogs = [
    { x: -180, z: 58 },
    { x: -18, z: 5 },
    { x: 18, z: -5 },
    { x: -52, z: 20 },
    { x: 52, z: -20 },
    { x: -108, z: 36 },
    { x: 108, z: -36 },
    { x: 180, z: -58 },
  ];
  hedgehogs.forEach((hh, idx) => {
    const mesh = createCzechHedgehog();
    mesh.position.set(hh.x, minGroundUnderFootprint(hh.x, hh.z, 0.8, mapId), hh.z);
    mesh.rotation.y = idx * 0.8;
    group.add(mesh);
    addObstacleFromCenter(obstacles, `hedgehog_${idx}`, hh.x, hh.z, 0.85, 0.85, 1.4, false);
  });

  // 5. Organic Multi-Tier Pine Trees / Desert Date Palms across full 380m arena
  const treePositions: Array<{ x: number; z: number; scale: number }> = [];
  let seed = isDesert ? 4211 : isForest ? 8821 : isStalingrad ? 9412 : 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const targetTrees = isForest ? 340 : isDesert ? 120 : isStalingrad ? 140 : 210;
  for (let i = 0; i < targetTrees; i++) {
    const isPerimeter = i < Math.floor(targetTrees * 0.42);
    const angle = (i / Math.max(1, targetTrees * 0.5)) * Math.PI * 2 + rand() * 0.45;
    const dist = isPerimeter ? 250 + rand() * 140 : 18 + rand() * 230;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    if (Math.abs(tz + tx * 0.31) < 9.5) continue;
    let tooClose = false;
    for (const zc of zoneConfigs) {
      if (Math.hypot(tx - zc.x, tz - zc.z) < 16) tooClose = true;
    }
    for (const hc of houseConfigs) {
      if (Math.hypot(tx - hc.x, tz - hc.z) < 9.5) tooClose = true;
    }
    for (const clearPt of [ALLY_BASE_CENTER, AXIS_BASE_CENTER, ALLY_AIRFIELD_CENTER, AXIS_AIRFIELD_CENTER]) {
      if (Math.hypot(tx - clearPt.x, tz - clearPt.z) < 34) tooClose = true;
    }
    if (tooClose) continue;

    const scale = 0.92 + rand() * 0.65;
    treePositions.push({ x: tx, z: tz, scale });
    if (dist <= 375) {
      const trunkSpan = Math.max(0.76, 0.72 * scale);
      addObstacleFromCenter(obstacles, `tree_${i}`, tx, tz, trunkSpan, trunkSpan, 6.2, true);
    }
  }

  if (treePositions.length > 0) {
    const barkPbr =
      typeof document !== 'undefined' ? getBarkPbrSet(isDesert ? 'palm' : 'pine') : null;
    const foliageTex =
      typeof document !== 'undefined' ? getFoliageAlphaTexture(isDesert ? 'palm' : 'pine') : null;

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.48, 3.8, 10);
    trunkGeo.translate(0, 1.35, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: isDesert ? 0xcab092 : isStalingrad ? 0x8f8276 : 0xa8927c,
      roughness: 0.92,
      flatShading: false,
      ...(barkPbr ? { map: barkPbr.map, bumpMap: barkPbr.bumpMap, bumpScale: 0.05 } : {}),
    });
    const crownGeo = isDesert
      ? createDesertPalmCanopyGeometry()
      : createMultiTierPineCanopyGeometry();
    const crownBaseColor = isDesert
      ? 0xe2e3cf
      : isForest
        ? 0xcbdac8
        : isStalingrad
          ? 0xbec8c2
          : 0xd5e1d1;
    const crownMat = new THREE.MeshStandardMaterial({
      color: crownBaseColor,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: false,
      side: THREE.DoubleSide,
      ...(foliageTex ? { map: foliageTex, alphaTest: 0.42 } : {}),
    });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treePositions.length);
    trunks.castShadow = true;
    crowns.castShadow = true;
    crowns.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    treePositions.forEach((tp, idx) => {
      const ty = minGroundUnderFootprint(tp.x, tp.z, 0.6, mapId);
      dummy.position.set(tp.x, ty, tp.z);
      dummy.rotation.set((rand() - 0.5) * 0.08, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
      dummy.scale.setScalar(tp.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);
      crowns.setMatrixAt(idx, dummy.matrix);

      tint
        .setHex(crownBaseColor)
        .offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.08);
      crowns.setColorAt(idx, tint);
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    group.add(trunks, crowns);
    disposables.push(trunkGeo, trunkMat, crownGeo, crownMat);
  }

  // 6. Stratified Eroded Boulders & Rubble Outcrops (sunk into terrain across 380m arena)
  const rockCount = isStalingrad ? 155 : 130;
  const rockGeo = createOrganicBoulderGeometry();
  const rockPbr = typeof document !== 'undefined' ? getRockPbrSet(mapId) : null;
  const rockBaseColor = isDesert
    ? 0xd6bfa2
    : isForest
      ? 0xb4b8b2
      : isStalingrad
        ? 0xa9acb0
        : 0xbac0c4;
  const rockMat = new THREE.MeshStandardMaterial({
    color: rockBaseColor,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: false,
    ...(rockPbr
      ? {
          map: rockPbr.map,
          bumpMap: rockPbr.bumpMap,
          bumpScale: 0.06,
          ...(rockPbr.roughnessMap ? { roughnessMap: rockPbr.roughnessMap } : {}),
        }
      : {}),
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;

  const rDummy = new THREE.Object3D();
  const rTint = new THREE.Color();
  let placedRocks = 0;
  for (let i = 0; i < rockCount; i++) {
    const isOuter = i < 55;
    const angle = rand() * Math.PI * 2;
    const dist = isOuter ? 245 + rand() * 140 : 18 + rand() * 225;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    if (Math.abs(rz + rx * 0.31) < 8.5) continue;

    let nearZone = false;
    for (const zc of zoneConfigs) {
      if (Math.hypot(rx - zc.x, rz - zc.z) < 13) nearZone = true;
    }
    for (const hc of houseConfigs) {
      if (Math.hypot(rx - hc.x, rz - hc.z) < 8.5) nearZone = true;
    }
    for (const clearPt of [ALLY_BASE_CENTER, AXIS_BASE_CENTER, ALLY_AIRFIELD_CENTER, AXIS_AIRFIELD_CENTER]) {
      if (Math.hypot(rx - clearPt.x, rz - clearPt.z) < 32) nearZone = true;
    }
    if (nearZone) continue;

    const s = isOuter ? 2.6 + rand() * 2.8 : 0.95 + rand() * 1.15;
    const minY = minGroundUnderFootprint(rx, rz, s * 1.0, mapId);
    rDummy.position.set(rx, minY + s * 0.06 - 0.18, rz);
    rDummy.rotation.set(rand() * 0.9, rand() * Math.PI, rand() * 0.9);
    rDummy.scale.set(s * 1.28, s * 0.84, s * 1.12);
    rDummy.updateMatrix();
    rocks.setMatrixAt(placedRocks, rDummy.matrix);
    rTint.setHex(rockBaseColor).offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    rocks.setColorAt(placedRocks, rTint);

    if (dist <= 375 && s > 0.55) {
      addObstacleFromCenter(obstacles, `rock_${placedRocks}`, rx, rz, s * 1.0, s * 1.0, s * 1.05, true);
    }
    placedRocks++;
  }
  rocks.count = placedRocks;
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  group.add(rocks);
  disposables.push(rockGeo, rockMat);

  const allySpawns = [
    { x: ALLY_BASE_CENTER.x - 2, z: ALLY_BASE_CENTER.z - 2 },
    { x: ALLY_BASE_CENTER.x + 8, z: ALLY_BASE_CENTER.z + 10 },
    { x: ALLY_BASE_CENTER.x - 10, z: ALLY_BASE_CENTER.z - 10 },
    { x: ALLY_BASE_CENTER.x + 12, z: ALLY_BASE_CENTER.z - 12 },
  ];
  const axisSpawns = [
    { x: AXIS_BASE_CENTER.x + 2, z: AXIS_BASE_CENTER.z + 2 },
    { x: AXIS_BASE_CENTER.x - 8, z: AXIS_BASE_CENTER.z - 10 },
    { x: AXIS_BASE_CENTER.x + 10, z: AXIS_BASE_CENTER.z + 10 },
    { x: AXIS_BASE_CENTER.x - 12, z: AXIS_BASE_CENTER.z + 12 },
  ];

  const updateWater = (dt: number, elapsedSec: number) => {
    if (waterTex) {
      waterTex.offset.y = (waterTex.offset.y - dt * 0.16) % 1;
      waterTex.offset.x = Math.sin(elapsedSec * 0.55) * 0.03;
    }
    if (waterBumpTex) {
      waterBumpTex.offset.y = (waterBumpTex.offset.y - dt * 0.21) % 1;
      waterBumpTex.offset.x = Math.cos(elapsedSec * 0.48) * 0.025;
    }
    if (waterMat) {
      waterMat.opacity = 0.85 + Math.sin(elapsedSec * 2.1) * 0.04;
    }
    if (foamMat) {
      foamMat.opacity = 0.24 + Math.sin(elapsedSec * 2.8) * 0.08;
    }
  };

  return {
    group,
    obstacles,
    raycastTargets,
    flagVisuals,
    allySpawns,
    axisSpawns,
    resupplyPoints,
    armoryPoints,
    skyColor,
    ambientColor,
    applyFoxholesToTerrain,
    updateWater,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
