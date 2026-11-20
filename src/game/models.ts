import * as THREE from 'three';
import type { BotRole, Team, WeaponAttachmentLoadout, WeaponId } from './types';
import { getWeaponMountCapabilities, sanitizeWeaponAttachmentLoadout } from './attachments';
import {
  buildArticulatedHand,
  buildGrip3D,
  buildMagazine3D,
  buildOptic3D,
  buildRailAccessory3D,
  buildSeatedSoldierMesh,
  buildStock3D,
  buildSuppressor3D,
  getWeaponMountAnchors,
} from './attachments3d';

function makePbrMat(
  color: number,
  roughness = 0.72,
  metalness = 0.08,
  flatShading = false,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading,
    ...extra,
  });
}

let cachedWoodTex: THREE.CanvasTexture | null = null;
function getWoodGrainTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedWoodTex) return cachedWoodTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#d6c3b0';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    const tone = 165 + Math.round(Math.sin(y * 0.35) * 24 + ((y * 37) % 18));
    ctx.fillStyle = `rgb(${tone}, ${Math.round(tone * 0.85)}, ${Math.round(tone * 0.72)})`;
    ctx.fillRect(0, y, 128, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedWoodTex = tex;
  return tex;
}

let cachedGunmetalTex: THREE.CanvasTexture | null = null;
function getGunmetalTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedGunmetalTex) return cachedGunmetalTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#c8cdd4';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 420; i++) {
    const x = (i * 53) % 128;
    const y = (i * 97) % 128;
    const v = 175 + ((i * 29) % 60);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 6, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedGunmetalTex = tex;
  return tex;
}

const cachedBduTex: Partial<Record<Team, THREE.CanvasTexture>> = {};
function getBduCamoTexture(team: Team): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedBduTex[team]) return cachedBduTex[team]!;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = team === 'allies' ? '#586b4a' : '#5e625c';
  ctx.fillRect(0, 0, 128, 128);
  const swatches =
    team === 'allies'
      ? ['#445439', '#6e7e59', '#3b4832', '#7a6f52']
      : ['#4b4f4a', '#70746d', '#3e413e', '#565047'];
  for (let i = 0; i < 64; i++) {
    ctx.fillStyle = swatches[i % swatches.length];
    const x = (i * 47) % 120;
    const y = (i * 83) % 120;
    const w = 12 + (i % 16);
    const h = 8 + ((i * 3) % 14);
    ctx.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedBduTex[team] = tex;
  return tex;
}

export function createRealisticMuzzleFlash(scale = 1): THREE.Group {
  const flash = new THREE.Group();
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xff8c1a,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c4,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  });
  const bladeGeo = new THREE.PlaneGeometry(0.24 * scale, 0.08 * scale);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeo, outerMat);
    blade.rotation.z = (i * Math.PI) / 3;
    flash.add(blade);
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.055 * scale, 0.22 * scale, 6), outerMat);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = 0.09 * scale;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.048 * scale, 6, 5), coreMat);
  flash.add(cone, core);
  flash.visible = false;
  return flash;
}

function createExtrudedProfile(
  pts: Array<[number, number]>,
  thickness: number,
  bevelSize = 0.004,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -thickness / 2);
  // Maps +px -> +Z (rear/stock), -px -> -Z (forward/muzzle), +py -> +Y (up)
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createLatheBarrel(
  profile: Array<[number, number]>,
  segments = 14,
): THREE.LatheGeometry {
  const vecs = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export interface SoldierRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  weaponMount: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  muzzleFlash: THREE.Object3D;
  telegraphGlint: THREE.Mesh;
  healBadge: THREE.Group;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
}

export function createLowPolySoldier(team: Team, role: BotRole): SoldierRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const isAllies = team === 'allies';
  const bduTex = getBduCamoTexture(team);
  const tunicColor = isAllies ? 0x5c6e4e : 0x676b64;
  const accentColor = isAllies ? 0x2d64b8 : 0xb83737;
  const pantsColor = isAllies ? 0x54604b : 0x4b4f4d;
  const helmetColor = isAllies ? 0x3b533e : 0x35393d;
  const packColor = isAllies ? 0x7a6c4e : 0x38342e;
  const skinColor = 0xe3b18e;

  const tunicMat = makePbrMat(tunicColor, 0.86, 0.03, false, bduTex ? { map: bduTex } : {});
  const accentMat = makePbrMat(accentColor, 0.65, 0.08);
  const pantsMat = makePbrMat(pantsColor, 0.88, 0.03, false, bduTex ? { map: bduTex } : {});
  const vestMat = makePbrMat(isAllies ? 0x3c4534 : 0x383b3e, 0.78, 0.09);
  const helmetMat = makePbrMat(helmetColor, 0.42, 0.36);
  const skinMat = makePbrMat(skinColor, 0.7, 0.02);
  const leatherMat = makePbrMat(packColor, 0.58, 0.14);
  const bootMat = makePbrMat(0x211a15, 0.48, 0.16);
  const gunWoodMat = makePbrMat(0x6b4122, 0.64, 0.06);
  const gunSteelMat = makePbrMat(0x25282c, 0.3, 0.86);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.48)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 64, 64);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const makeLeg = (xOff: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOff, 0.76, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.24, 4, 8), pantsMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.078, 0.32, 8), pantsMat);
    calf.position.y = -0.45;
    calf.castShadow = true;
    legGroup.add(calf);

    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), leatherMat);
    kneePad.position.set(0, -0.32, 0.045);
    kneePad.scale.set(1, 1, 0.65);
    legGroup.add(kneePad);

    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.085, 0.16, 8), bootMat);
    bootShaft.position.set(0, -0.62, 0);
    const bootToe = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.12, 4, 8), bootMat);
    bootToe.rotation.x = Math.PI / 2;
    bootToe.position.set(0, -0.69, 0.06);
    bootToe.castShadow = true;
    legGroup.add(bootShaft, bootToe);

    return legGroup;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  bodyPivot.add(leftLeg, rightLeg);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.22, 10), tunicMat);
  pelvis.position.y = 0.78;
  pelvis.scale.set(1.18, 1, 0.72);
  bodyPivot.add(pelvis);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 0.52, 10), tunicMat);
  chest.position.y = 1.12;
  chest.scale.set(1.15, 1, 0.74);
  chest.castShadow = true;
  chest.receiveShadow = true;
  bodyPivot.add(chest);

  // Plate carrier tactical chest vest + mag pouches
  const plateFront = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.24), vestMat);
  plateFront.position.set(0, 1.12, 0.03);
  plateFront.castShadow = true;
  bodyPivot.add(plateFront);

  const armBand = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.26, 0.12, 10), accentMat);
  armBand.position.y = 1.26;
  armBand.scale.set(1.16, 1, 0.76);
  bodyPivot.add(armBand);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.23, 0.08, 10), leatherMat);
  belt.position.y = 0.86;
  belt.scale.set(1.16, 1, 0.76);
  bodyPivot.add(belt);

  for (const px of [-0.14, 0, 0.14]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.13, 0.065), leatherMat);
    pouch.position.set(px, 0.99, 0.16);
    bodyPivot.add(pouch);
  }

  const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 4, 8), leatherMat);
  pack.position.set(0, 1.12, -0.2);
  pack.scale.set(1.2, 1, 0.65);
  pack.castShadow = true;
  bodyPivot.add(pack);

  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.38, 8), pantsMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 1.33, -0.21);
  bodyPivot.add(bedroll);

  if (role === 'marksman') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.055, 6, 12), leatherMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.41;
    bodyPivot.add(scarf);
  } else if (role === 'defender') {
    for (const sx of [-0.28, 0.28]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), helmetMat);
      pauldron.position.set(sx, 1.35, 0);
      pauldron.scale.set(1, 0.65, 1.1);
      bodyPivot.add(pauldron);
    }
  }

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.44;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 8), skinMat);
  neck.position.y = 0.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skinMat);
  head.position.y = 0.16;
  head.scale.set(0.92, 1.06, 0.96);
  head.castShadow = true;
  headGroup.add(neck, head);

  const helmetPts = isAllies
    ? [
        new THREE.Vector2(0.0, 0.18),
        new THREE.Vector2(0.11, 0.17),
        new THREE.Vector2(0.18, 0.1),
        new THREE.Vector2(0.195, 0.02),
        new THREE.Vector2(0.215, -0.01),
      ]
    : [
        new THREE.Vector2(0.0, 0.18),
        new THREE.Vector2(0.12, 0.165),
        new THREE.Vector2(0.185, 0.08),
        new THREE.Vector2(0.195, 0.01),
        new THREE.Vector2(0.235, -0.04),
      ];
  const helmet = new THREE.Mesh(new THREE.LatheGeometry(helmetPts, 12), helmetMat);
  helmet.position.set(0, 0.17, -0.01);
  helmet.castShadow = true;
  headGroup.add(helmet);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.018, 6, 12), accentMat);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.22, -0.01);
  headGroup.add(band);

  // Dark eyes, brow visor goggles & chinstrap
  const eyeMat = makePbrMat(0x1b1e23, 0.4, 0.1);
  for (const ex of [-0.052, 0.052]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeMat);
    eye.position.set(ex, 0.165, 0.142);
    headGroup.add(eye);
  }
  const chinstrap = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.01, 5, 10, Math.PI), leatherMat);
  chinstrap.rotation.y = Math.PI / 2;
  chinstrap.rotation.x = Math.PI * 0.85;
  chinstrap.position.set(0, 0.13, 0.01);
  headGroup.add(chinstrap);

  bodyPivot.add(headGroup);

  // Rifle / SMG mounted directly in shoulder pocket on bodyPivot, held firmly by both hands
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.14, 1.18, 0.22);
  bodyPivot.add(weaponMount);

  const gunGroup = new THREE.Group();
  const barrelLen = role === 'marksman' ? 0.66 : role === 'rusher' ? 0.38 : 0.52;

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.082, 0.34), gunWoodMat);
  stock.position.set(0, -0.012, -0.09);
  stock.castShadow = true;

  const forend = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.064, 0.32), gunWoodMat);
  forend.position.set(0, 0.008, 0.16);
  forend.castShadow = true;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.22), gunSteelMat);
  receiver.position.set(0, 0.018, 0.06);
  receiver.castShadow = true;

  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.095, 0.048), gunWoodMat);
  pistolGrip.position.set(0, -0.05, -0.01);
  pistolGrip.rotation.x = 0.32;

  const mag = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, role === 'rusher' ? 0.14 : 0.08, 0.052),
    gunSteelMat,
  );
  mag.position.set(0, role === 'rusher' ? -0.075 : -0.04, 0.11);
  mag.rotation.x = role === 'rusher' ? -0.18 : 0;

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.02, barrelLen, 8),
    gunSteelMat,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.026, 0.14 + barrelLen * 0.5);
  barrel.castShadow = true;

  gunGroup.add(stock, forend, receiver, pistolGrip, mag, barrel);

  if (role === 'marksman') {
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8),
      gunSteelMat,
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.072, 0.07);
    gunGroup.add(scope);
  }

  const muzzleFlash = createRealisticMuzzleFlash(0.85);
  muzzleFlash.position.set(0, 0.026, 0.17 + barrelLen);
  gunGroup.add(muzzleFlash);

  const telegraphGlint = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1, 0),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
  );
  telegraphGlint.position.set(0, 0.08, 0.14 + barrelLen * 0.55);
  telegraphGlint.visible = false;
  gunGroup.add(telegraphGlint);

  weaponMount.add(gunGroup);

  // Build articulated two-segment arm whose hand locks directly onto its weapon grip target
  const UP_VEC = new THREE.Vector3(0, 1, 0);
  const buildGripArm = (
    shoulder: THREE.Vector3,
    elbowWorld: THREE.Vector3,
    handWorld: THREE.Vector3,
  ): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.copy(shoulder);

    const elbowLocal = elbowWorld.clone().sub(shoulder);
    const handLocal = handWorld.clone().sub(shoulder);

    const addLimbSegment = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      radius: number,
      mat: THREE.Material,
    ) => {
      const delta = to.clone().sub(from);
      const len = delta.length();
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const cylLen = Math.max(0.04, len - radius * 0.6);
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, cylLen, 4, 8), mat);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(UP_VEC, delta.normalize());
      mesh.castShadow = true;
      armGroup.add(mesh);
    };

    addLimbSegment(new THREE.Vector3(0, 0, 0), elbowLocal, 0.068, tunicMat);
    addLimbSegment(elbowLocal, handLocal, 0.056, tunicMat);

    const elbowPad = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), tunicMat);
    elbowPad.position.copy(elbowLocal);
    armGroup.add(elbowPad);

    const gloveMat = makePbrMat(0x282622, 0.78, 0.08);
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.07, 0.095), gloveMat);
    glove.position.copy(handLocal);
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.044, 0.052), skinMat);
    fingers.position.set(handLocal.x, handLocal.y - 0.025, handLocal.z + 0.03);
    armGroup.add(glove, fingers);

    return armGroup;
  };

  // Trigger hand (on right side +X) grips pistolGrip at (0.14, 1.12, 0.21)
  const rightArm = buildGripArm(
    new THREE.Vector3(0.31, 1.31, 0.01),
    new THREE.Vector3(0.35, 1.11, 0.08),
    new THREE.Vector3(0.14, 1.12, 0.21),
  );
  // Support hand (from left side -X) reaches across chest to cradle forend at (0.12, 1.17, 0.43)
  const leftArm = buildGripArm(
    new THREE.Vector3(-0.31, 1.31, 0.01),
    new THREE.Vector3(-0.2, 1.07, 0.26),
    new THREE.Vector3(0.12, 1.17, 0.43),
  );
  bodyPivot.add(leftArm, rightArm);

  // Subtle medic bandage cross indicator shown only while bot retreats to heal
  const healBadge = new THREE.Group();
  const hMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.06), hMat);
  const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.06), hMat);
  healBadge.add(hBar1, hBar2);
  healBadge.position.set(0, 2.02, 0);
  healBadge.visible = false;
  bodyPivot.add(healBadge);

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    weaponMount,
    leftLeg,
    rightLeg,
    muzzleFlash,
    telegraphGlint,
    healBadge,
    hitFlashMaterials: [tunicMat, pantsMat, helmetMat],
  };
}

export interface FirstPersonWeaponRig {
  root: THREE.Group;
  magGroup: THREE.Group;
  boltGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  muzzleFlash: THREE.Object3D;
  adsOffset: THREE.Vector3;
  accessoryEffectGroup?: THREE.Group;
  laserBeam?: THREE.Mesh;
  laserDot?: THREE.Mesh;
  spotLight?: THREE.SpotLight;
}

/**
 * Builds high-detail realistic firearms (AK-47, M1 Garand, Kar98k, StG-44, BAR,
 * Springfield, Thompson, MP40, RPG-7, Bazooka, Panzerschreck, Colt 1911) with machined receivers,
 * modular 3D attachments, aligned iron sights/optics, PBR surface grain, and articulated gloved hands.
 */
export function createFirstPersonWeaponRig(
  weaponId: WeaponId,
  rawCustomization?: Partial<WeaponAttachmentLoadout>,
  options?: { hideArms?: boolean },
): FirstPersonWeaponRig {
  const root = new THREE.Group();
  const magGroup = new THREE.Group();
  const boltGroup = new THREE.Group();
  root.add(magGroup, boltGroup);

  const caps = getWeaponMountCapabilities(weaponId);
  const loadout = sanitizeWeaponAttachmentLoadout(weaponId, rawCustomization);
  const anchors = getWeaponMountAnchors(weaponId);
  const customStockActive = caps.supportsStock && loadout.stock !== 'standard';
  const customMagActive = caps.supportsMagazine && loadout.magazine !== 'standard_mag';
  const customOpticActive = caps.supportsOptic && loadout.optic !== 'iron';

  const woodTex = getWoodGrainTexture();
  const steelTex = getGunmetalTexture();
  const walnutMat = makePbrMat(0x6d3b1a, 0.52, 0.06, false, woodTex ? { map: woodTex } : {});
  const akWoodMat = makePbrMat(0x8a451c, 0.48, 0.06, false, woodTex ? { map: woodTex } : {});
  const darkWalnutMat = makePbrMat(0x4a2712, 0.56, 0.05, false, woodTex ? { map: woodTex } : {});
  const bakeliteMat = makePbrMat(0x4e261a, 0.36, 0.14);
  const polymerMat = makePbrMat(0x23201e, 0.44, 0.14);
  const bluedSteelMat = makePbrMat(0x252c35, 0.28, 0.88, false, steelTex ? { map: steelTex } : {});
  const parkerizedMat = makePbrMat(0x3a4249, 0.4, 0.78, false, steelTex ? { map: steelTex } : {});
  const oliveTubeMat = makePbrMat(0x47543b, 0.56, 0.35);
  const darkMetalMat = makePbrMat(0x14171b, 0.34, 0.85);
  const brassMat = makePbrMat(0xc49c3c, 0.22, 0.92);
  const warheadMat = makePbrMat(0x4a5534, 0.44, 0.42);
  const lensMat = makePbrMat(0x1f4b6e, 0.06, 0.2, false, {
    emissive: 0x0b2538,
    emissiveIntensity: 0.45,
  });
  const sleeveMat = makePbrMat(0x424d3b, 0.86, 0.03);

  let muzzleZ = -0.78;
  let muzzleY = 0.036;
  let ejectPos = new THREE.Vector3(0.03, 0.048, -0.08);
  const adsOffset = new THREE.Vector3(0, -0.064, -0.34);
  let leftHandPos = new THREE.Vector3(-0.015, -0.022, -0.31);
  let rightHandPos = new THREE.Vector3(0.0, -0.055, 0.08);
  let showLeftArm = true;

  const addTriggerGuard = (y: number, z: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, y + 0.015, z + 0.028),
      new THREE.Vector3(0, y - 0.02, z + 0.018),
      new THREE.Vector3(0, y - 0.022, z - 0.012),
      new THREE.Vector3(0, y + 0.012, z - 0.026),
    ]);
    const guard = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.004, 6, false), darkMetalMat);
    const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.024, 6), darkMetalMat);
    trigger.position.set(0, y - 0.005, z);
    trigger.rotation.x = 0.35;
    root.add(guard, trigger);
  };

  if (weaponId === 'ak47') {
    // Iconic Kalashnikov AK-47: Angled laminated wood buttstock, stamped steel receiver & ribbed dust cover,
    // bakelite pistol grip, curved ribbed 7.62 banana magazine, two-piece wood handguard, 45° gas block & slant brake!
    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.09, 0.018],
            [0.36, -0.018],
            [0.36, -0.105],
            [0.14, -0.048],
            [0.09, -0.022],
          ],
          0.04,
          0.004,
        ),
        akWoodMat,
      );
      const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.092, 0.01), darkMetalMat);
      buttPlate.position.set(0, -0.062, 0.364);
      root.add(stock, buttPlate);
    }

    // Angled pistol grip (+px = rearward)
    const grip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.025, -0.015],
          [0.068, -0.015],
          [0.106, -0.115],
          [0.058, -0.118],
        ],
        0.032,
        0.004,
      ),
      bakeliteMat,
    );

    // Stamped steel lower receiver (sharp machined rectangular silhouette)
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.048, 0.26), bluedSteelMat);
    receiver.position.set(0, 0.012, -0.035);

    // Top stamped dust cover with stamped structural ribs
    const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.22), parkerizedMat);
    dustCover.position.set(0, 0.044, -0.025);
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.041, 0.004, 0.014), darkMetalMat);
      rib.position.set(0, 0.055, 0.03 - i * 0.045);
      root.add(rib);
    }

    // Safety selector lever on right side
    const selector = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.08), darkMetalMat);
    selector.position.set(0.024, 0.022, -0.01);
    selector.rotation.x = 0.08;

    // Animated reciprocating bolt carrier + hooked charging handle
    const boltCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.09), bluedSteelMat);
    boltCarrier.position.set(0.019, 0.034, -0.085);
    const chargeKnob = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.011, 0.016), darkMetalMat);
    chargeKnob.position.set(0.034, 0.034, -0.065);
    boltGroup.add(boltCarrier, chargeKnob);

    // Two-piece laminated wood handguard + ventilated seam
    const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.034, 0.205), akWoodMat);
    lowerHandguard.position.set(0, 0.006, -0.27);
    const upperHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.19), akWoodMat);
    upperHandguard.position.set(0, 0.038, -0.268);
    const handguardCap = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.016), darkMetalMat);
    handguardCap.position.set(0, 0.022, -0.372);

    // Barrel, 45° gas block & tube, steel underbarrel cleaning rod, and slant compensator
    const barrel = new THREE.Mesh(
      createLatheBarrel([
        [0.014, 0.0],
        [0.012, 0.26],
        [0.01, 0.42],
      ]),
      bluedSteelMat,
    );
    barrel.position.set(0, 0.022, -0.36);

    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.14, 8), bluedSteelMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.042, -0.43);

    const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.042, 0.036), darkMetalMat);
    gasBlock.position.set(0, 0.03, -0.505);
    gasBlock.rotation.x = -0.35;

    const cleaningRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.36, 6), parkerizedMat);
    cleaningRod.rotation.x = Math.PI / 2;
    cleaningRod.position.set(0, 0.002, -0.54);

    // Classic AK slant brake
    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.042, 10), darkMetalMat);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.022, -0.79);

    if (!customMagActive) {
      // Signature curved 7.62x39mm ribbed steel banana magazine (curves forward toward -Z!)
      const bananaMag = new THREE.Mesh(
        createExtrudedProfile(
          [
            [-0.125, -0.005],
            [-0.195, -0.005],
            [-0.228, -0.105],
            [-0.285, -0.205],
            [-0.225, -0.222],
            [-0.165, -0.11],
          ],
          0.026,
          0.003,
        ),
        bluedSteelMat,
      );
      const magRib1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.068), darkMetalMat);
      magRib1.position.set(0, -0.105, -0.195);
      magRib1.rotation.x = 0.45;
      const magFloor = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.066), darkMetalMat);
      magFloor.position.set(0, -0.214, -0.255);
      magFloor.rotation.x = 0.25;
      magGroup.add(bananaMag, magRib1, magFloor);
    }

    // Tangent rear sight + hooded front sight post centered cleanly at y = 0.066
    const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.048), darkMetalMat);
    rearSightBase.position.set(0, 0.056, -0.13);
    const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.016), darkMetalMat);
    rearEarL.position.set(-0.008, 0.067, -0.12);
    const rearEarR = rearEarL.clone();
    rearEarR.position.x = 0.008;

    const frontTower = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.022), darkMetalMat);
    frontTower.position.set(0, 0.042, -0.73);
    const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 6, 12, Math.PI * 1.45), darkMetalMat);
    frontHood.rotation.z = -Math.PI * 0.22;
    frontHood.position.set(0, 0.064, -0.73);
    const frontPin = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.018, 0.008), darkMetalMat);
    frontPin.position.set(0, 0.063, -0.73);

    addTriggerGuard(-0.018, -0.01);
    root.add(
      grip,
      receiver,
      dustCover,
      selector,
      lowerHandguard,
      upperHandguard,
      handguardCap,
      barrel,
      gasTube,
      gasBlock,
      cleaningRod,
      muzzleBrake,
      rearSightBase,
      rearEarL,
      rearEarR,
      frontTower,
      frontHood,
      frontPin,
    );
    muzzleZ = -0.82;
    muzzleY = 0.022;
    ejectPos = new THREE.Vector3(0.032, 0.04, -0.07);
    leftHandPos = new THREE.Vector3(-0.014, -0.018, -0.28);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.068);
    adsOffset.set(0, -0.067, -0.32);
  } else if (weaponId === 'm1_garand' || weaponId === 'kar98k' || weaponId === 'springfield') {
    const isKar = weaponId === 'kar98k';
    const isSniper = weaponId === 'springfield';
    const wood = isKar ? darkWalnutMat : walnutMat;

    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.34, -0.095],
            [0.34, 0.006],
            [0.14, 0.012],
            [0.06, 0.022],
            [-0.48, 0.018],
            [-0.48, -0.016],
            [0.05, -0.034],
            [0.14, -0.06],
            [0.2, -0.048],
          ],
          0.044,
          0.004,
        ),
        wood,
      );
      const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.102, 0.01), darkMetalMat);
      buttPlate.position.set(0, -0.044, 0.344);
      root.add(stock, buttPlate);
    } else {
      const forendOnly = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.08, 0.02],
            [-0.48, 0.018],
            [-0.48, -0.016],
            [0.08, -0.034],
          ],
          0.044,
          0.004,
        ),
        wood,
      );
      root.add(forendOnly);
    }

    // Top walnut handguard running forward over barrel
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.022, 0.38), wood);
    handguard.position.set(0, 0.034, -0.29);

    // Machined receiver box + bridge
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.038, 0.24), parkerizedMat);
    receiver.position.set(0, 0.032, -0.06);
    const receiverTop = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.22, 10), parkerizedMat);
    receiverTop.rotation.x = Math.PI / 2;
    receiverTop.position.set(0, 0.044, -0.06);

    const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10), bluedSteelMat);
    boltBody.rotation.x = Math.PI / 2;
    boltBody.position.set(0.01, 0.046, -0.06);
    boltGroup.add(boltBody);

    if (isKar || isSniper) {
      const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.044, 8), bluedSteelMat);
      boltHandle.rotation.z = -1.1;
      boltHandle.position.set(0.032, 0.038, -0.02);
      const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), bluedSteelMat);
      boltKnob.position.set(0.05, 0.028, -0.02);
      boltGroup.add(boltHandle, boltKnob);
    }

    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.045, 0.055), brassMat);
    clip.position.set(0, 0.02, -0.09);
    magGroup.add(clip);

    const barrelLen = isSniper ? 0.44 : 0.38;
    const barrel = new THREE.Mesh(
      createLatheBarrel([
        [0.015, 0.0],
        [0.013, barrelLen * 0.55],
        [0.01, barrelLen],
      ]),
      bluedSteelMat,
    );
    barrel.position.set(0, 0.036, -0.45);

    const underTube = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.28, 8), parkerizedMat);
    underTube.rotation.x = Math.PI / 2;
    underTube.position.set(0, 0.014, -0.58);
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.044, 0.022), brassMat);
    band1.position.set(0, 0.022, -0.46);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.038, 0.018), darkMetalMat);
    band2.position.set(0, 0.024, -0.24);

    const frontBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.024), darkMetalMat);
    frontBase.position.set(0, 0.044, -0.77);
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.02, 0.01), darkMetalMat);
    frontPost.position.set(0, 0.058, -0.77);

    root.add(
      handguard,
      receiver,
      receiverTop,
      barrel,
      underTube,
      band1,
      band2,
      frontBase,
      frontPost,
    );

    if (!customOpticActive) {
      const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.014, 0.032), darkMetalMat);
      rearBase.position.set(0, 0.055, -0.01);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.02), darkMetalMat);
      earL.position.set(-0.008, 0.065, -0.01);
      const earR = earL.clone();
      earR.position.x = 0.008;
      root.add(rearBase, earL, earR);
      adsOffset.set(0, -0.065, -0.32);
    }

    addTriggerGuard(-0.018, 0.04);
    muzzleZ = isSniper ? -0.9 : -0.84;
    muzzleY = 0.036;
    leftHandPos = new THREE.Vector3(-0.015, -0.02, -0.32);
    rightHandPos = new THREE.Vector3(0.0, -0.04, 0.11);
  } else if (weaponId === 'bar') {
    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.35, -0.1],
            [0.35, 0.006],
            [0.12, 0.014],
            [0.06, -0.04],
            [0.18, -0.055],
          ],
          0.044,
          0.004,
        ),
        walnutMat,
      );
      const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.106, 0.01), darkMetalMat);
      buttPlate.position.set(0, -0.048, 0.354);
      root.add(stock, buttPlate);
    }
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.044, 0.3), walnutMat);
    foregrip.position.set(0, -0.004, -0.29);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.062, 0.28), parkerizedMat);
    receiver.position.set(0, 0.026, -0.06);

    const barrel = new THREE.Mesh(
      createLatheBarrel([
        [0.018, 0.0],
        [0.016, 0.24],
        [0.013, 0.45],
        [0.016, 0.52],
        [0.014, 0.55],
      ]),
      bluedSteelMat,
    );
    barrel.position.set(0, 0.036, -0.2);

    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 8), darkMetalMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.014, -0.44);

    for (const bx of [-0.026, 0.026]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.006, 0.26, 6), darkMetalMat);
      leg.rotation.x = Math.PI / 2;
      leg.position.set(bx, 0.01, -0.56);
      root.add(leg);
    }

    if (!customMagActive) {
      const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.145, 0.07), bluedSteelMat);
      boxMag.position.set(0, -0.075, -0.11);
      magGroup.add(boxMag);
    }

    const opHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), darkMetalMat);
    opHandle.rotation.z = Math.PI / 2;
    opHandle.position.set(-0.036, 0.036, -0.08);
    boltGroup.add(opHandle);

    const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.02), darkMetalMat);
    rearEarL.position.set(-0.009, 0.064, 0.04);
    const rearEarR = rearEarL.clone();
    rearEarR.position.x = 0.009;
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.012), darkMetalMat);
    frontPost.position.set(0, 0.06, -0.68);

    addTriggerGuard(-0.02, 0.03);
    root.add(foregrip, receiver, barrel, gasTube, rearEarL, rearEarR, frontPost);
    muzzleZ = -0.78;
    muzzleY = 0.036;
    leftHandPos = new THREE.Vector3(-0.016, -0.026, -0.3);
    rightHandPos = new THREE.Vector3(0.0, -0.044, 0.095);
    adsOffset.set(0, -0.064, -0.32);
  } else if (weaponId === 'thompson') {
    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.32, -0.105],
            [0.32, -0.01],
            [0.12, 0.005],
            [0.09, -0.025],
          ],
          0.042,
          0.004,
        ),
        walnutMat,
      );
      root.add(stock);
    }
    const grip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.03, -0.01],
          [0.07, -0.01],
          [0.105, -0.11],
          [0.06, -0.115],
        ],
        0.034,
        0.004,
      ),
      walnutMat,
    );
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.034, 0.16), walnutMat);
    foregrip.position.set(0, -0.004, -0.31);

    // Classic square machined upper receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.052, 0.31), parkerizedMat);
    receiver.position.set(0, 0.028, -0.085);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.34, 10), bluedSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.4);
    root.add(grip, foregrip, receiver, barrel);

    for (let i = 0; i < 7; i++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 10), darkMetalMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(0, 0.032, -0.28 - i * 0.018);
      root.add(fin);
    }

    const comp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.026, 0.055), darkMetalMat);
    comp.position.set(0, 0.032, -0.58);

    if (!customMagActive) {
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.21, 0.042), bluedSteelMat);
      mag.position.set(0, -0.09, -0.19);
      mag.rotation.x = -0.05;
      magGroup.add(mag);
    }

    const actuator = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.02), bluedSteelMat);
    actuator.position.set(0, 0.058, -0.08);
    boltGroup.add(actuator);

    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.02), darkMetalMat);
    rearL.position.set(-0.009, 0.062, 0.02);
    const rearR = rearL.clone();
    rearR.position.x = 0.009;
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.01), darkMetalMat);
    front.position.set(0, 0.056, -0.56);

    addTriggerGuard(-0.015, -0.01);
    root.add(comp, rearL, rearR, front);
    muzzleZ = -0.62;
    muzzleY = 0.032;
    leftHandPos = new THREE.Vector3(-0.014, -0.02, -0.31);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.065);
    adsOffset.set(0, -0.062, -0.3);
  } else if (weaponId === 'mp40') {
    const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.36, 12), bluedSteelMat);
    receiver.rotation.x = Math.PI / 2;
    receiver.position.set(0, 0.028, -0.09);

    const grip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.015, -0.005],
          [0.058, -0.005],
          [0.092, -0.11],
          [0.045, -0.115],
        ],
        0.032,
        0.004,
      ),
      bakeliteMat,
    );
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.3), bakeliteMat);
    lowerBody.position.set(0, -0.004, -0.08);

    if (!customStockActive) {
      const wireCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.022, 0.015, 0.08),
        new THREE.Vector3(-0.024, -0.01, 0.29),
        new THREE.Vector3(0.024, -0.01, 0.29),
        new THREE.Vector3(0.022, 0.015, 0.08),
      ]);
      const wireStock = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 14, 0.0055, 6, false), parkerizedMat);
      root.add(wireStock);
    }

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.3, 10), bluedSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.028, -0.43);
    const restBar = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 0.14), bakeliteMat);
    restBar.position.set(0, 0.01, -0.37);
    const muzzleNut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.026, 10), darkMetalMat);
    muzzleNut.rotation.x = Math.PI / 2;
    muzzleNut.position.set(0, 0.028, -0.58);

    const magWell = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.075, 0.046), parkerizedMat);
    magWell.position.set(0, -0.028, -0.21);
    if (!customMagActive) {
      const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8), bluedSteelMat);
      mag.position.set(0, -0.125, -0.22);
      mag.rotation.x = -0.06;
      magGroup.add(mag);
    }

    const charging = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.014), darkMetalMat);
    charging.position.set(-0.028, 0.032, -0.04);
    boltGroup.add(charging);

    const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0026, 6, 12, Math.PI * 1.4), darkMetalMat);
    frontHood.rotation.z = -Math.PI * 0.2;
    frontHood.position.set(0, 0.048, -0.55);
    const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.008), darkMetalMat);
    frontBlade.position.set(0, 0.05, -0.55);

    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.016), darkMetalMat);
    rearL.position.set(-0.009, 0.056, 0.04);
    const rearR = rearL.clone();
    rearR.position.x = 0.009;

    addTriggerGuard(-0.02, -0.02);
    root.add(receiver, grip, lowerBody, barrel, restBar, muzzleNut, magWell, frontHood, frontBlade, rearL, rearR);
    muzzleZ = -0.6;
    muzzleY = 0.028;
    leftHandPos = new THREE.Vector3(-0.014, -0.055, -0.21);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.055);
    adsOffset.set(0, -0.056, -0.3);
  } else if (weaponId === 'stg44') {
    // Authentic Sturmgewehr 44: Triangular wood stock, stamped steel angular receiver housing,
    // ventilated steel front shroud, high gas tube, forward-curving banana mag, hooded front post
    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.08, 0.024],
            [0.33, 0.016],
            [0.33, -0.095],
            [0.08, -0.024],
          ],
          0.04,
          0.004,
        ),
        walnutMat,
      );
      const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.01), darkMetalMat);
      buttPlate.position.set(0, -0.04, 0.334);
      root.add(stock, buttPlate);
    }

    const grip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.02, -0.015],
          [0.065, -0.015],
          [0.105, -0.118],
          [0.058, -0.12],
        ],
        0.034,
        0.004,
      ),
      bakeliteMat,
    );

    // Distinct angular stamped steel StG-44 upper & lower receiver
    const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.32), parkerizedMat);
    upperReceiver.position.set(0, 0.034, -0.085);
    const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.024, 0.27), darkMetalMat);
    lowerReceiver.position.set(0, 0.008, -0.06);

    // Ventilated stamped steel handguard shroud + side vents
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.038, 0.25), darkMetalMat);
    handguard.position.set(0, 0.022, -0.365);
    const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.27, 8), bluedSteelMat);
    gasTube.rotation.x = Math.PI / 2;
    gasTube.position.set(0, 0.046, -0.37);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.28, 10), bluedSteelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.026, -0.58);

    // Signature forward-curving StG-44 magazine
    if (!customMagActive) {
      const bananaMag = new THREE.Mesh(
        createExtrudedProfile(
          [
            [-0.145, -0.005],
            [-0.215, -0.005],
            [-0.255, -0.12],
            [-0.315, -0.22],
            [-0.25, -0.232],
            [-0.19, -0.12],
          ],
          0.025,
          0.003,
        ),
        bluedSteelMat,
      );
      magGroup.add(bananaMag);
    }

    const chargeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.01, 0.014), darkMetalMat);
    chargeHandle.position.set(-0.03, 0.04, -0.1);
    boltGroup.add(chargeHandle);

    const frontTower = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.036, 0.02), darkMetalMat);
    frontTower.position.set(0, 0.056, -0.55);
    const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0024, 6, 12, Math.PI * 1.4), darkMetalMat);
    frontHood.rotation.z = -Math.PI * 0.2;
    frontHood.position.set(0, 0.066, -0.55);

    const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.028), darkMetalMat);
    rearBase.position.set(0, 0.056, -0.02);
    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.016, 0.022), darkMetalMat);
    rearL.position.set(-0.009, 0.066, -0.02);
    const rearR = rearL.clone();
    rearR.position.x = 0.009;

    addTriggerGuard(-0.018, -0.01);
    root.add(
      grip,
      upperReceiver,
      lowerReceiver,
      handguard,
      gasTube,
      barrel,
      frontTower,
      frontHood,
      rearBase,
      rearL,
      rearR,
    );
    muzzleZ = -0.73;
    muzzleY = 0.026;
    leftHandPos = new THREE.Vector3(-0.014, -0.016, -0.32);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.064);
    adsOffset.set(0, -0.066, -0.31);
  } else if (weaponId === 'rpg7') {
    // Authentic RPG-7 Anti-Tank Launcher: flared Venturi tailcone, laminated wood heat shield,
    // twin pistol grips, PGO-7 side optical sight, and iconic PG-7V tapered rocket warhead!
    const barrelTube = new THREE.Mesh(
      createLatheBarrel([
        [0.044, 0.0],
        [0.036, 0.1],
        [0.025, 0.22],
        [0.024, 0.62],
        [0.03, 0.68],
        [0.03, 0.78],
        [0.024, 0.84],
        [0.026, 0.96],
      ]),
      parkerizedMat,
    );
    barrelTube.position.set(0, 0.022, 0.28);

    // Laminated wood heat-shield sleeve wrapping mid-tube
    const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.3, 12), akWoodMat);
    heatShield.rotation.x = Math.PI / 2;
    heatShield.position.set(0, 0.022, -0.08);
    for (const hz of [0.06, -0.22]) {
      const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.016, 12), darkMetalMat);
      clamp.rotation.x = Math.PI / 2;
      clamp.position.set(0, 0.022, hz);
      root.add(clamp);
    }

    // Twin downward tactical grips (front trigger grip + rear support grip)
    const frontGrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.042), bakeliteMat);
    frontGrip.position.set(0, -0.055, -0.34);
    frontGrip.rotation.x = -0.18;
    const rearGrip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.038), bakeliteMat);
    rearGrip.position.set(0, -0.05, -0.11);
    rearGrip.rotation.x = -0.1;

    // PGO-7 optical sight mounted cleanly on left side so camera never clips
    const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.04), darkMetalMat);
    opticMount.position.set(-0.046, 0.038, -0.16);
    const opticBody = new THREE.Mesh(
      createLatheBarrel([
        [0.02, 0.0],
        [0.02, 0.05],
        [0.016, 0.08],
        [0.018, 0.16],
      ]),
      oliveTubeMat,
    );
    opticBody.position.set(-0.075, 0.058, -0.09);
    const opticLensF = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), lensMat);
    opticLensF.position.set(-0.075, 0.058, -0.252);
    opticLensF.rotation.y = Math.PI;
    const opticLensR = new THREE.Mesh(new THREE.CircleGeometry(0.017, 12), lensMat);
    opticLensR.position.set(-0.075, 0.058, -0.088);

    const frontLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.028, 0.012), darkMetalMat);
    frontLeaf.position.set(-0.02, 0.056, -0.66);
    const rearLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), darkMetalMat);
    rearLeaf.position.set(-0.02, 0.056, -0.2);

    // Signature PG-7V warhead seated in muzzle (in magGroup so reload slides warhead in!)
    const boosterStem = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, 0.14, 10), darkMetalMat);
    boosterStem.rotation.x = Math.PI / 2;
    boosterStem.position.set(0, 0.022, -0.71);
    const warheadBody = new THREE.Mesh(
      createLatheBarrel([
        [0.022, 0.0],
        [0.046, 0.07],
        [0.046, 0.14],
        [0.018, 0.25],
        [0.008, 0.29],
      ]),
      warheadMat,
    );
    warheadBody.position.set(0, 0.022, -0.76);
    const fuzeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.032, 8), brassMat);
    fuzeCap.rotation.x = Math.PI / 2;
    fuzeCap.position.set(0, 0.022, -1.06);
    magGroup.add(boosterStem, warheadBody, fuzeCap);

    addTriggerGuard(-0.022, -0.34);
    root.add(
      barrelTube,
      heatShield,
      frontGrip,
      rearGrip,
      opticMount,
      opticBody,
      opticLensF,
      opticLensR,
      frontLeaf,
      rearLeaf,
    );
    muzzleZ = -0.96;
    muzzleY = 0.022;
    leftHandPos = new THREE.Vector3(0, -0.068, -0.11);
    rightHandPos = new THREE.Vector3(0, -0.072, -0.34);
    adsOffset.set(0.075, -0.058, -0.58);
  } else if (weaponId === 'bazooka' || weaponId === 'panzerschreck') {
    const isPanz = weaponId === 'panzerschreck';
    const tubeMat = isPanz ? parkerizedMat : oliveTubeMat;

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.05, 14), tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, -0.25);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.066, 0.14, 14), darkMetalMat);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, 0.02, 0.33);

    const frontRing = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.04, 14), darkMetalMat);
    frontRing.rotation.x = Math.PI / 2;
    frontRing.position.set(0, 0.02, -0.76);

    const frontGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 8), walnutMat);
    frontGrip.position.set(0, -0.07, -0.42);
    const rearGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 8), walnutMat);
    rearGrip.position.set(0, -0.07, -0.14);

    if (isPanz) {
      // Protective blast shield with armored cutout & reinforced visor frame on the sight side
      const shieldMain = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.014), parkerizedMat);
      shieldMain.position.set(-0.04, 0.04, -0.34);
      shieldMain.rotation.y = 0.06;
      const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.01), lensMat);
      visorGlass.position.set(-0.125, 0.065, -0.345);
      visorGlass.rotation.y = 0.06;
      root.add(shieldMain, visorGlass);
    }

    const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 10), warheadMat);
    rocketBody.rotation.x = Math.PI / 2;
    rocketBody.position.set(0, 0.02, -0.74);
    const rocketNose = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 10), brassMat);
    rocketNose.rotation.x = -Math.PI / 2;
    rocketNose.position.set(0, 0.02, -0.89);
    magGroup.add(rocketBody, rocketNose);

    // Side-mounted iron sight bracket so the shoulder tube never blocks or clips the camera in ADS
    const rearBracket = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.012, 0.016), darkMetalMat);
    rearBracket.position.set(-0.062, 0.048, -0.06);
    const frontBracket = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.01, 0.014), darkMetalMat);
    frontBracket.position.set(-0.062, 0.048, -0.68);
    const rearSight = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0032, 6, 14), darkMetalMat);
    rearSight.position.set(-0.088, 0.062, -0.06);
    const frontPin = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.022, 0.008), darkMetalMat);
    frontPin.position.set(-0.088, 0.058, -0.68);

    addTriggerGuard(-0.025, -0.14);
    root.add(
      tube,
      bell,
      frontRing,
      frontGrip,
      rearGrip,
      rearBracket,
      frontBracket,
      rearSight,
      frontPin,
    );
    muzzleZ = -0.9;
    muzzleY = 0.02;
    leftHandPos = new THREE.Vector3(0, -0.08, -0.42);
    rightHandPos = new THREE.Vector3(0, -0.08, -0.14);
    adsOffset.set(0.088, -0.062, -0.64);
  } else if (weaponId === 'ppsh41') {
    // Iconic Soviet PPSh-41: Birch stock, perforated steel barrel shroud, 71-round drum magazine
    if (!customStockActive) {
      const stock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.34, -0.095],
            [0.34, 0.01],
            [0.09, 0.018],
            [-0.24, 0.014],
            [-0.24, -0.018],
            [0.05, -0.032],
            [0.14, -0.055],
            [0.2, -0.044],
          ],
          0.042,
          0.004,
        ),
        akWoodMat,
      );
      const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.1, 0.01), darkMetalMat);
      buttPlate.position.set(0, -0.042, 0.344);
      root.add(stock, buttPlate);
    } else {
      const forendOnly = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.08, 0.016],
            [-0.24, 0.014],
            [-0.24, -0.018],
            [0.08, -0.032],
          ],
          0.042,
          0.004,
        ),
        akWoodMat,
      );
      root.add(forendOnly);
    }

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.04, 0.28), bluedSteelMat);
    receiver.position.set(0, 0.03, -0.08);
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.038, 0.34), parkerizedMat);
    shroud.position.set(0, 0.032, -0.39);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.36, 10), darkMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.4);
    const compSlant = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.035), darkMetalMat);
    compSlant.position.set(0, 0.033, -0.57);
    compSlant.rotation.x = 0.25;

    if (!customMagActive) {
      // Signature 71-round cylindrical drum magazine
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.044, 18), bluedSteelMat);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, -0.085, -0.2);
      const drumRim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.005, 6, 18), darkMetalMat);
      drumRim.position.set(0, -0.085, -0.224);
      const drumNeck = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.055, 0.038), darkMetalMat);
      drumNeck.position.set(0, -0.01, -0.2);
      magGroup.add(drum, drumRim, drumNeck);
    }

    const chargeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.014), darkMetalMat);
    chargeHandle.position.set(0.03, 0.038, -0.09);
    boltGroup.add(chargeHandle);

    const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.018), darkMetalMat);
    rearEarL.position.set(-0.008, 0.058, 0.01);
    const rearEarR = rearEarL.clone();
    rearEarR.position.x = 0.008;
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.01), darkMetalMat);
    frontPost.position.set(0, 0.058, -0.55);

    addTriggerGuard(-0.016, 0.04);
    root.add(receiver, shroud, barrel, compSlant, rearEarL, rearEarR, frontPost);
    muzzleZ = -0.6;
    muzzleY = 0.032;
    leftHandPos = new THREE.Vector3(-0.014, -0.016, -0.32);
    rightHandPos = new THREE.Vector3(0.0, -0.04, 0.11);
    adsOffset.set(0, -0.06, -0.31);
  } else if (weaponId === 'binoculars') {
    // Detailed 6x30 military field binoculars (held by both hands)
    const makeBarrelTube = (sideX: number) => {
      const grp = new THREE.Group();
      grp.position.set(sideX, 0.01, -0.08);
      const body = new THREE.Mesh(
        createLatheBarrel([
          [0.022, 0.0],
          [0.022, 0.06],
          [0.034, 0.12],
          [0.038, 0.2],
        ]),
        oliveTubeMat,
      );
      const eyecup = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.025, 12), polymerMat);
      eyecup.rotation.x = Math.PI / 2;
      eyecup.position.z = 0.015;
      const frontRim = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.004, 6, 14), darkMetalMat);
      frontRim.position.z = -0.2;
      const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.034, 14), lensMat);
      lensF.position.z = -0.198;
      lensF.rotation.y = Math.PI;
      const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), lensMat);
      lensR.position.z = 0.026;
      grp.add(body, eyecup, frontRim, lensF, lensR);
      return grp;
    };
    const leftTube = makeBarrelTube(-0.046);
    const rightTube = makeBarrelTube(0.046);
    const bridgeRear = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.018, 0.034), darkMetalMat);
    bridgeRear.position.set(0, 0.016, -0.1);
    const focusWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.036, 10), brassMat);
    focusWheel.rotation.x = Math.PI / 2;
    focusWheel.position.set(0, 0.026, -0.12);
    const bridgeFront = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.014, 0.022), darkMetalMat);
    bridgeFront.position.set(0, 0.01, -0.22);

    root.add(leftTube, rightTube, bridgeRear, focusWheel, bridgeFront);
    muzzleZ = -0.32;
    muzzleY = 0.01;
    leftHandPos = new THREE.Vector3(-0.068, -0.015, -0.16);
    rightHandPos = new THREE.Vector3(0.068, -0.015, -0.14);
    adsOffset.set(0, -0.01, -0.12);
  } else if (weaponId === 'shovel') {
    // WWII Entrenching Shovel: Unified group so handle, D-grip, steel collar, and pointed blade align cleanly
    showLeftArm = false;
    const shovelGroup = new THREE.Group();
    shovelGroup.position.set(0, -0.02, -0.04);
    shovelGroup.rotation.x = 0.42;

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.38, 10), walnutMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, -0.01);

    const dGripBar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.095, 8), walnutMat);
    dGripBar.rotation.z = Math.PI / 2;
    dGripBar.position.set(0, 0, 0.185);

    const dGripSideL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.055), darkMetalMat);
    dGripSideL.position.set(-0.04, 0, 0.16);
    const dGripSideR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.055), darkMetalMat);
    dGripSideR.position.set(0.04, 0, 0.16);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.10, 10), darkMetalMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0, -0.21);

    // Pointed steel spade blade extending forward along -Z
    const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.012, 0.14), parkerizedMat);
    bladeMain.position.set(0, 0, -0.31);
    const bladeTip = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.072, 0.08, 4), parkerizedMat);
    bladeTip.rotation.x = -Math.PI / 2;
    bladeTip.rotation.z = Math.PI / 4;
    bladeTip.scale.set(1.0, 1.0, 0.14);
    bladeTip.position.set(0, 0, -0.415);

    shovelGroup.add(handle, dGripBar, dGripSideL, dGripSideR, collar, bladeMain, bladeTip);
    root.add(shovelGroup);
    muzzleZ = -0.48;
    muzzleY = 0.04;
    leftHandPos = new THREE.Vector3(-0.04, -0.1, 0.04);
    rightHandPos = new THREE.Vector3(0.01, -0.06, 0.04);
    adsOffset.set(0.08, -0.16, -0.45);
  } else {
    // Colt M1911 Sidearm: chamfered square slide, walnut grip panels, frame rail
    showLeftArm = false;
    const grip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.01, 0.0],
          [0.056, 0.0],
          [0.088, -0.115],
          [0.036, -0.118],
        ],
        0.032,
        0.004,
      ),
      darkMetalMat,
    );
    const gripPanelL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.085, 0.038), walnutMat);
    gripPanelL.position.set(-0.018, -0.055, 0.048);
    gripPanelL.rotation.x = -0.24;
    const gripPanelR = gripPanelL.clone();
    gripPanelR.position.x = 0.018;

    const frameRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.02, 0.2), parkerizedMat);
    frameRail.position.set(0, 0.008, -0.02);

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.25), bluedSteelMat);
    slide.position.set(0, 0.026, -0.042);
    const slideTop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8), bluedSteelMat);
    slideTop.rotation.x = Math.PI / 2;
    slideTop.position.set(0, 0.034, -0.042);
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.012, 0.01), darkMetalMat);
    frontSight.position.set(0, 0.048, -0.155);
    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.012), darkMetalMat);
    rearL.position.set(-0.007, 0.048, 0.065);
    const rearR = rearL.clone();
    rearR.position.x = 0.007;
    boltGroup.add(slide, slideTop, frontSight, rearL, rearR);

    if (!customMagActive) {
      const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.1, 0.028), brassMat);
      magBody.position.set(0, -0.068, 0.052);
      magBody.rotation.x = -0.24;
      magGroup.add(magBody);
    }

    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.04, 10), brassMat);
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(0, 0.026, -0.175);

    const hammer = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 6), darkMetalMat);
    hammer.rotation.z = Math.PI / 2;
    hammer.position.set(0, 0.026, 0.084);

    addTriggerGuard(-0.012, -0.018);
    root.add(grip, gripPanelL, gripPanelR, frameRail, barrelTip, hammer);
    muzzleZ = -0.21;
    muzzleY = 0.026;
    ejectPos = new THREE.Vector3(0.022, 0.038, -0.04);
    rightHandPos = new THREE.Vector3(0, -0.058, 0.05);
    adsOffset.set(0, -0.048, -0.34);
  }

  // Mount modular 3D attachments
  if (customOpticActive) {
    const opticBuilt = buildOptic3D(loadout.optic);
    opticBuilt.group.position.copy(anchors.opticPos);
    root.add(opticBuilt.group);
    adsOffset.set(
      -anchors.opticPos.x,
      -(anchors.opticPos.y + opticBuilt.lensCenterLocalY),
      adsOffset.z,
    );
  }

  if (customStockActive) {
    const stock3d = buildStock3D(loadout.stock);
    stock3d.position.copy(anchors.stockPos);
    root.add(stock3d);
  }

  if (caps.supportsGrip && loadout.grip !== 'standard') {
    const grip3d = buildGrip3D(loadout.grip);
    grip3d.position.copy(anchors.gripPos);
    root.add(grip3d);
    if (loadout.grip === 'vertical') {
      leftHandPos = anchors.gripPos.clone().add(new THREE.Vector3(-0.008, -0.048, 0));
    } else {
      leftHandPos = anchors.gripPos.clone().add(new THREE.Vector3(-0.006, -0.02, 0));
    }
  }

  if (caps.supportsMuzzle && loadout.muzzle === 'suppressor') {
    const supp = buildSuppressor3D();
    supp.position.copy(anchors.muzzlePos);
    root.add(supp);
    muzzleZ = anchors.muzzlePos.z - 0.172;
    muzzleY = anchors.muzzlePos.y;
  }

  if (customMagActive) {
    const mag3d = buildMagazine3D(loadout.magazine, weaponId);
    mag3d.position.copy(anchors.magPos);
    magGroup.add(mag3d);
  }

  let accessoryEffectGroup: THREE.Group | undefined;
  let laserBeam: THREE.Mesh | undefined;
  let laserDot: THREE.Mesh | undefined;
  let spotLight: THREE.SpotLight | undefined;

  if (caps.supportsRail && loadout.rail !== 'none') {
    const rail3d = buildRailAccessory3D(loadout.rail);
    rail3d.position.copy(anchors.railPos);
    root.add(rail3d);

    if (loadout.rail === 'laser' || loadout.rail === 'flashlight') {
      accessoryEffectGroup = new THREE.Group();
      accessoryEffectGroup.position.copy(anchors.railPos);
      accessoryEffectGroup.visible = false;

      if (loadout.rail === 'laser') {
        const beamGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 1, 6);
        beamGeo.rotateX(-Math.PI / 2);
        beamGeo.translate(0, 0, -0.5);
        laserBeam = new THREE.Mesh(
          beamGeo,
          new THREE.MeshBasicMaterial({
            color: 0xff2a2a,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
          }),
        );
        laserBeam.position.set(0.018, 0.008, -0.048);
        laserBeam.scale.set(1, 1, 24);

        laserDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3b3b }),
        );
        laserDot.position.set(0.018, 0.008, -24);
        accessoryEffectGroup.add(laserBeam, laserDot);
      } else {
        const coneGeo = new THREE.ConeGeometry(1.15, 7.5, 14, 1, true);
        coneGeo.rotateX(Math.PI / 2);
        coneGeo.translate(0, 0, -3.75);
        const cone = new THREE.Mesh(
          coneGeo,
          new THREE.MeshBasicMaterial({
            color: 0xfff8dc,
            transparent: true,
            opacity: 0.11,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        cone.position.set(0.014, 0, -0.075);

        spotLight = new THREE.SpotLight(0xfff4d6, 2.8, 38, 0.36, 0.45, 1.3);
        spotLight.position.set(0.014, 0, -0.075);
        spotLight.target.position.set(0.014, 0, -14);
        accessoryEffectGroup.add(cone, spotLight, spotLight.target);
      }
      root.add(accessoryEffectGroup);
    }
  }

  if (!options?.hideArms) {
    const upAxis = new THREE.Vector3(0, 1, 0);
    const attachLimb = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      radius: number,
      mat: THREE.Material,
    ) => {
      const dir = to.clone().sub(from);
      const len = dir.length();
      if (len < 0.03) return;
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const seg = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, Math.max(0.02, len - radius * 1.4), 4, 8),
        mat,
      );
      seg.position.copy(mid);
      seg.quaternion.setFromUnitVectors(upAxis, dir.normalize());
      root.add(seg);
    };

    // Right tactical articulated trigger hand with jointed fingers + attached forearm
    const rightHand = buildArticulatedHand('right', 'trigger');
    rightHand.position.copy(rightHandPos);
    rightHand.rotation.x = 0.22;
    root.add(rightHand);

    const rightWrist = rightHandPos.clone().add(new THREE.Vector3(0.012, -0.018, 0.028));
    const rightShoulder = new THREE.Vector3(0.16, -0.22, 0.34);
    attachLimb(rightShoulder, rightWrist, 0.036, sleeveMat);

    // Left support hand cradling handguard/foregrip with articulated fingers + attached forearm
    if (showLeftArm) {
      const leftPose = loadout.grip === 'vertical' ? 'foregrip' : 'support_flat';
      const leftHand = buildArticulatedHand('left', leftPose);
      leftHand.position.copy(leftHandPos);
      root.add(leftHand);

      const leftWrist = leftHandPos.clone().add(new THREE.Vector3(-0.014, -0.016, 0.028));
      const leftShoulder = new THREE.Vector3(-0.24, -0.24, 0.24);
      attachLimb(leftShoulder, leftWrist, 0.035, sleeveMat);
    } else {
      const cupHand = buildArticulatedHand('left', 'cup');
      cupHand.position.set(-0.018, -0.068, 0.05);
      const leftWrist = new THREE.Vector3(-0.03, -0.08, 0.075);
      const leftShoulder = new THREE.Vector3(-0.2, -0.24, 0.28);
      attachLimb(leftShoulder, leftWrist, 0.034, sleeveMat);
      root.add(cupHand);
    }
  }

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, muzzleY, muzzleZ);
  root.add(muzzlePoint);

  const ejectionPort = new THREE.Object3D();
  ejectionPort.position.copy(ejectPos);
  root.add(ejectionPort);

  const flashScale =
    weaponId === 'rpg7' || weaponId === 'bazooka' || weaponId === 'panzerschreck'
      ? 1.7
      : loadout.muzzle === 'suppressor'
        ? 0.24
        : 0.72;
  const muzzleFlash = createRealisticMuzzleFlash(flashScale);
  muzzleFlash.position.copy(muzzlePoint.position);
  root.add(muzzleFlash);

  return {
    root,
    magGroup,
    boltGroup,
    muzzlePoint,
    ejectionPort,
    muzzleFlash,
    adsOffset,
    accessoryEffectGroup,
    laserBeam,
    laserDot,
    spotLight,
  };
}

/**
 * Hollow ENTERABLE Normandy/Forest/Stalingrad house with open doorway, open shooting windows,
 * stone foundation floor, interior wooden furniture, and pitched gable roof.
 */
export function createVillageHouse(
  width: number,
  depth: number,
  wallHeight: number,
  roofColor: number,
  ruined = false,
): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = makePbrMat(0x7e776c, 0.9, 0.04, true);
  const stuccoMat = makePbrMat(ruined ? 0xb5aba0 : 0xd6cbb8, 0.86, 0.02, true);
  const timberMat = makePbrMat(0x4b3523, 0.78, 0.05, true);
  const roofMat = makePbrMat(roofColor, 0.74, 0.08, true);
  const floorMat = makePbrMat(0x665c50, 0.92, 0.03, true);

  const wallT = 0.34;
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const doorW = 1.75;
  const doorH = 2.35;

  // Embedded stone floor pad extending -1.2m below y=0 so slopes never expose gaps
  const floorBase = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 1.45, depth + 0.35), stoneMat);
  floorBase.position.y = -0.48;
  floorBase.castShadow = true;
  floorBase.receiveShadow = true;
  const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.2), floorMat);
  interiorFloor.position.y = 0.26;
  interiorFloor.receiveShadow = true;
  group.add(floorBase, interiorFloor);

  // Back wall (-Z) solid with upper beam
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, wallT), stuccoMat);
  backWall.position.set(0, 0.25 + wallHeight * 0.5, -hd + wallT * 0.5);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  // Front wall (+Z) split around open doorway
  const frontSideW = Math.max(0.8, (width - doorW) * 0.5);
  for (const dir of [-1, 1]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, wallHeight, wallT), stuccoMat);
    seg.position.set(dir * (doorW * 0.5 + frontSideW * 0.5), 0.25 + wallHeight * 0.5, hd - wallT * 0.5);
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
  }
  const doorLintelH = Math.max(0.4, wallHeight - doorH);
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorLintelH, wallT), stuccoMat);
  doorLintel.position.set(0, 0.25 + doorH + doorLintelH * 0.5, hd - wallT * 0.5);
  doorLintel.castShadow = true;
  group.add(doorLintel);

  // Timber door frame jambs
  for (const dir of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, doorH, wallT + 0.08), timberMat);
    jamb.position.set(dir * (doorW * 0.5 - 0.05), 0.25 + doorH * 0.5, hd - wallT * 0.5);
    group.add(jamb);
  }

  // Side walls (-X and +X) with real open window cutouts to shoot/look through
  const winW = 1.45;
  const sillH = 1.15;
  const winH = 1.15;
  const sideSegD = Math.max(0.7, (depth - winW) * 0.5);
  for (const sideX of [-hw + wallT * 0.5, hw - wallT * 0.5]) {
    for (const dirZ of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallHeight, sideSegD), stuccoMat);
      seg.position.set(sideX, 0.25 + wallHeight * 0.5, dirZ * (winW * 0.5 + sideSegD * 0.5));
      seg.castShadow = true;
      seg.receiveShadow = true;
      group.add(seg);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wallT, sillH, winW), stuccoMat);
    sill.position.set(sideX, 0.25 + sillH * 0.5, 0);
    sill.castShadow = true;
    const headerH = Math.max(0.4, wallHeight - (sillH + winH));
    const header = new THREE.Mesh(new THREE.BoxGeometry(wallT, headerH, winW), stuccoMat);
    header.position.set(sideX, 0.25 + sillH + winH + headerH * 0.5, 0);
    const woodSill = new THREE.Mesh(new THREE.BoxGeometry(wallT + 0.12, 0.1, winW + 0.15), timberMat);
    woodSill.position.set(sideX, 0.25 + sillH + 0.04, 0);
    group.add(sill, header, woodSill);
  }

  // Timber corner columns & horizontal beams for non-boxy architectural character
  for (const cx of [-hw + 0.12, hw - 0.12]) {
    for (const cz of [-hd + 0.12, hd - 0.12]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallHeight + 0.2, 0.28), timberMat);
      post.position.set(cx, 0.25 + wallHeight * 0.5, cz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // Pitched gable roof with solid front/back triangular gable walls
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-hw, 0);
  gableShape.lineTo(hw, 0);
  gableShape.lineTo(0, ruined ? 1.45 : 2.15);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: wallT, bevelEnabled: false });
  for (const gz of [-hd, hd - wallT]) {
    const gableMesh = new THREE.Mesh(gableGeo, stuccoMat);
    gableMesh.position.set(0, 0.25 + wallHeight, gz);
    gableMesh.castShadow = true;
    gableMesh.receiveShadow = true;
    group.add(gableMesh);
  }

  const roofSpan = hw + 0.55;
  const roofRise = 2.15;
  const slopeLen = Math.hypot(roofSpan, roofRise);
  const slopeAngle = Math.atan2(roofRise, roofSpan);
  for (const dir of [-1, 1]) {
    if (ruined && dir === 1) {
      // Exposed broken timber rafters on the shelled side instead of open space
      for (const rz of [-hd * 0.65, 0, hd * 0.65]) {
        const rafter = new THREE.Mesh(new THREE.BoxGeometry(slopeLen * 0.62, 0.14, 0.14), timberMat);
        rafter.position.set(dir * roofSpan * 0.34, 0.25 + wallHeight + roofRise * 0.58, rz);
        rafter.rotation.z = -dir * slopeAngle;
        rafter.castShadow = true;
        group.add(rafter);
      }
      continue;
    }
    const slopeLenActual = ruined ? slopeLen * 0.72 : slopeLen;
    const slope = new THREE.Mesh(
      new THREE.BoxGeometry(slopeLenActual, 0.22, depth + 0.8),
      roofMat,
    );
    slope.position.set(
      dir * (ruined ? roofSpan * 0.55 : roofSpan * 0.5),
      0.25 + wallHeight + roofRise * 0.5 - 0.08,
      0,
    );
    slope.rotation.z = -dir * slopeAngle;
    slope.castShadow = true;
    slope.receiveShadow = true;
    group.add(slope);
  }
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, depth + 0.85), timberMat);
  ridgeBeam.position.set(0, 0.25 + wallHeight + roofRise - 0.05, 0);
  group.add(ridgeBeam);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.3, 0.72), stoneMat);
  chimney.position.set(-hw * 0.45, 0.25 + wallHeight + 1.25, -hd * 0.35);
  chimney.castShadow = true;
  group.add(chimney);

  // Rustic wooden table inside house for tactical interior cover
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.85), timberMat);
  tableTop.position.set(-hw * 0.32, 0.98, -hd * 0.3);
  tableTop.castShadow = true;
  group.add(tableTop);

  return group;
}

/**
 * Hollow ENTERABLE concrete bunker with open rear entry (+Z / -Z) and front machine-gun slit.
 */
export function createConcreteBunker(sandTone = false): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = makePbrMat(sandTone ? 0xc2ab87 : 0x7b7e78, 0.88, 0.05, true);
  const sandbagMat = makePbrMat(0xb8a378, 0.92, 0.02, true);
  const steelMat = makePbrMat(0x3a4047, 0.4, 0.78, true);

  // Embedded concrete floor slab (-1.1m deep skirt)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.4, 5.8), concreteMat);
  floor.position.y = -0.45;
  floor.receiveShadow = true;
  group.add(floor);

  // Side walls (-X and +X)
  for (const sx of [-3.2, 3.2]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 5.4), concreteMat);
    side.position.set(sx, 1.4, 0);
    side.castShadow = true;
    side.receiveShadow = true;
    group.add(side);
  }

  // Front wall (+Z) with open viewing/firing embrasure slit
  const frontLow = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.25, 0.75), concreteMat);
  frontLow.position.set(0, 0.82, 2.45);
  frontLow.castShadow = true;
  const frontHigh = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.65, 0.75), concreteMat);
  frontHigh.position.set(0, 2.28, 2.45);
  for (const px of [-2.55, 2.55]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 0.75), concreteMat);
    pillar.position.set(px, 1.72, 2.45);
    group.add(pillar);
  }
  group.add(frontLow, frontHigh);

  // Rear wall (-Z) split open in center so players can enter inside!
  for (const rx of [-2.25, 2.25]) {
    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, 0.7), concreteMat);
    rearWing.position.set(rx, 1.4, -2.4);
    rearWing.castShadow = true;
    group.add(rearWing);
  }

  // Beveled slab roof + observation cupola + antenna
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.68, 6.2), concreteMat);
  roof.position.y = 2.75;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.22, 0.5, 8), concreteMat);
  cupola.position.set(-1.5, 3.3, 0.4);
  cupola.castShadow = true;
  group.add(cupola);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 2.6, 5), steelMat);
  antenna.position.set(2.2, 4.2, -1.5);
  group.add(antenna);

  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 4.2, 4, 6), sandbagMat);
  bag.rotation.z = Math.PI / 2;
  bag.position.set(0, 0.25, 3.18);
  bag.castShadow = true;
  group.add(bag);

  return group;
}

export function createWoodenWatchtower(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = makePbrMat(0x5b4027, 0.85, 0.04, true);
  const roofMat = makePbrMat(0x40493b, 0.8, 0.05, true);

  for (const px of [-1.25, 1.25]) {
    for (const pz of [-1.25, 1.25]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 6.2, 6), woodMat);
      post.position.set(px, 2.3, pz);
      post.castShadow = true;
      group.add(post);
    }
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 3.2), woodMat);
  deck.position.y = 3.5;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const railN = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.15), woodMat);
  railN.position.set(0, 4.0, -1.52);
  const railS = railN.clone();
  railS.position.z = 1.52;
  const railW = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.75, 3.2), woodMat);
  railW.position.set(-1.52, 4.0, 0);
  const railE = railW.clone();
  railE.position.x = 1.52;
  group.add(railN, railS, railW, railE);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.25, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.9;
  roof.castShadow = true;
  group.add(roof);

  return group;
}

export function createFuelDrumCluster(): THREE.Group {
  const group = new THREE.Group();
  const drumMat = makePbrMat(0x7c4832, 0.58, 0.45, true);
  const oliveMat = makePbrMat(0x4f5d42, 0.62, 0.35, true);
  const offsets = [
    [-0.45, 0, 0.25, oliveMat],
    [0.45, 0, 0.18, drumMat],
    [0, 0, -0.45, drumMat],
  ] as const;

  offsets.forEach(([x, _y, z, mat]) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.35, 10), mat);
    drum.position.set(x, 0.35, z);
    drum.castShadow = true;
    drum.receiveShadow = true;
    group.add(drum);
  });
  return group;
}

export interface FlagpoleVisual {
  group: THREE.Group;
  banner: THREE.Mesh;
  bannerMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  labelSprite: THREE.Sprite;
}

export function createCaptureFlagpole(label: string, radius: number): FlagpoleVisual {
  const group = new THREE.Group();
  const plinthMat = makePbrMat(0x5d6266, 0.85, 0.08, true);
  const poleMat = makePbrMat(0xd0d5dd, 0.35, 0.8, true);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 1.4, 8), plinthMat);
  plinth.position.y = -0.15;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 8.6, 8), poleMat);
  pole.position.y = 4.55;
  pole.castShadow = true;
  group.add(pole);

  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 6),
    makePbrMat(0xd4af37, 0.25, 0.9),
  );
  finial.position.y = 8.95;
  group.add(finial);

  const bannerMat = makePbrMat(0xd1d5db, 0.7, 0.05, true, { side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.35, 6, 2), bannerMat);
  banner.position.set(1.3, 6.2, 0);
  banner.castShadow = true;
  group.add(banner);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe5e7eb,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.35, radius, 44), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#f4f4f5';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    transparent: true,
  });
  const labelSprite = new THREE.Sprite(spriteMat);
  labelSprite.position.y = 9.4;
  labelSprite.scale.set(1.55, 1.55, 1);
  labelSprite.renderOrder = 5;
  group.add(labelSprite);

  return { group, banner, bannerMat, ringMat, labelSprite };
}

export function createStoneBridge(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = makePbrMat(0x7c766d, 0.88, 0.04, true);
  const roadMat = makePbrMat(0x5e584f, 0.92, 0.02, true);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(16.5, 1.8, 8.2), roadMat);
  deck.position.y = -0.25;
  deck.receiveShadow = true;
  group.add(deck);

  for (const sz of [-3.85, 3.85]) {
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(16.5, 1.05, 0.55), stoneMat);
    parapet.position.set(0, 1.05, sz);
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    group.add(parapet);

    for (const px of [-7.8, 0, 7.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.35, 0.8), stoneMat);
      post.position.set(px, 1.2, sz);
      post.castShadow = true;
      group.add(post);
    }
  }
  return group;
}

export function createCzechHedgehog(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = makePbrMat(0x3b3834, 0.52, 0.65, true);
  const angles = [
    [0.65, 0, 0.45],
    [-0.65, 0, 0.45],
    [0, 0.65, -0.55],
  ];
  for (const [rx, ry, rz] of angles) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), ironMat);
    beam.rotation.set(rx, ry, rz);
    beam.position.y = 0.65;
    beam.castShadow = true;
    group.add(beam);
  }
  return group;
}

export function createSandbagBarrier(): THREE.Group {
  const group = new THREE.Group();
  const bagMat = makePbrMat(0xb6a177, 0.9, 0.02);
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.82, 4, 6), bagMat);
      bag.rotation.z = Math.PI / 2;
      bag.scale.set(1, 1, 1.35);
      bag.position.set(col * 1.1 + (row % 2) * 0.22, 0.08 + row * 0.36, 0);
      bag.castShadow = true;
      bag.receiveShadow = true;
      group.add(bag);
    }
  }
  return group;
}

export function createSupplyCrate(): THREE.Group {
  const group = new THREE.Group();
  const crateMat = makePbrMat(0x55623c, 0.76, 0.1, true);
  const trimMat = makePbrMat(0x363d28, 0.72, 0.16, true);
  const brassMat = makePbrMat(0xd4af37, 0.3, 0.85, true);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 0.95), crateMat);
  box.position.y = 0.25;
  box.castShadow = true;
  box.receiveShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 1.02), trimMat);
  lid.position.y = 0.82;
  const ammoShell1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), brassMat);
  ammoShell1.rotation.z = Math.PI / 2;
  ammoShell1.position.set(0, 0.93, -0.14);
  const ammoShell2 = ammoShell1.clone();
  ammoShell2.position.z = 0.14;
  group.add(box, lid, ammoShell1, ammoShell2);
  return group;
}

/**
 * Natural irregular faceted boulder geometry (non-boxy organic rock formations).
 */
export function createOrganicBoulderGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1.18, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise =
      1 +
      0.22 * Math.sin(x * 3.1 + y * 2.3) +
      0.16 * Math.cos(z * 2.9 - x * 1.7);
    const flatBottom = y < -0.45 ? 0.65 : 1.0;
    pos.setXYZ(i, x * noise, y * noise * flatBottom, z * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Multi-tiered evergreen pine canopy geometry (merged 3 irregular foliage tiers instead of 1 cone).
 */
export function createMultiTierPineCanopyGeometry(): THREE.BufferGeometry {
  const tierData = [
    { rTop: 0.4, rBot: 2.35, h: 2.1, y: 3.1 },
    { rTop: 0.25, rBot: 1.85, h: 2.0, y: 4.4 },
    { rTop: 0.02, rBot: 1.25, h: 1.9, y: 5.65 },
  ];
  const positions: number[] = [];
  for (const t of tierData) {
    const cone = new THREE.CylinderGeometry(t.rTop, t.rBot, t.h, 7, 1);
    cone.translate(0, t.y, 0);
    const nonIdx = cone.toNonIndexed();
    const p = nonIdx.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
    }
    cone.dispose();
    nonIdx.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Multi-frond desert date palm crown geometry.
 */
export function createDesertPalmCanopyGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let f = 0; f < 6; f++) {
    const angle = (f / 6) * Math.PI * 2;
    const frond = new THREE.ConeGeometry(0.52, 2.3, 4);
    frond.rotateX(Math.PI * 0.62);
    frond.translate(0, 3.7, 1.05);
    frond.rotateY(angle);
    const nonIdx = frond.toNonIndexed();
    const p = nonIdx.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
    }
    frond.dispose();
    nonIdx.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Dug foxhole crater liner + parapet rim (dark excavated soil pit + sandbag & earth mounds).
 */
export function createFoxholeVisual(radius: number): THREE.Group {
  const group = new THREE.Group();
  const deepSoilMat = makePbrMat(0x281c12, 0.98, 0.01, true);
  const dirtMat = makePbrMat(0x5b4a36, 0.96, 0.02, true);
  const bagMat = makePbrMat(0xa89268, 0.92, 0.02, true);

  // Dark recessed soil pit disc + sloping inner crater wall
  const pitWallGeo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.56, 0.78, 12, 1, true);
  const pitWallMat = makePbrMat(0x3a2a1c, 0.97, 0.01, true, { side: THREE.DoubleSide });
  const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
  pitWall.position.y = -0.32;
  pitWall.receiveShadow = true;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.62, 12), deepSoilMat);
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -0.68;
  pitFloor.receiveShadow = true;
  group.add(pitWall, pitFloor);

  const count = 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bx = Math.cos(a) * radius;
    const bz = Math.sin(a) * radius;
    const mound = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.48, 0),
      i % 3 === 0 ? bagMat : dirtMat,
    );
    mound.position.set(bx, 0.22, bz);
    mound.rotation.y = a;
    mound.scale.set(1.3, 0.76, 1.15);
    mound.castShadow = true;
    mound.receiveShadow = true;
    group.add(mound);
  }
  return group;
}

/**
 * Desert Adobe Mud-Brick Compound: Flat crenellated parapet roof, protruding cedar vigas,
 * arched entryways, ochre plaster walls, and interior floor/cover.
 */
export function createDesertAdobeHouse(
  width: number,
  depth: number,
  wallHeight: number,
): THREE.Group {
  const group = new THREE.Group();
  const adobeMat = makePbrMat(0xd6b482, 0.9, 0.02, true);
  const trimSandMat = makePbrMat(0xb9915d, 0.92, 0.02, true);
  const cedarMat = makePbrMat(0x5c3c22, 0.82, 0.04, true);
  const stoneFloorMat = makePbrMat(0x8e7757, 0.94, 0.02, true);

  const wallT = 0.36;
  const hw = width * 0.5;
  const hd = depth * 0.5;
  const doorW = 1.75;
  const doorH = 2.4;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 1.4, depth + 0.3), trimSandMat);
  base.position.y = -0.45;
  base.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.2), stoneFloorMat);
  floor.position.y = 0.26;
  floor.receiveShadow = true;
  group.add(base, floor);

  // Back wall (-Z)
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, wallT), adobeMat);
  back.position.set(0, 0.25 + wallHeight * 0.5, -hd + wallT * 0.5);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  // Front wall (+Z) with wide door opening
  const frontSideW = Math.max(0.8, (width - doorW) * 0.5);
  for (const dir of [-1, 1]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(frontSideW, wallHeight, wallT), adobeMat);
    seg.position.set(dir * (doorW * 0.5 + frontSideW * 0.5), 0.25 + wallHeight * 0.5, hd - wallT * 0.5);
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
  }
  const lintelH = Math.max(0.45, wallHeight - doorH);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallT), adobeMat);
  lintel.position.set(0, 0.25 + doorH + lintelH * 0.5, hd - wallT * 0.5);
  const woodArch = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 0.22, wallT + 0.14), cedarMat);
  woodArch.position.set(0, 0.25 + doorH, hd - wallT * 0.5);
  group.add(lintel, woodArch);

  // Side walls with shooting windows
  const winW = 1.45;
  const sillH = 1.15;
  const winH = 1.15;
  const sideSegD = Math.max(0.7, (depth - winW) * 0.5);
  for (const sideX of [-hw + wallT * 0.5, hw - wallT * 0.5]) {
    for (const dirZ of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallHeight, sideSegD), adobeMat);
      seg.position.set(sideX, 0.25 + wallHeight * 0.5, dirZ * (winW * 0.5 + sideSegD * 0.5));
      seg.castShadow = true;
      seg.receiveShadow = true;
      group.add(seg);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wallT, sillH, winW), adobeMat);
    sill.position.set(sideX, 0.25 + sillH * 0.5, 0);
    const headerH = Math.max(0.4, wallHeight - (sillH + winH));
    const header = new THREE.Mesh(new THREE.BoxGeometry(wallT, headerH, winW), adobeMat);
    header.position.set(sideX, 0.25 + sillH + winH + headerH * 0.5, 0);
    group.add(sill, header);
  }

  // Flat Adobe Roof Slab + Crenellated Rooftop Parapet + Protruding Cedar Vigas
  const roofY = 0.25 + wallHeight;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.28, depth + 0.15), trimSandMat);
  roof.position.y = roofY;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  for (const gz of [-hd + 0.18, hd - 0.18]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.65, 0.3), adobeMat);
    p.position.set(0, roofY + 0.42, gz);
    p.castShadow = true;
    group.add(p);
  }
  for (const gx of [-hw + 0.18, hw - 0.18]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, depth), adobeMat);
    p.position.set(gx, roofY + 0.42, 0);
    p.castShadow = true;
    group.add(p);
  }
  // Corner buttress pillars & rooftop vigas
  for (const cx of [-hw, hw]) {
    for (const cz of [-hd, hd]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.48), trimSandMat);
      cap.position.set(cx, roofY + 0.52, cz);
      group.add(cap);
    }
  }
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, width + 0.9, 6), cedarMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, roofY - 0.16, i * (depth * 0.2));
    group.add(beam);
  }

  // Interior cover table
  const interiorBench = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.8), cedarMat);
  interiorBench.position.set(-hw * 0.32, 0.68, -hd * 0.3);
  interiorBench.castShadow = true;
  group.add(interiorBench);

  return group;
}

/**
 * Normandy Stone Church Ruin with enterable nave and towering broken bell spire landmark.
 */
export function createChurchBellRuin(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = makePbrMat(0x888379, 0.92, 0.04, true);
  const darkStoneMat = makePbrMat(0x5b574f, 0.94, 0.05, true);
  const slateMat = makePbrMat(0x3b424c, 0.72, 0.12, true);
  const oakMat = makePbrMat(0x4c3523, 0.82, 0.04, true);

  const w = 8.4;
  const d = 10.6;
  const h = 4.6;
  const wallT = 0.42;
  const hw = w * 0.5;
  const hd = d * 0.5;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 1.5, d + 0.5), darkStoneMat);
  plinth.position.y = -0.5;
  plinth.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.08, d - 0.2), stoneMat);
  floor.position.y = 0.25;
  floor.receiveShadow = true;
  group.add(plinth, floor);

  // Back wall (-Z) with tall Gothic window slit
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallT), stoneMat);
  back.position.set(0, 0.25 + h * 0.5, -hd + wallT * 0.5);
  back.castShadow = true;
  group.add(back);

  // Front entrance (+Z) with 2.2m wide stone portal
  const doorW = 2.2;
  const sideW = (w - doorW) * 0.5;
  for (const dir of [-1, 1]) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(sideW, h, wallT), stoneMat);
    seg.position.set(dir * (doorW * 0.5 + sideW * 0.5), 0.25 + h * 0.5, hd - wallT * 0.5);
    seg.castShadow = true;
    group.add(seg);
  }
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.4, wallT), stoneMat);
  archTop.position.set(0, 0.25 + h - 0.7, hd - wallT * 0.5);
  group.add(archTop);

  // Side walls with 2 window bays
  const winW = 1.6;
  const sideSegD = (d - winW) * 0.5;
  for (const sx of [-hw + wallT * 0.5, hw - wallT * 0.5]) {
    for (const dz of [-1, 1]) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(wallT, h, sideSegD), stoneMat);
      seg.position.set(sx, 0.25 + h * 0.5, dz * (winW * 0.5 + sideSegD * 0.5));
      seg.castShadow = true;
      group.add(seg);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wallT, 1.15, winW), stoneMat);
    sill.position.set(sx, 0.25 + 0.57, 0);
    group.add(sill);
  }

  // Tall Bell Tower on rear-right corner
  const tower = new THREE.Mesh(new THREE.BoxGeometry(3.1, 9.6, 3.1), stoneMat);
  tower.position.set(hw - 1.55, 4.9, -hd + 1.55);
  tower.castShadow = true;
  tower.receiveShadow = true;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.35, 3.6, 4), slateMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(hw - 1.55, 11.4, -hd + 1.55);
  spire.castShadow = true;
  group.add(tower, spire);

  // Exposed wooden nave roof rafters
  for (let i = -3; i <= 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.18, 0.22), oakMat);
    beam.position.set(0, 0.25 + h + 0.1, i * 1.35);
    beam.castShadow = true;
    group.add(beam);
  }
  const halfSlate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.2, d * 0.55), slateMat);
  halfSlate.position.set(-hw * 0.35, 0.25 + h + 0.9, -hd * 0.22);
  halfSlate.rotation.z = 0.48;
  halfSlate.castShadow = true;
  group.add(halfSlate);

  // Interior stone pews
  for (const pz of [-1.4, 1.2]) {
    const pew = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.6), oakMat);
    pew.position.set(-1.1, 0.68, pz);
    pew.castShadow = true;
    group.add(pew);
  }

  return group;
}

/**
 * Stalingrad Red-Brick Industrial Factory Hall with open drive-through bays,
 * tall brick smokestack, steel roof trusses, and interior machinery cover.
 */
export function createFactoryRuins(
  width: number,
  depth: number,
  wallHeight: number,
): THREE.Group {
  const group = new THREE.Group();
  const brickMat = makePbrMat(0x7c3e32, 0.9, 0.04, true);
  const sootMat = makePbrMat(0x3c3b3d, 0.94, 0.06, true);
  const ironMat = makePbrMat(0x2f353b, 0.48, 0.72, true);
  const floorMat = makePbrMat(0x4a4d50, 0.92, 0.08, true);

  const hw = width * 0.5;
  const hd = depth * 0.5;
  const wallT = 0.42;
  const doorW = 2.8;

  const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 1.4, depth + 0.4), sootMat);
  base.position.y = -0.45;
  base.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.2), floorMat);
  floor.position.y = 0.26;
  floor.receiveShadow = true;
  group.add(base, floor);

  // Open front & rear warehouse bay doors (+Z and -Z)
  const baySideW = Math.max(1.2, (width - doorW) * 0.5);
  for (const gz of [-hd + wallT * 0.5, hd - wallT * 0.5]) {
    for (const dir of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(baySideW, wallHeight, wallT), brickMat);
      wall.position.set(dir * (doorW * 0.5 + baySideW * 0.5), 0.25 + wallHeight * 0.5, gz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.35, wallT), sootMat);
    header.position.set(0, 0.25 + wallHeight - 0.67, gz);
    group.add(header);
  }

  // Side brick walls with large shattered factory windows
  const winW = 2.4;
  const sideSegD = Math.max(1.0, (depth - winW) * 0.5);
  for (const sx of [-hw + wallT * 0.5, hw - wallT * 0.5]) {
    for (const dz of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallHeight, sideSegD), brickMat);
      wall.position.set(sx, 0.25 + wallHeight * 0.5, dz * (winW * 0.5 + sideSegD * 0.5));
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(wallT, 1.15, winW), brickMat);
    sill.position.set(sx, 0.25 + 0.57, 0);
    group.add(sill);
  }

  // Steel sawtooth truss girders across roof
  for (let z = -hd + 1.2; z <= hd - 1.2; z += 2.2) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.24, 0.22), ironMat);
    truss.position.set(0, 0.25 + wallHeight + 0.12, z);
    truss.castShadow = true;
    group.add(truss);
  }
  const halfRoof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.2, depth * 0.48), ironMat);
  halfRoof.position.set(0, 0.25 + wallHeight + 0.45, -hd * 0.46);
  halfRoof.rotation.x = 0.16;
  halfRoof.castShadow = true;
  group.add(halfRoof);

  // Towering 13.5m industrial smokestack chimney
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 1.05, 13.5, 10), brickMat);
  stack.position.set(-hw + 1.15, 6.9, -hd + 1.15);
  stack.castShadow = true;
  const sootRing = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.72, 1.4, 10), sootMat);
  sootRing.position.set(-hw + 1.15, 13.1, -hd + 1.15);
  group.add(stack, sootRing);

  // Heavy industrial lathe / machinery block inside factory
  const machine = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 1.3), ironMat);
  machine.position.set(-hw * 0.36, 0.85, 0);
  machine.castShadow = true;
  group.add(machine);

  return group;
}

/**
 * Map-distinct vehicle wreck cover: burnt WWII armor tank or Stalingrad streetcar tram.
 */
export function createWreckedVehicle(variant: 'tank' | 'tram'): THREE.Group {
  const group = new THREE.Group();
  const rustSteelMat = makePbrMat(variant === 'tank' ? 0x5c5346 : 0x5d302c, 0.74, 0.55, true);
  const sootMat = makePbrMat(0x282726, 0.86, 0.3, true);

  if (variant === 'tank') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.15, 5.2), rustSteelMat);
    hull.position.y = 0.55;
    hull.castShadow = true;
    hull.receiveShadow = true;
    for (const tx of [-1.45, 1.45]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 5.4), sootMat);
      track.position.set(tx, 0.35, 0);
      track.castShadow = true;
      group.add(track);
    }
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.32, 0.82, 8), rustSteelMat);
    turret.position.set(0, 1.48, 0.25);
    turret.rotation.y = 0.45;
    turret.castShadow = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.2, 8), sootMat);
    barrel.rotation.x = Math.PI / 2 - 0.18;
    barrel.position.set(-0.65, 1.65, 2.1);
    barrel.rotation.y = 0.45;
    barrel.castShadow = true;
    group.add(hull, turret, barrel);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.1, 7.6), rustSteelMat);
    body.position.y = 1.2;
    body.castShadow = true;
    body.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 7.8), sootMat);
    roof.position.y = 2.38;
    roof.castShadow = true;
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 6.2), sootMat);
    bogie.position.y = 0.18;
    group.add(body, roof, bogie);
  }

  return group;
}

export interface MilitaryJeepRig {
  root: THREE.Group;
  chassis: THREE.Group;
  turret: THREE.Group;
  gun: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Object3D;
  wheels: THREE.Object3D[];
  driverMesh: THREE.Group;
}

export function createMilitaryJeep(team: Team): MilitaryJeepRig {
  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);

  const isAllies = team === 'allies';
  const paintMat = makePbrMat(isAllies ? 0x4b5d3b : 0x5d5b54, 0.65, 0.24, true);
  const darkTrimMat = makePbrMat(0x27292c, 0.5, 0.65, true);
  const glassMat = makePbrMat(0x3a5468, 0.15, 0.3, false, { transparent: true, opacity: 0.72 });
  const tireMat = makePbrMat(0x1b1d1f, 0.88, 0.06, true);
  const rimMat = makePbrMat(isAllies ? 0x3b4831 : 0x484640, 0.52, 0.45, true);
  const seatMat = makePbrMat(0x4f3d28, 0.82, 0.05);
  const accentMat = makePbrMat(isAllies ? 0x2563eb : 0xb91c1c, 0.55, 0.2, true);

  // Lower hull + sloped hood + front grille + fenders
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 4.3), paintMat);
  lowerHull.position.set(0, 0.76, 0);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 1.48), paintMat);
  hood.position.set(0, 1.15, 1.38);
  hood.rotation.x = 0.04;
  hood.castShadow = true;

  for (const fx of [-1.06, 1.06]) {
    const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 1.15), paintMat);
    frontFender.position.set(fx, 1.08, 1.38);
    const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 1.15), paintMat);
    rearFender.position.set(fx, 1.08, -1.32);
    chassis.add(frontFender, rearFender);
  }

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.22, 0.26), darkTrimMat);
  bumper.position.set(0, 0.6, 2.26);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 0.1), darkTrimMat);
  grille.position.set(0, 1.12, 2.13);

  for (const hx of [-0.72, 0.72]) {
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8),
      makePbrMat(0xfef08a, 0.2, 0.1, false, { emissive: 0xfacc15, emissiveIntensity: 0.45 }),
    );
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(hx, 1.12, 2.14);
    chassis.add(headlight);
  }

  // Windshield frame + armored side doors + roll bars + interior seats & steering column
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.64, 0.07), glassMat);
  windshield.position.set(0, 1.64, 0.56);
  windshield.rotation.x = -0.22;

  for (const sx of [-1.02, 1.02]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 1.85), paintMat);
    door.position.set(sx, 1.26, -0.35);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), darkTrimMat);
    pillar.position.set(sx * 0.94, 1.84, -0.95);
    chassis.add(door, pillar);
  }

  // Seats & steering wheel
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.12), seatMat);
  seatBack.position.set(-0.36, 1.32, -0.62);
  const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.65, 8), darkTrimMat);
  steerCol.rotation.x = 0.62;
  steerCol.position.set(-0.36, 1.32, 0.15);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 14), darkTrimMat);
  steerWheel.rotation.x = 0.62;
  steerWheel.position.set(-0.36, 1.54, 0.02);
  chassis.add(seatBack, steerCol, steerWheel);

  const driverMesh = buildSeatedSoldierMesh(team, false);
  driverMesh.position.set(-0.36, 0.96, -0.35);
  chassis.add(driverMesh);

  const topRollBar = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.12, 0.14), darkTrimMat);
  topRollBar.position.set(0, 2.36, -0.95);
  const teamStripe = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.55), accentMat);
  teamStripe.position.set(0, 1.44, 1.38);

  const rearCrate = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 0.95), paintMat);
  rearCrate.position.set(0, 1.23, -1.58);
  const spareWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 12), tireMat);
  spareWheel.rotation.x = Math.PI / 2;
  spareWheel.position.set(0, 1.05, -2.26);

  chassis.add(lowerHull, hood, bumper, grille, windshield, topRollBar, teamStripe, rearCrate, spareWheel);

  // 4 detailed off-road wheels (tire + recessed rim + hub lugs)
  const wheels: THREE.Object3D[] = [];
  for (const [wx, wz] of [
    [-1.18, 1.38],
    [1.18, 1.38],
    [-1.18, -1.32],
    [1.18, -1.32],
  ] as const) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, 0.48, wz);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.34, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 10), rimMat);
    rim.rotation.z = Math.PI / 2;

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.39, 8), darkTrimMat);
    hub.rotation.z = Math.PI / 2;

    wheelGroup.add(tire, rim, hub);
    chassis.add(wheelGroup);
    wheels.push(wheelGroup);
  }

  // Roof-mounted heavy MG turret
  const turret = new THREE.Group();
  turret.position.set(0, 2.42, -0.55);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.14, 12), darkTrimMat);
  const gun = new THREE.Group();
  gun.position.set(0, 0.25, 0);
  const mgBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.85), darkTrimMat);
  const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.15, 8), darkTrimMat);
  mgBarrel.rotation.x = Math.PI / 2;
  mgBarrel.position.set(0, 0.04, 0.92);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.06), paintMat);
  shield.position.set(0, 0.14, 0.48);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.04, 1.54);
  const muzzleFlash = createRealisticMuzzleFlash(1.35);
  muzzleFlash.position.copy(muzzlePoint.position);

  gun.add(mgBody, mgBarrel, shield, muzzlePoint, muzzleFlash);
  turret.add(ring, gun);
  chassis.add(turret);

  return { root, chassis, turret, gun, muzzlePoint, muzzleFlash, wheels, driverMesh };
}

export interface BattleTankRig {
  root: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  gun: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Object3D;
  wheels: THREE.Object3D[];
  driverMesh: THREE.Group;
}

export function createBattleTank(team: Team): BattleTankRig {
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);

  const isAllies = team === 'allies';
  const armorMat = makePbrMat(isAllies ? 0x46573b : 0x545759, 0.62, 0.38, true);
  const darkSteelMat = makePbrMat(0x23272b, 0.48, 0.72, true);
  const trackMat = makePbrMat(0x1b1b1d, 0.88, 0.22, true);
  const accentMat = makePbrMat(isAllies ? 0x2563eb : 0xdc2626, 0.5, 0.2, true);

  // Heavy armored lower chassis + sloped glacis plate
  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.96, 5.5), armorMat);
  mainHull.position.set(0, 0.96, 0);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;

  const frontGlacis = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.62, 1.35), armorMat);
  frontGlacis.position.set(0, 1.08, 2.75);
  frontGlacis.rotation.x = 0.48;
  frontGlacis.castShadow = true;

  const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 1.85), darkSteelMat);
  engineDeck.position.set(0, 1.52, -1.75);

  const emblem = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.55), accentMat);
  emblem.position.set(0, 1.48, 2.1);

  hull.add(mainHull, frontGlacis, engineDeck, emblem);

  // Extruded continuous wrap-around caterpillar track belt + armored track skirts + 5 road wheels per side
  const trackLoopGeo = createExtrudedProfile(
    [
      [-2.75, 0.14],
      [2.75, 0.14],
      [3.12, 0.65],
      [2.82, 1.02],
      [-2.82, 1.02],
      [-3.12, 0.65],
    ],
    0.72,
    0.03,
  );

  const wheels: THREE.Object3D[] = [];
  for (const sx of [-1.72, 1.72]) {
    const trackBelt = new THREE.Mesh(trackLoopGeo, trackMat);
    trackBelt.position.set(sx, 0, 0);
    trackBelt.castShadow = true;
    hull.add(trackBelt);

    // Armored side skirt over upper track run
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 6.1), armorMat);
    skirt.position.set(sx + (sx < 0 ? -0.38 : 0.38), 0.92, 0);
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 6.15), armorMat);
    fender.position.set(sx, 1.12, 0);
    hull.add(skirt, fender);

    for (let w = 0; w < 5; w++) {
      const wz = -2.2 + w * 1.1;
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(sx, 0.42, wz);
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.78, 12), darkSteelMat);
      outer.rotation.z = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.82, 8), armorMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(outer, hub);
      hull.add(wheelGroup);
      wheels.push(wheelGroup);
    }
  }

  // Rotating turret + commander cupola with visible commander + 105mm main gun with bore evacuator
  const turret = new THREE.Group();
  turret.position.set(0, 1.62, 0.25);

  const turretBody = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.48, 0.88, 10), armorMat);
  turretBody.position.y = 0.35;
  turretBody.castShadow = true;

  const bustle = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.68, 1.15), armorMat);
  bustle.position.set(0, 0.38, -1.25);
  bustle.castShadow = true;

  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.32, 10), darkSteelMat);
  cupola.position.set(-0.45, 0.9, -0.32);

  const driverMesh = buildSeatedSoldierMesh(team, false);
  driverMesh.position.set(-0.45, 0.68, -0.32);
  turret.add(driverMesh);

  const gun = new THREE.Group();
  gun.position.set(0, 0.4, 1.15);

  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.5, 0.58), darkSteelMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.14, 3.65, 12), armorMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 1.95);
  barrel.castShadow = true;

  const boreEvacuator = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.55, 12), armorMat);
  boreEvacuator.rotation.x = Math.PI / 2;
  boreEvacuator.position.set(0, 0, 1.75);

  const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.42), darkSteelMat);
  muzzleBrake.position.set(0, 0, 3.82);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0, 4.12);
  const muzzleFlash = createRealisticMuzzleFlash(2.8);
  muzzleFlash.position.copy(muzzlePoint.position);

  gun.add(mantlet, barrel, boreEvacuator, muzzleBrake, muzzlePoint, muzzleFlash);
  turret.add(turretBody, bustle, cupola, gun);
  hull.add(turret);

  return { root, hull, turret, gun, muzzlePoint, muzzleFlash, wheels, driverMesh };
}

export interface CombatAircraftRig {
  root: THREE.Group;
  airframe: THREE.Group;
  propeller: THREE.Group;
  muzzleL: THREE.Object3D;
  muzzleR: THREE.Object3D;
  muzzleFlashL: THREE.Object3D;
  muzzleFlashR: THREE.Object3D;
  pilotMesh: THREE.Group;
}

export function createCombatAircraft(team: Team): CombatAircraftRig {
  const root = new THREE.Group();
  const airframe = new THREE.Group();
  root.add(airframe);

  const isAllies = team === 'allies';
  const bodyMat = makePbrMat(isAllies ? 0x56684f : 0x595e66, 0.44, 0.55, true);
  const underMat = makePbrMat(0x9ca3af, 0.5, 0.4, true);
  const canopyMat = makePbrMat(0x284d6b, 0.08, 0.3, false, { transparent: true, opacity: 0.58 });
  const darkMetal = makePbrMat(0x1f2429, 0.4, 0.8, true);
  const wingStripeMat = makePbrMat(isAllies ? 0x2563eb : 0xdc2626, 0.5, 0.2, true);

  // Streamlined tapered fighter fuselage (forward along +Z)
  const fuselage = new THREE.Mesh(
    createLatheBarrel([
      [0.12, -3.9],
      [0.44, -2.2],
      [0.62, 0.0],
      [0.64, 1.8],
      [0.54, 3.2],
      [0.34, 3.85],
    ]),
    bodyMat,
  );
  fuselage.rotation.y = Math.PI;
  fuselage.castShadow = true;

  // Transparent canopy frame + visible pilot seated inside cockpit
  const canopy = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.45, 5, 10), canopyMat);
  canopy.rotation.x = Math.PI / 2;
  canopy.position.set(0, 0.56, 0.35);

  const pilotMesh = buildSeatedSoldierMesh(team, true);
  pilotMesh.position.set(0, 0.22, 0.35);
  airframe.add(pilotMesh);

  // Swept tapered extruded main wings (left & right swept back smoothly from root to wingtip)
  const buildSweptWing = (side: -1 | 1) => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.65);
    s.lineTo(side * 5.65, 0.35);
    s.lineTo(side * 5.65, -0.65);
    s.lineTo(0, -0.75);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  };
  const leftWing = new THREE.Mesh(buildSweptWing(-1), bodyMat);
  leftWing.position.set(-0.35, -0.1, 0.45);
  leftWing.castShadow = true;
  const rightWing = new THREE.Mesh(buildSweptWing(1), bodyMat);
  rightWing.position.set(0.35, -0.1, 0.45);
  rightWing.castShadow = true;

  for (const wx of [-4.1, 4.1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 1.15), wingStripeMat);
    stripe.position.set(wx, -0.02, 0.4);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.4, 8), darkMetal);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(wx * 0.62, -0.25, 0.65);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.25, 8), darkMetal);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(wx * 0.58, -0.08, 1.42);
    airframe.add(stripe, pod, cannon);
  }

  // Landing skids under wings & nose for airfield parking
  for (const gx of [-1.45, 1.45]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 6), darkMetal);
    strut.position.set(gx, -0.52, 0.85);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), darkMetal);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(gx, -0.88, 0.85);
    airframe.add(strut, wheel);
  }

  // Swept horizontal tailplane & vertical rudder fin
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.95), underMat);
  tailWing.position.set(0, 0.1, -3.25);
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 1.25), wingStripeMat);
  rudder.position.set(0, 0.72, -3.25);
  rudder.rotation.x = -0.24;

  // Spinning nose spinner + 3 propeller blades
  const propeller = new THREE.Group();
  propeller.position.set(0, 0, 3.92);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.68, 10), wingStripeMat);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.25;
  propeller.add(spinner);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.38, 0.05), darkMetal);
    blade.rotation.z = (b * Math.PI * 2) / 3;
    blade.position.set(
      Math.cos((b * Math.PI * 2) / 3 + Math.PI / 2) * 0.68,
      Math.sin((b * Math.PI * 2) / 3 + Math.PI / 2) * 0.68,
      0,
    );
    propeller.add(blade);
  }

  const muzzleL = new THREE.Object3D();
  muzzleL.position.set(-2.38, -0.08, 2.1);
  const muzzleR = new THREE.Object3D();
  muzzleR.position.set(2.38, -0.08, 2.1);

  const muzzleFlashL = createRealisticMuzzleFlash(1.35);
  muzzleFlashL.position.copy(muzzleL.position);
  const muzzleFlashR = createRealisticMuzzleFlash(1.35);
  muzzleFlashR.position.copy(muzzleR.position);

  airframe.add(
    fuselage,
    canopy,
    leftWing,
    rightWing,
    tailWing,
    rudder,
    propeller,
    muzzleL,
    muzzleR,
    muzzleFlashL,
    muzzleFlashR,
  );
  return {
    root,
    airframe,
    propeller,
    muzzleL,
    muzzleR,
    muzzleFlashL,
    muzzleFlashR,
    pilotMesh,
  };
}


