import * as THREE from 'three';
import { getGunmetalPbrSet, getPolymerPbrSet } from './pbrTextures';
import type {
  GripAttachmentId,
  MagazineAttachmentId,
  OpticAttachmentId,
  RailAttachmentId,
  StockAttachmentId,
  Team,
  WeaponId,
} from './types';

function pbr(
  color: number,
  roughness = 0.45,
  metalness = 0.45,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  const isTransparent = Boolean(extra.transparent || extra.emissive);
  const texSet =
    isTransparent || typeof document === 'undefined'
      ? null
      : metalness >= 0.45
        ? getGunmetalPbrSet()
        : getPolymerPbrSet();
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: false,
    ...(texSet
      ? {
          bumpMap: texSet.bumpMap,
          bumpScale: metalness >= 0.45 ? 0.0025 : 0.003,
          roughnessMap: texSet.roughnessMap,
        }
      : {}),
    ...extra,
  });
}

function makeExtruded(
  pts: Array<[number, number]>,
  thickness: number,
  bevel = 0.0025,
): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  g.translate(0, 0, -thickness / 2);
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function makeLathe(profile: Array<[number, number]>, segs = 14): THREE.LatheGeometry {
  const vecs = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(vecs, segs);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export interface WeaponMountAnchors {
  opticPos: THREE.Vector3;
  stockPos: THREE.Vector3;
  gripPos: THREE.Vector3;
  railPos: THREE.Vector3;
  magPos: THREE.Vector3;
  muzzlePos: THREE.Vector3;
  receiverTopY: number;
}

export function getWeaponMountAnchors(weaponId: WeaponId): WeaponMountAnchors {
  switch (weaponId) {
    case 'ak47':
      return {
        opticPos: new THREE.Vector3(0, 0.056, -0.045),
        stockPos: new THREE.Vector3(0, 0.012, 0.095),
        gripPos: new THREE.Vector3(0, -0.014, -0.28),
        railPos: new THREE.Vector3(0.024, 0.022, -0.29),
        magPos: new THREE.Vector3(0, -0.005, -0.16),
        muzzlePos: new THREE.Vector3(0, 0.022, -0.81),
        receiverTopY: 0.056,
      };
    case 'm4a1':
      return {
        opticPos: new THREE.Vector3(0, 0.056, -0.035),
        stockPos: new THREE.Vector3(0, 0.014, 0.092),
        gripPos: new THREE.Vector3(0, -0.008, -0.285),
        railPos: new THREE.Vector3(0.024, 0.024, -0.3),
        magPos: new THREE.Vector3(0, -0.005, -0.155),
        muzzlePos: new THREE.Vector3(0, 0.024, -0.78),
        receiverTopY: 0.056,
      };
    case 'stg44':
      return {
        opticPos: new THREE.Vector3(0, 0.052, -0.05),
        stockPos: new THREE.Vector3(0, 0.014, 0.08),
        gripPos: new THREE.Vector3(0, 0.002, -0.34),
        railPos: new THREE.Vector3(0.022, 0.024, -0.35),
        magPos: new THREE.Vector3(0, -0.005, -0.18),
        muzzlePos: new THREE.Vector3(0, 0.026, -0.72),
        receiverTopY: 0.052,
      };
    case 'bar':
      return {
        opticPos: new THREE.Vector3(0, 0.058, -0.05),
        stockPos: new THREE.Vector3(0, 0.005, 0.08),
        gripPos: new THREE.Vector3(0, -0.026, -0.31),
        railPos: new THREE.Vector3(0.026, 0.012, -0.32),
        magPos: new THREE.Vector3(0, -0.005, -0.11),
        muzzlePos: new THREE.Vector3(0, 0.036, -0.77),
        receiverTopY: 0.058,
      };
    case 'thompson':
      return {
        opticPos: new THREE.Vector3(0, 0.054, -0.05),
        stockPos: new THREE.Vector3(0, 0.002, 0.08),
        gripPos: new THREE.Vector3(0, -0.022, -0.31),
        railPos: new THREE.Vector3(0.024, 0.022, -0.31),
        magPos: new THREE.Vector3(0, -0.002, -0.19),
        muzzlePos: new THREE.Vector3(0, 0.032, -0.61),
        receiverTopY: 0.054,
      };
    case 'mp40':
      return {
        opticPos: new THREE.Vector3(0, 0.052, -0.05),
        stockPos: new THREE.Vector3(0, 0.012, 0.08),
        gripPos: new THREE.Vector3(0, -0.022, -0.34),
        railPos: new THREE.Vector3(0.022, 0.024, -0.35),
        magPos: new THREE.Vector3(0, -0.028, -0.21),
        muzzlePos: new THREE.Vector3(0, 0.028, -0.59),
        receiverTopY: 0.052,
      };
    case 'ppsh41':
      return {
        opticPos: new THREE.Vector3(0, 0.05, -0.05),
        stockPos: new THREE.Vector3(0, 0.006, 0.085),
        gripPos: new THREE.Vector3(0, 0.01, -0.34),
        railPos: new THREE.Vector3(0.022, 0.032, -0.35),
        magPos: new THREE.Vector3(0, -0.004, -0.2),
        muzzlePos: new THREE.Vector3(0, 0.032, -0.59),
        receiverTopY: 0.05,
      };
    case 'm1_garand':
    case 'kar98k':
    case 'springfield':
      return {
        opticPos: new THREE.Vector3(0, 0.056, -0.07),
        stockPos: new THREE.Vector3(0, 0.008, 0.08),
        gripPos: new THREE.Vector3(0, -0.002, -0.33),
        railPos: new THREE.Vector3(0.022, 0.028, -0.34),
        magPos: new THREE.Vector3(0, -0.005, -0.09),
        muzzlePos: new THREE.Vector3(0, 0.036, weaponId === 'springfield' ? -0.89 : -0.83),
        receiverTopY: 0.056,
      };
    case 'm1911':
      return {
        opticPos: new THREE.Vector3(0, 0.044, -0.03),
        stockPos: new THREE.Vector3(0, 0, 0.08),
        gripPos: new THREE.Vector3(0, -0.01, -0.1),
        railPos: new THREE.Vector3(0, 0.002, -0.11),
        magPos: new THREE.Vector3(0, -0.05, 0.052),
        muzzlePos: new THREE.Vector3(0, 0.026, -0.195),
        receiverTopY: 0.044,
      };
    case 'rpg7':
      return {
        opticPos: new THREE.Vector3(-0.075, 0.06, -0.12),
        stockPos: new THREE.Vector3(0, 0, 0.2),
        gripPos: new THREE.Vector3(0, -0.06, -0.2),
        railPos: new THREE.Vector3(0, 0.02, -0.2),
        magPos: new THREE.Vector3(0, 0, -0.7),
        muzzlePos: new THREE.Vector3(0, 0.022, -0.96),
        receiverTopY: 0.06,
      };
    default:
      return {
        opticPos: new THREE.Vector3(-0.082, 0.058, -0.1),
        stockPos: new THREE.Vector3(0, 0, 0.2),
        gripPos: new THREE.Vector3(0, -0.06, -0.2),
        railPos: new THREE.Vector3(0, 0.02, -0.2),
        magPos: new THREE.Vector3(0, 0, -0.7),
        muzzlePos: new THREE.Vector3(0, 0.02, -0.9),
        receiverTopY: 0.058,
      };
  }
}

export function buildOptic3D(
  opticId: OpticAttachmentId,
): { group: THREE.Group; lensCenterLocalY: number } {
  const group = new THREE.Group();
  if (opticId === 'iron') {
    return { group, lensCenterLocalY: 0.012 };
  }

  const bodyMat = pbr(0x1b1e23, 0.36, 0.84);
  const darkClampMat = pbr(0x111317, 0.44, 0.78);
  const brassDialMat = pbr(0xa88b43, 0.28, 0.86);
  const glassMat = pbr(0x1b5c82, 0.06, 0.15, {
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    emissive: 0x0b2a42,
    emissiveIntensity: 0.28,
  });
  const redDotEmit = new THREE.MeshBasicMaterial({ color: 0xff2b2b });
  const greenDotEmit = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const fiberMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Picatinny Rail Mount Base
  const railBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.007, 0.062), darkClampMat);
  railBase.position.set(0, 0.0035, 0);
  group.add(railBase);

  if (opticId === 'red_dot') {
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.011, 0.044), darkClampMat);
    riser.position.set(0, 0.012, 0);
    const frameArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.0155, 0.0024, 6, 16, Math.PI * 1.18),
      bodyMat,
    );
    frameArch.rotation.z = -Math.PI * 0.09;
    frameArch.position.set(0, 0.027, -0.004);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 14), glassMat);
    lens.position.set(0, 0.028, -0.005);
    const reticleDot = new THREE.Mesh(new THREE.SphereGeometry(0.001, 6, 6), redDotEmit);
    reticleDot.position.set(0, 0.028, -0.006);
    group.add(riser, frameArch, lens, reticleDot);
    return { group, lensCenterLocalY: 0.028 };
  }

  if (opticId === 'holo') {
    // True hollow EOTech-style hood with clear central sight window
    const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.006, 0.072), darkClampMat);
    floorDeck.position.set(0, 0.01, 0);
    const batteryPod = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.028), darkClampMat);
    batteryPod.position.set(0, 0.012, -0.024);
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.026, 0.056), bodyMat);
    wallL.position.set(-0.016, 0.026, 0.004);
    const wallR = wallL.clone();
    wallR.position.x = 0.016;
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0035, 0.056), bodyMat);
    roofPlate.position.set(0, 0.039, 0.004);
    const lensFront = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.022), glassMat);
    lensFront.position.set(0, 0.026, -0.022);
    lensFront.rotation.y = Math.PI;
    const lensRear = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.022), glassMat);
    lensRear.position.set(0, 0.026, 0.03);
    const holoDot = new THREE.Mesh(new THREE.SphereGeometry(0.001, 6, 6), redDotEmit);
    holoDot.position.set(0, 0.026, 0.002);
    group.add(floorDeck, batteryPod, wallL, wallR, roofPlate, lensFront, lensRear, holoDot);
    return { group, lensCenterLocalY: 0.026 };
  }

  if (opticId === 'optic_2x') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.05), darkClampMat);
    mount.position.set(0, 0.015, 0);
    const tube = new THREE.Mesh(
      makeLathe([
        [0.017, -0.04],
        [0.015, -0.015],
        [0.015, 0.015],
        [0.019, 0.042],
      ]),
      bodyMat,
    );
    tube.position.set(0, 0.032, 0);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 8), darkClampMat);
    turret.position.set(0, 0.048, 0);
    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.014, 14), glassMat);
    lensR.position.set(0, 0.032, 0.041);
    group.add(mount, tube, turret, lensR);
    return { group, lensCenterLocalY: 0.032 };
  }

  if (opticId === 'optic_3x') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.06), darkClampMat);
    mount.position.set(0, 0.016, 0);
    const tube = new THREE.Mesh(
      makeLathe([
        [0.018, -0.055],
        [0.015, -0.02],
        [0.015, 0.02],
        [0.021, 0.058],
      ]),
      bodyMat,
    );
    tube.position.set(0, 0.034, 0);
    const sideDial = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.014, 8), darkClampMat);
    sideDial.rotation.z = Math.PI / 2;
    sideDial.position.set(0.018, 0.034, 0);
    const topDial = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 8), darkClampMat);
    topDial.position.set(0, 0.051, 0);
    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.015, 14), glassMat);
    lensR.position.set(0, 0.034, 0.056);
    group.add(mount, tube, sideDial, topDial, lensR);
    return { group, lensCenterLocalY: 0.034 };
  }

  if (opticId === 'scope_4x') {
    // Classic ACOG prism housing + top red fiber tube
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.016, 0.068), darkClampMat);
    riser.position.set(0, 0.015, 0);
    const prismBody = new THREE.Mesh(
      makeLathe([
        [0.018, -0.072],
        [0.016, -0.025],
        [0.016, 0.025],
        [0.024, 0.068],
        [0.024, 0.078],
      ]),
      bodyMat,
    );
    prismBody.position.set(0, 0.035, 0);
    const fiberPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.055, 8), fiberMat);
    fiberPipe.rotation.x = Math.PI / 2;
    fiberPipe.position.set(0, 0.054, -0.022);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.028), darkClampMat);
    boss.position.set(0, 0.035, 0);
    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.016, 14), glassMat);
    lensR.position.set(0, 0.035, 0.073);
    group.add(riser, prismBody, fiberPipe, boss, lensR);
    return { group, lensCenterLocalY: 0.035 };
  }

  // 6x or 8x Precision Sniper Telescope
  const is8x = opticId === 'scope_8x';
  const lenHalf = is8x ? 0.14 : 0.11;
  const bellRadius = is8x ? 0.027 : 0.023;
  const tube = new THREE.Mesh(
    makeLathe([
      [0.019, -lenHalf],
      [0.019, -lenHalf * 0.55],
      [0.014, -lenHalf * 0.3],
      [0.014, lenHalf * 0.35],
      [bellRadius, lenHalf * 0.65],
      [bellRadius, lenHalf],
    ]),
    bodyMat,
  );
  tube.position.set(0, 0.036, -0.01);

  for (const rz of [-0.045, 0.035]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.018, 12), darkClampMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.036, rz);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.024, 0.016), darkClampMat);
    stem.position.set(0, 0.018, rz);
    group.add(ring, stem);
  }
  const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 10), brassDialMat);
  elevTurret.position.set(0, 0.054, -0.005);
  const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 10), brassDialMat);
  windTurret.rotation.z = Math.PI / 2;
  windTurret.position.set(0.02, 0.036, -0.005);

  if (is8x) {
    const sunshadeCap = new THREE.Mesh(
      new THREE.CylinderGeometry(bellRadius, bellRadius, 0.008, 12),
      darkClampMat,
    );
    sunshadeCap.position.set(0, 0.068, -lenHalf - 0.008);
    sunshadeCap.rotation.x = -0.35;
    const parallaxDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), greenDotEmit);
    parallaxDot.position.set(-0.017, 0.036, -0.005);
    group.add(sunshadeCap, parallaxDot);
  }

  const lensRear = new THREE.Mesh(new THREE.CircleGeometry(0.017, 14), glassMat);
  lensRear.position.set(0, 0.036, lenHalf - 0.011);
  const lensFront = new THREE.Mesh(new THREE.CircleGeometry(bellRadius - 0.003, 14), glassMat);
  lensFront.position.set(0, 0.036, -lenHalf - 0.009);
  lensFront.rotation.y = Math.PI;
  group.add(tube, elevTurret, windTurret, lensRear, lensFront);

  return { group, lensCenterLocalY: 0.036 };
}

export function buildStock3D(stockId: StockAttachmentId): THREE.Group {
  const group = new THREE.Group();
  if (stockId === 'standard') return group;

  const polymerMat = pbr(0x23262b, 0.62, 0.16);
  const metalMat = pbr(0x1b1e23, 0.38, 0.82);
  const rubberMat = pbr(0x141518, 0.9, 0.05);

  if (stockId === 'adjustable') {
    const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.23, 10), metalMat);
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, 0.006, 0.115);

    const body = new THREE.Mesh(
      makeExtruded([
        [0.06, 0.022],
        [0.25, 0.018],
        [0.25, -0.092],
        [0.14, -0.072],
        [0.06, -0.025],
      ], 0.038),
      polymerMat,
    );
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.105, 0.014), rubberMat);
    pad.position.set(0, -0.038, 0.256);
    group.add(bufferTube, body, pad);
    return group;
  }

  if (stockId === 'compact') {
    // Minimalist PDW twin-rod steel collapsing stock
    for (const sx of [-0.019, 0.019]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.21, 8), metalMat);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(sx, 0.002, 0.105);
      group.add(rod);
    }
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.088, 0.016), rubberMat);
    rearPlate.position.set(0, -0.02, 0.215);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.038, 0.03), metalMat);
    collar.position.set(0, 0.004, 0.015);
    group.add(rearPlate, collar);
    return group;
  }

  if (stockId === 'heavy') {
    const heavyFrame = new THREE.Mesh(
      makeExtruded([
        [0.0, 0.024],
        [0.27, 0.022],
        [0.27, -0.105],
        [0.1, -0.085],
        [0.0, -0.028],
      ], 0.044),
      polymerMat,
    );
    const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.022, 0.13), rubberMat);
    cheekRiser.position.set(0, 0.032, 0.15);
    const heavyPad = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.125, 0.018), rubberMat);
    heavyPad.position.set(0, -0.042, 0.276);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), metalMat);
    dial.rotation.z = Math.PI / 2;
    dial.position.set(0, -0.045, 0.19);
    group.add(heavyFrame, cheekRiser, heavyPad, dial);
    return group;
  }

  // Tactical modular frame stock
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), metalMat);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0.008, 0.12);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.026, 0.2), polymerMat);
  frameTop.position.set(0, 0.01, 0.15);
  const strut = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.095, 0.024), polymerMat);
  strut.position.set(0, -0.04, 0.235);
  const diag = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.17), polymerMat);
  diag.position.set(0, -0.04, 0.15);
  diag.rotation.x = 0.52;
  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.105, 0.014), rubberMat);
  butt.position.set(0, -0.04, 0.255);
  group.add(tube, frameTop, strut, diag, butt);
  return group;
}

export function buildGrip3D(gripId: GripAttachmentId): THREE.Group {
  const group = new THREE.Group();
  if (gripId === 'standard') return group;

  const polymerMat = pbr(0x202227, 0.65, 0.15);
  const clampMat = pbr(0x131519, 0.45, 0.78);

  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.042), clampMat);
  clamp.position.set(0, -0.005, 0);
  group.add(clamp);

  if (gripId === 'vertical') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.088, 10), polymerMat);
    shaft.position.set(0, -0.052, 0);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.014, 10), clampMat);
    collar.position.set(0, -0.016, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.012, 10), clampMat);
    cap.position.set(0, -0.098, 0);
    group.add(shaft, collar, cap);
    return group;
  }

  if (gripId === 'angled') {
    const body = new THREE.Mesh(
      makeExtruded([
        [-0.045, -0.008],
        [0.045, -0.008],
        [0.032, -0.042],
        [-0.012, -0.022],
      ], 0.026),
      polymerMat,
    );
    group.add(body);
    return group;
  }

  // Compact handstop
  const stop = new THREE.Mesh(
    makeExtruded([
      [-0.022, -0.006],
      [0.024, -0.006],
      [0.028, -0.036],
      [0.008, -0.034],
      [-0.014, -0.018],
    ], 0.024),
    polymerMat,
  );
  group.add(stop);
  return group;
}

export function buildSuppressor3D(): THREE.Group {
  const group = new THREE.Group();
  const canMat = pbr(0x1b1d21, 0.36, 0.84);
  const collarMat = pbr(0x2d3138, 0.44, 0.8);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.026, 12), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0, -0.013);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0195, 0.0195, 0.145, 14), canMat);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0, -0.095);

  const bore = new THREE.Mesh(
    new THREE.CircleGeometry(0.0065, 10),
    new THREE.MeshBasicMaterial({ color: 0x050505 }),
  );
  bore.position.set(0, 0, -0.168);
  bore.rotation.y = Math.PI;

  group.add(collar, body, bore);
  return group;
}

export function buildRailAccessory3D(railId: RailAttachmentId): THREE.Group {
  const group = new THREE.Group();
  if (railId === 'none') return group;

  const bodyMat = pbr(0x1b1e23, 0.42, 0.78);
  const polymerMat = pbr(0x282b30, 0.72, 0.14);

  if (railId === 'flashlight') {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.014, 0.036), bodyMat);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.095, 10), bodyMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.014, 0, -0.01);
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 0.02, 10), bodyMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(0.014, 0, -0.062);
    const bulb = new THREE.Mesh(
      new THREE.CircleGeometry(0.011, 10),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 }),
    );
    bulb.position.set(0.014, 0, -0.073);
    bulb.rotation.y = Math.PI;
    group.add(mount, tube, bezel, bulb);
    return group;
  }

  if (railId === 'laser') {
    // PEQ-15 tactical laser module
    const peq = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.022, 0.072), polymerMat);
    peq.position.set(0.014, 0.008, 0);
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8), bodyMat);
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(0.018, 0.008, -0.04);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.0038, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    lens.position.set(0.018, 0.008, -0.047);
    lens.rotation.y = Math.PI;
    group.add(peq, emitter, lens);
    return group;
  }

  // Tactical Quad-Rail Panel Guards
  for (const sx of [-0.022, 0.022]) {
    const railStrip = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.16), bodyMat);
    railStrip.position.set(sx - 0.024, 0, 0);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.13), polymerMat);
    cover.position.set(sx - 0.024, 0, 0);
    group.add(railStrip, cover);
  }
  return group;
}

export function buildMagazine3D(
  magId: MagazineAttachmentId,
  weaponId: WeaponId,
): THREE.Group {
  const group = new THREE.Group();
  const metalMat = pbr(0x21252b, 0.34, 0.84);
  const darkCap = pbr(0x121417, 0.55, 0.45);
  const isAkStyle = weaponId === 'ak47' || weaponId === 'stg44';

  if (magId === 'drum_mag') {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.044, 18), metalMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.092, -0.02);
    const frontPlate = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 6, 18), darkCap);
    frontPlate.position.set(0, -0.092, -0.043);
    const feedNeck = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.042), metalMat);
    feedNeck.position.set(0, -0.02, -0.02);
    group.add(drum, frontPlate, feedNeck);
    return group;
  }

  if (magId === 'extended_mag') {
    if (isAkStyle) {
      const extCurve = new THREE.Mesh(
        makeExtruded([
          [0.028, 0],
          [-0.036, 0],
          [-0.074, -0.145],
          [-0.14, -0.285],
          [-0.084, -0.302],
          [-0.018, -0.14],
        ], 0.027),
        metalMat,
      );
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.068), darkCap);
      basePlate.position.set(0, -0.295, -0.112);
      basePlate.rotation.x = 0.25;
      group.add(extCurve, basePlate);
      return group;
    }

    const extBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, weaponId === 'm1911' ? 0.145 : 0.23, 0.044),
      metalMat,
    );
    extBox.position.set(0, weaponId === 'm1911' ? -0.075 : -0.115, 0);
    extBox.rotation.x = weaponId === 'm1911' ? -0.24 : -0.08;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.05), darkCap);
    base.position.set(0, weaponId === 'm1911' ? -0.148 : -0.228, weaponId === 'm1911' ? 0.018 : 0.008);
    group.add(extBox, base);
    return group;
  }

  return group;
}

/**
 * Builds an articulated first-person tactical hand with sculpted palm and 5 jointed fingers
 * (half-finger tactical gloves with exposed realistic fingertips and knuckles).
 */
export function buildArticulatedHand(
  side: 'left' | 'right',
  pose: 'trigger' | 'foregrip' | 'support_flat' | 'cup',
): THREE.Group {
  const hand = new THREE.Group();
  const gloveMat = pbr(0x282622, 0.76, 0.08);
  const knuckleMat = pbr(0x1b1a18, 0.65, 0.15);
  const skinMat = pbr(0xd4a17d, 0.66, 0.02);

  // Sculpted tapered palm
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.056, 0.052), gloveMat);
  hand.add(palm);

  // Protective tactical knuckle guard bar
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.037, 0.016, 0.048), knuckleMat);
  knuckle.position.set(side === 'right' ? 0.004 : -0.004, 0.02, -0.008);
  hand.add(knuckle);

  const addFinger = (
    ox: number,
    oy: number,
    oz: number,
    radius: number,
    len1: number,
    len2: number,
    curl1: number,
    curl2: number,
    wrapDirX: number,
  ) => {
    const base = new THREE.Group();
    base.position.set(ox, oy, oz);
    const prox = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len1, 4, 6), gloveMat);
    prox.position.set(wrapDirX * len1 * 0.4, -len1 * 0.15, 0);
    prox.rotation.z = wrapDirX * curl1;
    base.add(prox);

    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.88, len2, 4, 6), skinMat);
    tip.position.set(
      wrapDirX * (len1 * 0.72 + len2 * 0.35),
      -len1 * 0.25 - len2 * 0.28,
      0,
    );
    tip.rotation.z = wrapDirX * (curl1 + curl2);
    base.add(tip);
    hand.add(base);
  };

  if (pose === 'trigger') {
    // Right trigger hand wrapping pistol grip: index finger extended along trigger, 3 fingers curled around grip, thumb over left side
    const dirWrap = -1; // wraps inward around -X side of pistol grip
    addFinger(0.014, 0.018, -0.018, 0.0062, 0.024, 0.02, 0.55, 0.45, dirWrap); // Index finger on trigger
    addFinger(0.016, 0.004, -0.016, 0.0065, 0.024, 0.018, 1.15, 0.85, dirWrap); // Middle
    addFinger(0.016, -0.011, -0.013, 0.006, 0.022, 0.016, 1.2, 0.85, dirWrap); // Ring
    addFinger(0.015, -0.025, -0.008, 0.0055, 0.018, 0.014, 1.2, 0.8, dirWrap); // Pinky
    // Thumb wrapping over top-left side of grip
    addFinger(-0.014, 0.022, 0.004, 0.0072, 0.02, 0.016, 0.65, 0.35, 1);
  } else if (pose === 'foregrip') {
    // Left hand tightly grasping a vertical foregrip with 4 wrapped fingers + thumb
    const dirWrap = 1;
    addFinger(-0.015, 0.018, -0.014, 0.0062, 0.024, 0.018, 1.15, 0.85, dirWrap);
    addFinger(-0.016, 0.003, -0.012, 0.0064, 0.024, 0.018, 1.2, 0.85, dirWrap);
    addFinger(-0.015, -0.012, -0.01, 0.006, 0.022, 0.016, 1.2, 0.85, dirWrap);
    addFinger(-0.014, -0.026, -0.006, 0.0055, 0.018, 0.014, 1.15, 0.8, dirWrap);
    addFinger(0.014, 0.024, 0.004, 0.0072, 0.022, 0.015, 0.9, 0.45, -1);
  } else {
    // Support C-clamp / flat cradle around rifle handguard
    hand.rotation.z = -0.32;
    const dirWrap = 1;
    addFinger(-0.012, 0.012, -0.02, 0.006, 0.022, 0.018, 0.85, 0.65, dirWrap);
    addFinger(-0.014, 0.005, -0.006, 0.0062, 0.023, 0.018, 0.9, 0.68, dirWrap);
    addFinger(-0.014, -0.002, 0.008, 0.0058, 0.021, 0.016, 0.92, 0.68, dirWrap);
    addFinger(-0.012, -0.009, 0.02, 0.0054, 0.018, 0.014, 0.95, 0.65, dirWrap);
    // Thumb over top rail
    addFinger(-0.008, 0.024, -0.008, 0.0074, 0.022, 0.016, 0.45, 0.4, 1);
  }

  return hand;
}

/**
 * Visible seated military driver/commander/pilot rendered inside vehicles & planes
 * so cockpits and driver seats are never mysteriously empty.
 */
export function buildSeatedSoldierMesh(team: Team, isPilot = false): THREE.Group {
  const g = new THREE.Group();
  const isAllies = team === 'allies';
  const tunicMat = pbr(isAllies ? 0x456b4d : 0x5c625c, 0.84, 0.04);
  const vestMat = pbr(isAllies ? 0x3b4837 : 0x3f4346, 0.78, 0.08);
  const helmetMat = pbr(isPilot ? 0x3d2e22 : isAllies ? 0x3b533e : 0x35393d, 0.46, 0.34);
  const goggleMat = pbr(0x1e3a52, 0.14, 0.25);
  const skinMat = pbr(0xdca984, 0.7, 0.02);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.44, 10), tunicMat);
  torso.position.y = 0.24;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.26), vestMat);
  vest.position.set(0, 0.26, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 8), skinMat);
  neck.position.y = 0.48;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), skinMat);
  head.position.y = 0.6;
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    helmetMat,
  );
  helmet.position.y = 0.61;
  g.add(torso, vest, neck, head, helmet);

  if (isPilot) {
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), goggleMat);
    goggles.position.set(0, 0.63, 0.125);
    g.add(goggles);
  }

  for (const sx of [-0.21, 0.21]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 4, 6), tunicMat);
    arm.position.set(sx, 0.28, 0.14);
    arm.rotation.x = 0.95;
    g.add(arm);
  }

  return g;
}
