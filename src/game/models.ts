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
import {
  getArmorSteelPbrSet,
  getAsphaltPbrSet,
  getBduCamoPbrSet,
  getBrickPbrSet,
  getConcretePbrSet,
  getGunmetalPbrSet,
  getPolymerPbrSet,
  getRockPbrSet,
  getRubberTreadPbrSet,
  getStuccoPbrSet,
  getTimberPbrSet,
  getWoodStockPbrSet,
  type PbrTextureSet,
} from './pbrTextures';

function makePbrMat(
  color: number,
  roughness = 0.72,
  metalness = 0.08,
  _flatShading = false,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    flatShading: false,
    ...extra,
  });
}

function pbrSetProps(
  set: PbrTextureSet | null,
  bumpScale = 0.015,
  includeMap = true,
  includeRoughness = true,
): Partial<THREE.MeshStandardMaterialParameters> {
  if (!set || typeof document === 'undefined') return {};
  const out: Partial<THREE.MeshStandardMaterialParameters> = {
    bumpMap: set.bumpMap,
    bumpScale,
  };
  if (includeMap) out.map = set.map;
  if (includeRoughness && set.roughnessMap) out.roughnessMap = set.roughnessMap;
  return out;
}

export function createRealisticMuzzleFlash(scale = 1): THREE.Group {
  const flash = new THREE.Group();
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xff7b14,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const midMat = new THREE.MeshBasicMaterial({
    color: 0xffb732,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8db,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
  });
  const bladeGeo = new THREE.PlaneGeometry(0.28 * scale, 0.085 * scale);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, outerMat);
    blade.rotation.z = (i * Math.PI) / 4;
    flash.add(blade);
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.062 * scale, 0.28 * scale, 7), midMat);
  cone.rotation.x = Math.PI / 2;
  cone.position.z = 0.11 * scale;
  const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.036 * scale, 0.16 * scale, 6), coreMat);
  innerCone.rotation.x = Math.PI / 2;
  innerCone.position.z = 0.065 * scale;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.052 * scale, 6, 5), coreMat);
  flash.add(cone, innerCone, core);
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
  eyelidL: THREE.Mesh;
  eyelidR: THREE.Mesh;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  jawGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  weaponMount: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  muzzleFlash: THREE.Object3D;
  telegraphGlint: THREE.Mesh;
  healBadge: THREE.Group;
  mudOverlays: THREE.Mesh[];
  hitFlashMaterials: THREE.MeshStandardMaterial[];
}

export interface SoldierAppearanceOptions {
  skinColor?: number;
  tunicColor?: number;
  helmetColor?: number;
  unarmed?: boolean;
  hideHelmet?: boolean;
  mudLevel?: number;
}

export function setSoldierMudLevel(rig: SoldierRig, mudLevel: number): void {
  const clamped = Math.max(0, Math.min(1, mudLevel));
  for (let i = 0; i < rig.mudOverlays.length; i++) {
    const m = rig.mudOverlays[i];
    m.visible = clamped > 0.04;
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.2 + clamped * 0.72;
  }
}

export function animateSoldierExpression(
  rig: SoldierRig,
  opts: {
    blinkAmount: number; // 0 open .. 1 closed
    mouthOpen: number; // 0 closed .. 1 open
    browTension: number; // -1 relaxed .. +1 furrowed
    headYaw?: number;
    headPitch?: number;
  },
): void {
  const blink = Math.max(0.05, Math.min(1, opts.blinkAmount));
  rig.eyelidL.scale.y = blink;
  rig.eyelidR.scale.y = blink;
  rig.jawGroup.rotation.x = Math.max(0, Math.min(0.42, opts.mouthOpen * 0.36));
  const tilt = Math.max(-0.25, Math.min(0.25, opts.browTension * 0.2));
  rig.browL.rotation.z = -tilt;
  rig.browR.rotation.z = tilt;
  if (typeof opts.headYaw === 'number') rig.headGroup.rotation.y = opts.headYaw;
  if (typeof opts.headPitch === 'number') rig.headGroup.rotation.x = opts.headPitch;
}

export function createLowPolySoldier(
  team: Team,
  role: BotRole,
  options?: SoldierAppearanceOptions,
): SoldierRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const isAllies = team === 'allies';
  const bduSet = typeof document !== 'undefined' ? getBduCamoPbrSet(team) : null;
  const gunSet = typeof document !== 'undefined' ? getGunmetalPbrSet() : null;
  const woodSet = typeof document !== 'undefined' ? getWoodStockPbrSet() : null;
  const polymerSet = typeof document !== 'undefined' ? getPolymerPbrSet() : null;
  const tunicColor = options?.tunicColor ?? (isAllies ? 0xd0d8c6 : 0xd2d6d0);
  const accentColor = isAllies ? 0x2d5ca4 : 0xa33636;
  const pantsColor = options?.tunicColor ? options.tunicColor : isAllies ? 0xbec6b4 : 0xb2b6b2;
  const helmetColor = options?.helmetColor ?? (isAllies ? 0x3f513d : 0x3b3e42);
  const packColor = isAllies ? 0x6b6046 : 0x3b3832;
  const skinColor = options?.skinColor ?? 0xdba986;

  const tunicMat = makePbrMat(tunicColor, 0.88, 0.02, false, pbrSetProps(bduSet, 0.008));
  const accentMat = makePbrMat(accentColor, 0.72, 0.06, false, pbrSetProps(polymerSet, 0.004, false));
  const pantsMat = makePbrMat(pantsColor, 0.9, 0.02, false, pbrSetProps(bduSet, 0.008));
  const vestMat = makePbrMat(
    isAllies ? 0x454f3c : 0x3f4346,
    0.82,
    0.06,
    false,
    pbrSetProps(polymerSet, 0.009, false),
  );
  const helmetMat = makePbrMat(helmetColor, 0.56, 0.22, false, pbrSetProps(bduSet, 0.007, false));
  const skinMat = makePbrMat(skinColor, 0.68, 0.02);
  const leatherMat = makePbrMat(packColor, 0.62, 0.1, false, pbrSetProps(polymerSet, 0.006, false));
  const bootMat = makePbrMat(0x211a15, 0.48, 0.16, false, pbrSetProps(polymerSet, 0.005, false));
  const gunWoodMat = makePbrMat(0x734525, 0.58, 0.05, false, pbrSetProps(woodSet, 0.005));
  const gunSteelMat = makePbrMat(0x272b30, 0.32, 0.86, false, pbrSetProps(gunSet, 0.004));

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

  const makeLeg = (xOff: number): { legGroup: THREE.Group; kneeGroup: THREE.Group } => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOff, 0.76, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.22, 4, 8), pantsMat);
    thigh.position.y = -0.16;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.32, 0);
    legGroup.add(kneeGroup);

    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.088, 8, 6), leatherMat);
    kneePad.position.set(0, 0, 0.045);
    kneePad.scale.set(1, 1, 0.65);
    kneeGroup.add(kneePad);

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.078, 0.28, 8), pantsMat);
    calf.position.y = -0.14;
    calf.castShadow = true;
    kneeGroup.add(calf);

    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.085, 0.16, 8), bootMat);
    bootShaft.position.set(0, -0.3, 0);
    const bootToe = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.12, 4, 8), bootMat);
    bootToe.rotation.x = Math.PI / 2;
    bootToe.position.set(0, -0.37, 0.06);
    bootToe.castShadow = true;
    const legMudMat = makePbrMat(0x4a3826, 0.94, 0.02, false, {
      transparent: true,
      opacity: 0.0,
    });
    const calfMud = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.088, 0.29, 8), legMudMat);
    calfMud.position.y = -0.17;
    calfMud.visible = false;
    const bootMud = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.13, 4, 8), legMudMat);
    bootMud.rotation.x = Math.PI / 2;
    bootMud.position.set(0, -0.36, 0.06);
    bootMud.visible = false;
    kneeGroup.add(bootShaft, bootToe, calfMud, bootMud);

    return { legGroup, kneeGroup };
  };
  const leftLegRig = makeLeg(-0.14);
  const rightLegRig = makeLeg(0.14);
  const leftLeg = leftLegRig.legGroup;
  const rightLeg = rightLegRig.legGroup;
  const leftKnee = leftLegRig.kneeGroup;
  const rightKnee = rightLegRig.kneeGroup;
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
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 12), skinMat);
  neck.position.y = 0.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skinMat);
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
  const helmet = new THREE.Mesh(new THREE.LatheGeometry(helmetPts, 20), helmetMat);
  helmet.position.set(0, 0.17, -0.01);
  helmet.castShadow = true;
  helmet.visible = !options?.hideHelmet;
  headGroup.add(helmet);

  // Tactical helmet shroud, brow goggles, and ballistic NVG mount
  const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.04), gunSteelMat);
  nvgMount.position.set(0, 0.27, 0.175);
  const goggleStrap = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.016, 8, 20), vestMat);
  goggleStrap.rotation.x = Math.PI / 2;
  goggleStrap.position.set(0, 0.22, -0.01);
  const goggleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.058, 0.055), leatherMat);
  goggleFrame.position.set(0, 0.23, 0.162);
  const goggleLens = new THREE.Mesh(
    new THREE.BoxGeometry(0.165, 0.04, 0.062),
    makePbrMat(0x213647, 0.12, 0.25),
  );
  goggleLens.position.set(0, 0.23, 0.165);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.186, 0.012, 8, 20), accentMat);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.2, -0.01);
  if (!options?.hideHelmet) {
    headGroup.add(nvgMount, goggleStrap, goggleFrame, goggleLens, band);
  }

  // Expressive face rig: sclera + iris, animated blinking eyelids, eyebrows, nose bridge, and hinged jaw
  const scleraMat = makePbrMat(0xf4f1ea, 0.35, 0.04);
  const pupilMat = makePbrMat(0x18191c, 0.2, 0.1);
  const lidMat = makePbrMat(skinColor, 0.68, 0.02);
  const browMat = makePbrMat(0x241c17, 0.85, 0.04);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), scleraMat);
  eyeL.position.set(-0.05, 0.165, 0.14);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), pupilMat);
  pupilL.position.set(-0.05, 0.165, 0.153);
  const eyelidL = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.036, 0.024), lidMat);
  eyelidL.position.set(-0.05, 0.182, 0.151);
  eyelidL.scale.y = 0.08;

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), scleraMat);
  eyeR.position.set(0.05, 0.165, 0.14);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), pupilMat);
  pupilR.position.set(0.05, 0.165, 0.153);
  const eyelidR = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.036, 0.024), lidMat);
  eyelidR.position.set(0.05, 0.182, 0.151);
  eyelidR.scale.y = 0.08;

  const browL = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.011, 0.018), browMat);
  browL.position.set(-0.05, 0.198, 0.151);
  const browR = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.011, 0.018), browMat);
  browR.position.set(0.05, 0.198, 0.151);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.048, 0.035), lidMat);
  nose.position.set(0, 0.142, 0.156);
  nose.rotation.x = -0.18;

  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, 0.095, 0.115);
  const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.022, 0.045), skinMat);
  lowerLip.position.set(0, -0.012, 0.028);
  const mouthCavity = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.012, 0.02),
    makePbrMat(0x2a1414, 0.8, 0.02),
  );
  mouthCavity.position.set(0, 0.002, 0.036);
  jawGroup.add(lowerLip, mouthCavity);

  headGroup.add(eyeL, pupilL, eyelidL, eyeR, pupilR, eyelidR, browL, browR, nose, jawGroup);

  const chinstrap = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.01, 6, 14, Math.PI), leatherMat);
  chinstrap.rotation.y = Math.PI / 2;
  chinstrap.rotation.x = Math.PI * 0.85;
  chinstrap.position.set(0, 0.13, 0.01);
  if (!options?.hideHelmet) headGroup.add(chinstrap);

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
  if (options?.unarmed) {
    gunGroup.visible = false;
  }

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

  // Collect mud overlays on boots/calves and add chest mud splash
  const chestMud = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.28, 0.26),
    makePbrMat(0x4a3826, 0.94, 0.02, false, { transparent: true, opacity: 0.0 }),
  );
  chestMud.position.set(0, 0.92, 0.03);
  chestMud.visible = false;
  bodyPivot.add(chestMud);

  const mudOverlays: THREE.Mesh[] = [chestMud];
  for (const leg of [leftKnee, rightKnee]) {
    for (let c = 0; c < leg.children.length; c++) {
      const ch = leg.children[c] as THREE.Mesh;
      if (ch.material && (ch.material as THREE.MeshStandardMaterial).transparent) {
        mudOverlays.push(ch);
      }
    }
  }

  const rig: SoldierRig = {
    root,
    bodyPivot,
    headGroup,
    eyelidL,
    eyelidR,
    browL,
    browR,
    jawGroup,
    leftArm,
    rightArm,
    weaponMount,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    muzzleFlash,
    telegraphGlint,
    healBadge,
    mudOverlays,
    hitFlashMaterials: [tunicMat, pantsMat, helmetMat],
  };
  if (typeof options?.mudLevel === 'number' && options.mudLevel > 0) {
    setSoldierMudLevel(rig, options.mudLevel);
  }
  return rig;
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

  const woodSet = typeof document !== 'undefined' ? getWoodStockPbrSet() : null;
  const steelSet = typeof document !== 'undefined' ? getGunmetalPbrSet() : null;
  const polySet = typeof document !== 'undefined' ? getPolymerPbrSet() : null;
  const bduSet = typeof document !== 'undefined' ? getBduCamoPbrSet('allies') : null;

  const walnutMat = makePbrMat(0x7c4622, 0.5, 0.05, false, pbrSetProps(woodSet, 0.004));
  const akWoodMat = makePbrMat(0x9a5126, 0.46, 0.05, false, pbrSetProps(woodSet, 0.004));
  const darkWalnutMat = makePbrMat(0x553019, 0.54, 0.04, false, pbrSetProps(woodSet, 0.004));
  const bakeliteMat = makePbrMat(0x572a1c, 0.36, 0.12, false, pbrSetProps(polySet, 0.003, false));
  const polymerMat = makePbrMat(0x262422, 0.46, 0.12, false, pbrSetProps(polySet, 0.004));
  const bluedSteelMat = makePbrMat(0x2d3540, 0.28, 0.88, false, pbrSetProps(steelSet, 0.003));
  const parkerizedMat = makePbrMat(0x414a52, 0.38, 0.78, false, pbrSetProps(steelSet, 0.0035));
  const oliveTubeMat = makePbrMat(0x4c593e, 0.54, 0.32, false, pbrSetProps(steelSet, 0.003, false));
  const darkMetalMat = makePbrMat(0x191d22, 0.34, 0.85, false, pbrSetProps(steelSet, 0.0025));
  const brassMat = makePbrMat(0xc8a03f, 0.24, 0.9, false, pbrSetProps(steelSet, 0.002, false));
  const warheadMat = makePbrMat(0x4c5837, 0.46, 0.38, false, pbrSetProps(steelSet, 0.003, false));
  const lensMat = makePbrMat(0x1f4b6e, 0.06, 0.2, false, {
    emissive: 0x0b2538,
    emissiveIntensity: 0.45,
  });
  const fdeMat = makePbrMat(0x937d5f, 0.54, 0.16, false, pbrSetProps(polySet, 0.0035, false));
  const darkFdeMat = makePbrMat(0x726046, 0.58, 0.14, false, pbrSetProps(polySet, 0.0035, false));
  const sleeveMat = makePbrMat(
    bduSet ? 0xd4dcc8 : 0x424d3b,
    0.86,
    0.02,
    false,
    pbrSetProps(bduSet, 0.005),
  );

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

    // Contoured stamped steel AK-47 receiver + rounded ribbed dust cover
    const receiver = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.095, -0.014],
          [-0.165, -0.014],
          [-0.165, 0.036],
          [0.095, 0.032],
        ],
        0.042,
        0.004,
      ),
      bluedSteelMat,
    );

    const dustCoverGeo = new THREE.CylinderGeometry(
      0.021,
      0.022,
      0.23,
      12,
      1,
      false,
      -Math.PI * 0.5,
      Math.PI,
    );
    dustCoverGeo.rotateX(-Math.PI / 2);
    const dustCover = new THREE.Mesh(dustCoverGeo, parkerizedMat);
    dustCover.position.set(0, 0.031, -0.032);
    const dustCoverFloor = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.232), bluedSteelMat);
    dustCoverFloor.position.set(0, 0.026, -0.032);
    root.add(dustCoverFloor);
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.0205, 0.0022, 5, 10, Math.PI),
        darkMetalMat,
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.set(0, 0.035, 0.04 - i * 0.042);
      root.add(rib);
    }

    // Safety selector lever on right side
    const selector = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.012, 0.082), darkMetalMat);
    selector.position.set(0.024, 0.022, -0.01);
    selector.rotation.x = 0.08;

    // Animated reciprocating bolt carrier + hooked charging handle
    const boltCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.095, 8),
      bluedSteelMat,
    );
    boltCarrier.rotation.x = Math.PI / 2;
    boltCarrier.position.set(0.019, 0.033, -0.085);
    const chargeKnob = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.014), darkMetalMat);
    chargeKnob.position.set(0.033, 0.034, -0.065);
    boltGroup.add(boltCarrier, chargeKnob);

    // Sculpted palm-swell laminated wood handguard + ventilated gas port seam
    const lowerHandguard = new THREE.Mesh(
      createExtrudedProfile(
        [
          [-0.17, -0.01],
          [-0.368, -0.004],
          [-0.368, 0.024],
          [-0.17, 0.024],
        ],
        0.04,
        0.006,
      ),
      akWoodMat,
    );
    const upperHandguard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.185, 10),
      akWoodMat,
    );
    upperHandguard.rotation.x = Math.PI / 2;
    upperHandguard.position.set(0, 0.038, -0.268);
    const handguardCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.016, 10), darkMetalMat);
    handguardCap.rotation.x = Math.PI / 2;
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

    // Receiver rivets for authentic stamped steel look
    for (const rz of [0.055, -0.025, -0.105]) {
      for (const sx of [-0.023, 0.023]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 5), darkMetalMat);
        rivet.position.set(sx, 0.02, rz);
        root.add(rivet);
      }
    }

    // Tangent rear sight + hooded front sight post centered cleanly at y = 0.066
    if (!customOpticActive) {
      const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.048), darkMetalMat);
      rearSightBase.position.set(0, 0.056, -0.13);
      const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.016), darkMetalMat);
      rearEarL.position.set(-0.008, 0.067, -0.12);
      const rearEarR = rearEarL.clone();
      rearEarR.position.x = 0.008;
      root.add(rearSightBase, rearEarL, rearEarR);
    }

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
      frontTower,
      frontHood,
      frontPin,
    );
    muzzleZ = -0.82;
    muzzleY = 0.022;
    ejectPos = new THREE.Vector3(0.032, 0.04, -0.07);
    leftHandPos = new THREE.Vector3(-0.014, -0.018, -0.28);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.068);
    adsOffset.set(0, -0.067, -0.45);
  } else if (weaponId === 'm4a1') {
    // M4A1 SOPMOD Carbine (matches user reference: FDE upper/lower receiver & adjustable stock,
    // black Picatinny quad-rail handguard, brass deflector, curved 5.56 STANAG mag, birdcage flash hider)
    if (!customStockActive) {
      const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), darkMetalMat);
      bufferTube.rotation.x = Math.PI / 2;
      bufferTube.position.set(0, 0.018, 0.19);
      const carbineStock = new THREE.Mesh(
        createExtrudedProfile(
          [
            [0.14, 0.028],
            [0.34, 0.024],
            [0.34, -0.095],
            [0.24, -0.088],
            [0.14, -0.022],
          ],
          0.038,
          0.004,
        ),
        fdeMat,
      );
      const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.012), darkMetalMat);
      buttPad.position.set(0, -0.035, 0.346);
      root.add(bufferTube, carbineStock, buttPad);
    }

    const pistolGrip = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.018, -0.01],
          [0.06, -0.01],
          [0.098, -0.112],
          [0.052, -0.115],
        ],
        0.032,
        0.004,
      ),
      darkFdeMat,
    );

    // Forged FDE AR-15 Lower & Cylindrical Upper Receiver + Continuous Picatinny Rail
    const lowerRecv = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.072, -0.008],
          [-0.082, -0.008],
          [-0.145, -0.022],
          [-0.165, 0.03],
          [0.072, 0.03],
        ],
        0.04,
        0.004,
      ),
      fdeMat,
    );
    const upperRecv = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.215, 12), fdeMat);
    upperRecv.rotation.x = Math.PI / 2;
    upperRecv.position.set(0, 0.036, -0.038);
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.012, 0.21), darkMetalMat);
    topRail.position.set(0, 0.053, -0.038);

    // Brass deflector & forward assist on right side (+X)
    const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.026), fdeMat);
    deflector.position.set(0.024, 0.034, 0.005);
    const forwardAssist = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.026, 8), darkMetalMat);
    forwardAssist.rotation.x = Math.PI / 2;
    forwardAssist.rotation.y = 0.2;
    forwardAssist.position.set(0.024, 0.028, 0.045);

    // Reciprocating bolt carrier dust cover port
    const boltPlate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.075), bluedSteelMat);
    boltPlate.position.set(0.02, 0.034, -0.065);
    boltGroup.add(boltPlate);

    // Tubular Quad-Rail Free-Float Handguard + delta ring + slotted ribs
    const deltaRing = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.022, 12), darkMetalMat);
    deltaRing.rotation.x = Math.PI / 2;
    deltaRing.position.set(0, 0.026, -0.15);
    const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10), darkMetalMat);
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, 0.026, -0.27);
    const handguardTopRail = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.01, 0.24), polymerMat);
    handguardTopRail.position.set(0, 0.052, -0.27);
    root.add(deltaRing);
    for (let r = 0; r < 7; r++) {
      const slot = new THREE.Mesh(new THREE.CylinderGeometry(0.0265, 0.0265, 0.01, 10), polymerMat);
      slot.rotation.x = Math.PI / 2;
      slot.position.set(0, 0.026, -0.172 - r * 0.033);
      root.add(slot);
    }

    // M4A1 Barrel + Front Sight Triangle Tower + A2 Birdcage Flash Hider
    const barrel = new THREE.Mesh(
      createLatheBarrel([
        [0.014, 0.0],
        [0.012, 0.24],
        [0.01, 0.36],
      ]),
      bluedSteelMat,
    );
    barrel.position.set(0, 0.024, -0.39);
    const birdcage = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, 0.044, 10), darkMetalMat);
    birdcage.rotation.x = Math.PI / 2;
    birdcage.position.set(0, 0.024, -0.76);

    const aFrameBase = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.048), darkMetalMat);
    aFrameBase.position.set(0, 0.038, -0.52);
    const frontPin = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.02, 0.01), darkMetalMat);
    frontPin.position.set(0, 0.064, -0.52);

    if (!customMagActive) {
      const stanagMag = new THREE.Mesh(
        createExtrudedProfile(
          [
            [-0.125, -0.006],
            [-0.188, -0.006],
            [-0.205, -0.16],
            [-0.145, -0.17],
          ],
          0.024,
          0.003,
        ),
        bluedSteelMat,
      );
      magGroup.add(stanagMag);
    }

    if (!customOpticActive) {
      const rearFlip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.028), darkMetalMat);
      rearFlip.position.set(0, 0.06, 0.035);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.014, 0.012), darkMetalMat);
      earL.position.set(-0.008, 0.071, 0.035);
      const earR = earL.clone();
      earR.position.x = 0.008;
      root.add(rearFlip, earL, earR);
    }

    addTriggerGuard(-0.018, -0.01);
    root.add(
      pistolGrip,
      lowerRecv,
      upperRecv,
      topRail,
      deflector,
      forwardAssist,
      handguard,
      handguardTopRail,
      barrel,
      birdcage,
      aFrameBase,
      frontPin,
    );
    muzzleZ = -0.79;
    muzzleY = 0.024;
    ejectPos = new THREE.Vector3(0.028, 0.042, -0.06);
    leftHandPos = new THREE.Vector3(-0.014, -0.016, -0.285);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.065);
    adsOffset.set(0, -0.071, -0.45);
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

    // Rounded walnut handguard + contoured receiver bridge
    const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.38, 10), wood);
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, 0.033, -0.29);

    // Machined receiver + cylindrical bridge
    const receiver = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.06, 0.012],
          [-0.18, 0.012],
          [-0.18, 0.046],
          [0.06, 0.042],
        ],
        0.042,
        0.004,
      ),
      parkerizedMat,
    );
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

    adsOffset.set(0, -0.065, -0.45);
    if (!customOpticActive) {
      const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.014, 0.032), darkMetalMat);
      rearBase.position.set(0, 0.055, -0.01);
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.02), darkMetalMat);
      earL.position.set(-0.008, 0.065, -0.01);
      const earR = earL.clone();
      earR.position.x = 0.008;
      root.add(rearBase, earL, earR);
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

    if (!customOpticActive) {
      const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.02), darkMetalMat);
      rearEarL.position.set(-0.009, 0.064, 0.04);
      const rearEarR = rearEarL.clone();
      rearEarR.position.x = 0.009;
      root.add(rearEarL, rearEarR);
    }
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.012), darkMetalMat);
    frontPost.position.set(0, 0.06, -0.68);

    addTriggerGuard(-0.02, 0.03);
    root.add(foregrip, receiver, barrel, gasTube, frontPost);
    muzzleZ = -0.78;
    muzzleY = 0.036;
    leftHandPos = new THREE.Vector3(-0.016, -0.026, -0.3);
    rightHandPos = new THREE.Vector3(0.0, -0.044, 0.095);
    adsOffset.set(0, -0.064, -0.45);
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

    if (!customOpticActive) {
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.02), darkMetalMat);
      rearL.position.set(-0.009, 0.062, 0.02);
      const rearR = rearL.clone();
      rearR.position.x = 0.009;
      root.add(rearL, rearR);
    }
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.01), darkMetalMat);
    front.position.set(0, 0.056, -0.56);

    addTriggerGuard(-0.015, -0.01);
    root.add(comp, front);
    muzzleZ = -0.62;
    muzzleY = 0.032;
    leftHandPos = new THREE.Vector3(-0.014, -0.02, -0.31);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.065);
    adsOffset.set(0, -0.062, -0.44);
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

    if (!customOpticActive) {
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.012, 0.016), darkMetalMat);
      rearL.position.set(-0.009, 0.056, 0.04);
      const rearR = rearL.clone();
      rearR.position.x = 0.009;
      root.add(rearL, rearR);
    }

    addTriggerGuard(-0.02, -0.02);
    root.add(receiver, grip, lowerBody, barrel, restBar, muzzleNut, magWell, frontHood, frontBlade);
    muzzleZ = -0.6;
    muzzleY = 0.028;
    leftHandPos = new THREE.Vector3(-0.014, -0.055, -0.21);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.055);
    adsOffset.set(0, -0.056, -0.44);
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

    // Distinct angular stamped steel StG-44 upper shroud & cylindrical gas tube
    const upperReceiver = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.08, 0.018],
          [-0.24, 0.018],
          [-0.24, 0.052],
          [0.08, 0.048],
        ],
        0.04,
        0.004,
      ),
      parkerizedMat,
    );
    const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.022, 0.27), darkMetalMat);
    lowerReceiver.position.set(0, 0.008, -0.06);

    // Ventilated stamped steel handguard shroud (contoured cylinder + cooling ribs)
    const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.25, 10), darkMetalMat);
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, 0.022, -0.365);
    for (let v = 0; v < 4; v++) {
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 8), parkerizedMat);
      vent.rotation.x = Math.PI / 2;
      vent.position.set(0, 0.022, -0.27 - v * 0.055);
      root.add(vent);
    }
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

    if (!customOpticActive) {
      const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.028), darkMetalMat);
      rearBase.position.set(0, 0.056, -0.02);
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.016, 0.022), darkMetalMat);
      rearL.position.set(-0.009, 0.066, -0.02);
      const rearR = rearL.clone();
      rearR.position.x = 0.009;
      root.add(rearBase, rearL, rearR);
    }

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
    );
    muzzleZ = -0.73;
    muzzleY = 0.026;
    leftHandPos = new THREE.Vector3(-0.014, -0.016, -0.32);
    rightHandPos = new THREE.Vector3(0.0, -0.052, 0.064);
    adsOffset.set(0, -0.066, -0.45);
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

    // Open PGO-7 side optical sight ring & sleek lower scope housing so target is 100% clear in ADS
    const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.014, 0.038), darkMetalMat);
    opticMount.position.set(-0.046, 0.035, -0.16);
    const opticRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0026, 8, 18), oliveTubeMat);
    opticRing.position.set(-0.075, 0.058, -0.15);
    const opticRimFront = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0024, 8, 18), darkMetalMat);
    opticRimFront.position.set(-0.075, 0.058, -0.25);
    const opticSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0185, 0.0185, 0.1, 14, 1, true),
      oliveTubeMat,
    );
    opticSleeve.rotation.x = Math.PI / 2;
    opticSleeve.position.set(-0.075, 0.058, -0.2);
    const clearLensMat = makePbrMat(0x22688f, 0.06, 0.15, false, {
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const opticLensF = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), clearLensMat);
    opticLensF.position.set(-0.075, 0.058, -0.25);
    opticLensF.rotation.y = Math.PI;
    const opticLensR = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), clearLensMat);
    opticLensR.position.set(-0.075, 0.058, -0.15);

    const frontLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.01), darkMetalMat);
    frontLeaf.position.set(-0.02, 0.054, -0.66);
    const rearLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.02, 0.01), darkMetalMat);
    rearLeaf.position.set(-0.02, 0.054, -0.2);

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
      opticRing,
      opticRimFront,
      opticSleeve,
      opticLensF,
      opticLensR,
      frontLeaf,
      rearLeaf,
    );
    muzzleZ = -0.96;
    muzzleY = 0.022;
    leftHandPos = new THREE.Vector3(0, -0.068, -0.11);
    rightHandPos = new THREE.Vector3(0, -0.072, -0.34);
    adsOffset.set(0.075, -0.058, -0.68);
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
      // Protective blast shield positioned right of the sight aperture so ADS view through the visor is 100% clear
      const shieldMain = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.27, 0.012), parkerizedMat);
      shieldMain.position.set(0.015, 0.045, -0.34);
      const visorBarTop = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.012), parkerizedMat);
      visorBarTop.position.set(-0.088, 0.125, -0.34);
      const visorBarBot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.012), parkerizedMat);
      visorBarBot.position.set(-0.088, -0.035, -0.34);
      const visorBarOuter = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.25, 0.012), parkerizedMat);
      visorBarOuter.position.set(-0.14, 0.045, -0.34);
      const clearVisorMat = makePbrMat(0x285f7c, 0.08, 0.15, false, {
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.105, 0.008), clearVisorMat);
      visorGlass.position.set(-0.088, 0.06, -0.34);
      root.add(shieldMain, visorBarTop, visorBarBot, visorBarOuter, visorGlass);
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
    const rearSight = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0026, 6, 16), darkMetalMat);
    rearSight.position.set(-0.088, 0.062, -0.06);
    const frontPin = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.02, 0.008), darkMetalMat);
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
    adsOffset.set(0.088, -0.062, -0.7);
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

    if (!customOpticActive) {
      const rearEarL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.018), darkMetalMat);
      rearEarL.position.set(-0.008, 0.058, 0.01);
      const rearEarR = rearEarL.clone();
      rearEarR.position.x = 0.008;
      root.add(rearEarL, rearEarR);
    }
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.01), darkMetalMat);
    frontPost.position.set(0, 0.058, -0.55);

    addTriggerGuard(-0.016, 0.04);
    root.add(receiver, shroud, barrel, compSlant, frontPost);
    muzzleZ = -0.6;
    muzzleY = 0.032;
    leftHandPos = new THREE.Vector3(-0.014, -0.016, -0.32);
    rightHandPos = new THREE.Vector3(0.0, -0.04, 0.11);
    adsOffset.set(0, -0.06, -0.44);
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
    boltGroup.add(slide, slideTop, frontSight);
    if (!customOpticActive) {
      const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.012), darkMetalMat);
      rearL.position.set(-0.007, 0.048, 0.065);
      const rearR = rearL.clone();
      rearR.position.x = 0.007;
      boltGroup.add(rearL, rearR);
    }

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
    adsOffset.set(0, -0.048, -0.44);
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
  const rockSet = typeof document !== 'undefined' ? getRockPbrSet('forest') : null;
  const stuccoSet = typeof document !== 'undefined' ? getStuccoPbrSet() : null;
  const timberSet = typeof document !== 'undefined' ? getTimberPbrSet() : null;
  const brickSet = typeof document !== 'undefined' ? getBrickPbrSet() : null;
  const concreteSet = typeof document !== 'undefined' ? getConcretePbrSet() : null;

  const stoneMat = makePbrMat(0x8c8478, 0.9, 0.04, false, pbrSetProps(rockSet, 0.02));
  const stuccoMat = makePbrMat(
    ruined ? 0xc0b6aa : 0xdad0be,
    0.88,
    0.02,
    false,
    pbrSetProps(stuccoSet, 0.012),
  );
  const timberMat = makePbrMat(0x624630, 0.8, 0.04, false, pbrSetProps(timberSet, 0.015));
  const roofMat = makePbrMat(roofColor, 0.76, 0.06, false, pbrSetProps(brickSet, 0.018, false));
  const floorMat = makePbrMat(0x746a5e, 0.92, 0.03, false, pbrSetProps(concreteSet, 0.012));

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
  const concreteSet = typeof document !== 'undefined' ? getConcretePbrSet() : null;
  const stuccoSet = typeof document !== 'undefined' ? getStuccoPbrSet() : null;
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const concreteMat = makePbrMat(
    sandTone ? 0xd2be9b : 0x91948e,
    0.88,
    0.04,
    false,
    pbrSetProps(concreteSet, 0.02),
  );
  const sandbagMat = makePbrMat(0xbba67b, 0.94, 0.02, false, pbrSetProps(stuccoSet, 0.016));
  const steelMat = makePbrMat(0x41474f, 0.42, 0.76, false, pbrSetProps(steelSet, 0.008));

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
  const timberSet = typeof document !== 'undefined' ? getTimberPbrSet() : null;
  const woodMat = makePbrMat(0x6a4b30, 0.84, 0.04, false, pbrSetProps(timberSet, 0.016));
  const roofMat = makePbrMat(0x454f40, 0.82, 0.05, false, pbrSetProps(timberSet, 0.012, false));

  for (const px of [-1.25, 1.25]) {
    for (const pz of [-1.25, 1.25]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 6.2, 10), woodMat);
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
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const drumMat = makePbrMat(0x824c35, 0.56, 0.45, false, pbrSetProps(steelSet, 0.01));
  const oliveMat = makePbrMat(0x526145, 0.6, 0.35, false, pbrSetProps(steelSet, 0.01));
  const offsets = [
    [-0.45, 0, 0.25, oliveMat],
    [0.45, 0, 0.18, drumMat],
    [0, 0, -0.45, drumMat],
  ] as const;

  offsets.forEach(([x, _y, z, mat]) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.35, 16), mat);
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
  const concreteSet = typeof document !== 'undefined' ? getConcretePbrSet() : null;
  const gunSet = typeof document !== 'undefined' ? getGunmetalPbrSet() : null;
  const plinthMat = makePbrMat(0x6d7276, 0.85, 0.08, false, pbrSetProps(concreteSet, 0.014));
  const poleMat = makePbrMat(0xd0d5dd, 0.34, 0.82, false, pbrSetProps(gunSet, 0.004));

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 1.4, 14), plinthMat);
  plinth.position.y = -0.15;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 8.6, 12), poleMat);
  pole.position.y = 4.55;
  pole.castShadow = true;
  group.add(pole);

  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 6),
    makePbrMat(0xd4af37, 0.25, 0.9),
  );
  finial.position.y = 8.95;
  group.add(finial);

  const bannerMat = makePbrMat(0xd1d5db, 0.78, 0.04, false, { side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.35, 8, 3), bannerMat);
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
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.35, radius, 48), ringMat);
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
  const rockSet = typeof document !== 'undefined' ? getRockPbrSet('normandy') : null;
  const asphaltSet = typeof document !== 'undefined' ? getAsphaltPbrSet() : null;
  const stoneMat = makePbrMat(0x888278, 0.88, 0.04, false, pbrSetProps(rockSet, 0.018));
  const roadMat = makePbrMat(0x88888a, 0.92, 0.02, false, pbrSetProps(asphaltSet, 0.012));

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
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const ironMat = makePbrMat(0x3e3b36, 0.5, 0.68, false, pbrSetProps(steelSet, 0.01));
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
  const stuccoSet = typeof document !== 'undefined' ? getStuccoPbrSet() : null;
  const bagMat = makePbrMat(0xbba67b, 0.92, 0.02, false, pbrSetProps(stuccoSet, 0.018));
  for (let row = 0; row < 2; row++) {
    for (let col = -1; col <= 1; col++) {
      const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.82, 6, 12), bagMat);
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
  const timberSet = typeof document !== 'undefined' ? getTimberPbrSet() : null;
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const crateMat = makePbrMat(0x5b6941, 0.76, 0.1, false, pbrSetProps(timberSet, 0.014));
  const trimMat = makePbrMat(0x3a422b, 0.7, 0.22, false, pbrSetProps(steelSet, 0.01));
  const brassMat = makePbrMat(0xd4af37, 0.3, 0.85);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 0.95), crateMat);
  box.position.y = 0.25;
  box.castShadow = true;
  box.receiveShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 1.02), trimMat);
  lid.position.y = 0.82;
  const ammoShell1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10), brassMat);
  ammoShell1.rotation.z = Math.PI / 2;
  ammoShell1.position.set(0, 0.93, -0.14);
  const ammoShell2 = ammoShell1.clone();
  ammoShell2.position.z = 0.14;
  group.add(box, lid, ammoShell1, ammoShell2);
  return group;
}

/**
 * Stratified eroded boulder geometry with UV mapping for rock albedo & bump textures.
 */
export function createOrganicBoulderGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1.18, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const noise =
      1 +
      0.19 * Math.sin(x * 3.1 + y * 2.3) +
      0.14 * Math.cos(z * 2.9 - x * 1.7) +
      0.06 * Math.sin(y * 7.2 + z * 4.1);
    const flatBottom = y < -0.42 ? 0.62 : 1.0;
    pos.setXYZ(i, x * noise, y * noise * flatBottom, z * noise);
  }
  geo.computeVertexNormals();
  return geo;
}

function appendTransformedGeometry(
  source: THREE.BufferGeometry,
  positions: number[],
  uvs: number[],
): void {
  const nonIdx = source.index ? source.toNonIndexed() : source;
  const p = nonIdx.attributes.position as THREE.BufferAttribute;
  const u = nonIdx.attributes.uv as THREE.BufferAttribute | undefined;
  for (let i = 0; i < p.count; i++) {
    positions.push(p.getX(i), p.getY(i), p.getZ(i));
    if (u) {
      uvs.push(u.getX(i), u.getY(i));
    } else {
      uvs.push(0.5, 0.5);
    }
  }
  if (nonIdx !== source) nonIdx.dispose();
  source.dispose();
}

/**
 * Multi-tiered UV-mapped botanical pine bough cluster geometry (crossed angled branch spray planes).
 */
export function createMultiTierPineCanopyGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const tiers = [
    { y: 2.55, w: 3.7, h: 2.35, tilt: 0.48, rotOff: 0.0 },
    { y: 3.7, w: 3.1, h: 2.15, tilt: 0.44, rotOff: 0.52 },
    { y: 4.8, w: 2.45, h: 1.95, tilt: 0.4, rotOff: 1.05 },
    { y: 5.75, w: 1.7, h: 1.6, tilt: 0.3, rotOff: 0.35 },
  ];

  for (const tier of tiers) {
    const blades = 5;
    for (let b = 0; b < blades; b++) {
      const ang = tier.rotOff + (b / blades) * Math.PI * 2;
      const plane = new THREE.PlaneGeometry(tier.w, tier.h, 2, 2);
      // Droop outer vertices down like gravity-laden conifer boughs
      const pAttr = plane.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pAttr.count; i++) {
        const px = pAttr.getX(i);
        const py = pAttr.getY(i);
        const dropZ = -(Math.abs(px) / (tier.w * 0.5)) * 0.28 + (py < 0 ? 0.14 : -0.1);
        pAttr.setZ(i, dropZ);
      }
      plane.rotateX(tier.tilt);
      plane.translate(0, tier.y, 0);
      plane.rotateY(ang);
      appendTransformedGeometry(plane, positions, uvs);
    }
  }

  // Vertical crossed needle spire crown planes for full 360-deg silhouette at any pitch
  for (let c = 0; c < 3; c++) {
    const spire = new THREE.PlaneGeometry(3.5, 4.7, 2, 2);
    spire.translate(0, 4.35, 0);
    spire.rotateY((c * Math.PI) / 3);
    appendTransformedGeometry(spire, positions, uvs);
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Natural arching UV-mapped desert date palm frond crown geometry.
 */
export function createDesertPalmCanopyGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const frondCount = 9;
  for (let f = 0; f < frondCount; f++) {
    const angle = (f / frondCount) * Math.PI * 2 + (f % 2) * 0.12;
    const pitchDrop = f % 2 === 0 ? 0.25 : 0.42;
    const frond = new THREE.PlaneGeometry(1.35, 2.85, 2, 5);
    const p = frond.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i);
      const ly = p.getY(i); // [-1.425 .. +1.425]
      const t = (ly + 1.425) / 2.85; // 0 at stem base -> 1 at tip
      const archY = Math.sin(t * Math.PI * 0.72) * (0.95 - pitchDrop) - t * t * (1.2 + pitchDrop);
      const outZ = t * 2.55;
      p.setXYZ(i, lx * (1 - t * 0.35), 4.05 + archY, 0.1 + outZ);
    }
    frond.rotateY(angle);
    appendTransformedGeometry(frond, positions, uvs);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.computeVertexNormals();
  return merged;
}

/**
 * Dug foxhole crater liner + parapet rim (dark excavated soil pit + sandbag & earth mounds).
 */
export function createFoxholeVisual(radius: number): THREE.Group {
  const group = new THREE.Group();
  const rockSet = typeof document !== 'undefined' ? getRockPbrSet('forest') : null;
  const stuccoSet = typeof document !== 'undefined' ? getStuccoPbrSet() : null;
  const deepSoilMat = makePbrMat(0x281c12, 0.98, 0.01, false, pbrSetProps(rockSet, 0.02, false));
  const dirtMat = makePbrMat(0x5b4a36, 0.96, 0.02, false, pbrSetProps(rockSet, 0.022));
  const bagMat = makePbrMat(0xb29c72, 0.92, 0.02, false, pbrSetProps(stuccoSet, 0.016));

  // Dark recessed soil pit disc + sloping inner crater wall
  const pitWallGeo = new THREE.CylinderGeometry(radius * 0.88, radius * 0.56, 0.78, 18, 1, true);
  const pitWallMat = makePbrMat(0x3a2a1c, 0.97, 0.01, false, {
    side: THREE.DoubleSide,
    ...pbrSetProps(rockSet, 0.02, false),
  });
  const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
  pitWall.position.y = -0.32;
  pitWall.receiveShadow = true;

  const pitFloor = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.62, 16), deepSoilMat);
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
      i % 3 === 0 ? new THREE.CapsuleGeometry(0.24, 0.52, 4, 8) : new THREE.SphereGeometry(0.45, 10, 8),
      i % 3 === 0 ? bagMat : dirtMat,
    );
    mound.position.set(bx, 0.22, bz);
    mound.rotation.y = a;
    if (i % 3 === 0) mound.rotation.z = Math.PI / 2;
    mound.scale.set(1.3, 0.72, 1.15);
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
  const stuccoSet = typeof document !== 'undefined' ? getStuccoPbrSet() : null;
  const rockSet = typeof document !== 'undefined' ? getRockPbrSet('desert') : null;
  const timberSet = typeof document !== 'undefined' ? getTimberPbrSet() : null;
  const adobeMat = makePbrMat(0xdcb988, 0.9, 0.02, false, pbrSetProps(stuccoSet, 0.018));
  const trimSandMat = makePbrMat(0xc39b66, 0.92, 0.02, false, pbrSetProps(rockSet, 0.02));
  const cedarMat = makePbrMat(0x664428, 0.82, 0.04, false, pbrSetProps(timberSet, 0.014));
  const stoneFloorMat = makePbrMat(0x9b8362, 0.94, 0.02, false, pbrSetProps(rockSet, 0.015));

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
  const rockSet = typeof document !== 'undefined' ? getRockPbrSet('normandy') : null;
  const timberSet = typeof document !== 'undefined' ? getTimberPbrSet() : null;
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const stoneMat = makePbrMat(0x969186, 0.9, 0.04, false, pbrSetProps(rockSet, 0.02));
  const darkStoneMat = makePbrMat(0x6d6860, 0.94, 0.05, false, pbrSetProps(rockSet, 0.02));
  const slateMat = makePbrMat(0x464e59, 0.68, 0.14, false, pbrSetProps(steelSet, 0.01));
  const oakMat = makePbrMat(0x5b402a, 0.82, 0.04, false, pbrSetProps(timberSet, 0.014));

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
  const brickSet = typeof document !== 'undefined' ? getBrickPbrSet() : null;
  const concreteSet = typeof document !== 'undefined' ? getConcretePbrSet() : null;
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const brickMat = makePbrMat(0xc88a78, 0.9, 0.04, false, pbrSetProps(brickSet, 0.022));
  const sootMat = makePbrMat(0x4e4c4f, 0.94, 0.06, false, pbrSetProps(concreteSet, 0.016));
  const ironMat = makePbrMat(0x3a4148, 0.44, 0.74, false, pbrSetProps(steelSet, 0.01));
  const floorMat = makePbrMat(0x5a5e62, 0.92, 0.08, false, pbrSetProps(concreteSet, 0.014));

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
  const steelSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const rustSteelMat = makePbrMat(
    variant === 'tank' ? 0x62584b : 0x693733,
    0.72,
    0.52,
    false,
    pbrSetProps(steelSet, 0.014),
  );
  const sootMat = makePbrMat(0x2d2c2b, 0.86, 0.3, false, pbrSetProps(steelSet, 0.012, false));

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
  frontWheelPivots: [THREE.Group, THREE.Group];
  wheelSuspensionPivots: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  shockStruts: [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
  steerWheel: THREE.Object3D;
  driverMesh: THREE.Group;
  cockpitAnchor: THREE.Object3D;
}

export function createMilitaryJeep(team: Team): MilitaryJeepRig {
  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);

  const isAllies = team === 'allies';
  const armorSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const rubberSet = typeof document !== 'undefined' ? getRubberTreadPbrSet() : null;
  const bduSet = typeof document !== 'undefined' ? getBduCamoPbrSet(team) : null;
  const paintMat = makePbrMat(
    isAllies ? 0x556845 : 0x69675f,
    0.58,
    0.26,
    false,
    pbrSetProps(armorSet, 0.01),
  );
  const darkTrimMat = makePbrMat(0x2a2e32, 0.44, 0.68, false, pbrSetProps(armorSet, 0.008, false));
  const glassMat = makePbrMat(0x3a5468, 0.1, 0.32, false, { transparent: true, opacity: 0.72 });
  const tireMat = makePbrMat(0x222528, 0.88, 0.05, false, pbrSetProps(rubberSet, 0.025));
  const rimMat = makePbrMat(isAllies ? 0x455339 : 0x525049, 0.48, 0.48, false, pbrSetProps(armorSet, 0.008));
  const seatMat = makePbrMat(0x56412b, 0.84, 0.04);
  const accentMat = makePbrMat(isAllies ? 0x2563eb : 0xb91c1c, 0.52, 0.22);
  const canvasMat = makePbrMat(
    isAllies ? 0x7a7d64 : 0x7e7667,
    0.9,
    0.04,
    false,
    pbrSetProps(bduSet, 0.01),
  );

  // Sculpted side-profile Military Jeep tub + sloped hood + wheel-well cutouts (ExtrudeGeometry)
  const tubGeo = createExtrudedProfile(
    [
      [-2.14, 0.58],
      [-2.14, 1.38],
      [-1.08, 1.38],
      [-0.86, 1.46],
      [0.42, 1.46],
      [0.58, 1.3],
      [2.05, 1.2],
      [2.12, 0.74],
      [1.82, 0.62],
      [1.72, 0.92],
      [1.02, 0.92],
      [0.88, 0.58],
      [-0.92, 0.58],
      [-1.06, 0.92],
      [-1.72, 0.92],
      [-1.88, 0.58],
    ],
    1.98,
    0.04,
  );
  const mainBody = new THREE.Mesh(tubGeo, paintMat);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  chassis.add(mainBody);

  // Raised contoured hood cowl + engine vents
  const hoodCowl = new THREE.Mesh(
    createExtrudedProfile(
      [
        [0.54, 1.28],
        [2.06, 1.18],
        [2.06, 1.36],
        [0.54, 1.48],
      ],
      1.36,
      0.04,
    ),
    paintMat,
  );
  hoodCowl.castShadow = true;
  chassis.add(hoodCowl);

  // Flared trapezoid fender arches over front & rear wheels
  for (const fx of [-1.06, 1.06]) {
    const fFender = new THREE.Mesh(
      createExtrudedProfile(
        [
          [0.92, 0.94],
          [1.84, 0.94],
          [1.68, 1.14],
          [1.08, 1.14],
        ],
        0.38,
        0.02,
      ),
      paintMat,
    );
    fFender.position.x = fx;
    const rFender = new THREE.Mesh(
      createExtrudedProfile(
        [
          [-1.72, 0.94],
          [-0.92, 0.94],
          [-1.04, 1.14],
          [-1.62, 1.14],
        ],
        0.38,
        0.02,
      ),
      paintMat,
    );
    rFender.position.x = fx;
    chassis.add(fFender, rFender);
  }

  // Heavy steel front bull-bar bumper + tow hooks + winch drum
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.18, 0.24), darkTrimMat);
  bumper.position.set(0, 0.6, 2.24);
  const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 10), darkTrimMat);
  winch.rotation.z = Math.PI / 2;
  winch.position.set(0, 0.68, 2.22);

  // Iconic 7-slot military radiator grille + recessed headlights
  const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 0.08), paintMat);
  grilleFrame.position.set(0, 1.06, 2.1);
  for (let s = -3; s <= 3; s++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.095), darkTrimMat);
    slot.position.set(s * 0.145, 1.06, 2.11);
    chassis.add(slot);
  }
  for (const hx of [-0.72, 0.72]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 10), darkTrimMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(hx, 1.08, 2.1);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10),
      makePbrMat(0xfef08a, 0.18, 0.1, false, { emissive: 0xfacc15, emissiveIntensity: 0.55 }),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(hx, 1.08, 2.11);
    chassis.add(bezel, lens);
  }

  // Framed split armored windshield + wiper arms
  const winFrame = new THREE.Group();
  winFrame.position.set(0, 1.72, 0.55);
  winFrame.rotation.x = -0.24;
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.56, 0.04), glassMat);
  const winTopBar = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.07, 0.08), darkTrimMat);
  winTopBar.position.y = 0.29;
  const winBotBar = winTopBar.clone();
  winBotBar.position.y = -0.29;
  const winMidBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.07), darkTrimMat);
  winFrame.add(winGlass, winTopBar, winBotBar, winMidBar);
  for (const sx of [-0.95, 0.95]) {
    const sideStanchion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.08), darkTrimMat);
    sideStanchion.position.x = sx;
    winFrame.add(sideStanchion);
  }
  chassis.add(winFrame);

  // Tubular steel roll-cage (TubeGeometry arches)
  const cageCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.92, 1.38, -0.95),
    new THREE.Vector3(-0.9, 2.34, -0.88),
    new THREE.Vector3(0.9, 2.34, -0.88),
    new THREE.Vector3(0.92, 1.38, -0.95),
  ]);
  const rollCage = new THREE.Mesh(new THREE.TubeGeometry(cageCurve, 14, 0.055, 8, false), darkTrimMat);
  rollCage.castShadow = true;
  chassis.add(rollCage);

  // Bucket seats & steering column
  for (const sx of [-0.42, 0.42]) {
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.5), seatMat);
    seatBase.position.set(sx, 1.08, -0.25);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.56, 0.12), seatMat);
    seatBack.position.set(sx, 1.36, -0.52);
    seatBack.rotation.x = -0.15;
    chassis.add(seatBase, seatBack);
  }
  const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.62, 8), darkTrimMat);
  steerCol.rotation.x = 0.62;
  steerCol.position.set(-0.42, 1.36, 0.22);
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 14), darkTrimMat);
  steerWheel.rotation.x = 0.62;
  steerWheel.position.set(-0.42, 1.56, 0.08);
  chassis.add(steerCol, steerWheel);

  // Detailed Interior Cab Dashboard, Dials, Gearshift, Rear-view Mirror & Cockpit Camera Anchor
  const dashBody = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.34, 0.32), darkTrimMat);
  dashBody.position.set(0, 1.36, 0.42);
  const dashPad = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.07, 0.35), seatMat);
  dashPad.position.set(0, 1.53, 0.42);
  chassis.add(dashBody, dashPad);

  const dialFaceMat = makePbrMat(0x162020, 0.2, 0.1, false, {
    emissive: 0xd97706,
    emissiveIntensity: 0.42,
  });
  for (const gx of [-0.54, -0.41, -0.28, -0.14]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.03, 12), darkTrimMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(gx, 1.43, 0.255);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), dialFaceMat);
    dial.rotation.y = Math.PI;
    dial.position.set(gx, 1.43, 0.238);
    chassis.add(bezel, dial);
  }
  const gearStick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 8), darkTrimMat);
  gearStick.rotation.x = -0.22;
  gearStick.position.set(-0.08, 1.18, 0.05);
  const gearKnob = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), seatMat);
  gearKnob.position.set(-0.08, 1.39, 0.01);
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.03), darkTrimMat);
  mirror.position.set(0, 1.96, 0.46);
  chassis.add(gearStick, gearKnob, mirror);

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.position.set(-0.42, 1.84, -0.22);
  chassis.add(cockpitAnchor);

  const driverMesh = buildSeatedSoldierMesh(team, false);
  driverMesh.position.set(-0.42, 0.98, -0.25);
  chassis.add(driverMesh);

  // Rear canvas pack, spare wheel & steel jerrycan
  const teamStripe = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.04, 0.42), accentMat);
  teamStripe.position.set(0, 1.44, 1.38);
  const rearPack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 0.78), canvasMat);
  rearPack.position.set(0, 1.46, -1.62);
  const jerryCan = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.34), makePbrMat(0x3a4a2b, 0.6, 0.35, true));
  jerryCan.position.set(0.68, 1.15, -2.18);
  const spareTire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 8, 14), tireMat);
  spareTire.position.set(-0.22, 1.12, -2.22);
  const spareHub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10), rimMat);
  spareHub.rotation.x = Math.PI / 2;
  spareHub.position.set(-0.22, 1.12, -2.22);

  chassis.add(bumper, winch, grilleFrame, teamStripe, rearPack, jerryCan, spareTire, spareHub);

  // 4 treaded off-road wheels with steering pivots, independent suspension travel pivots & shock struts
  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const wheelSuspensionPivots: [THREE.Group, THREE.Group, THREE.Group, THREE.Group] = [
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
  ];
  const shockStruts: THREE.Mesh[] = [];
  const wheelCoords: ReadonlyArray<readonly [number, number, boolean, number]> = [
    [-1.12, 1.38, true, 0],
    [1.12, 1.38, true, 1],
    [-1.12, -1.36, false, 2],
    [1.12, -1.36, false, 3],
  ];
  for (const [wx, wz, isFront, cornerIdx] of wheelCoords) {
    const suspPivot = wheelSuspensionPivots[cornerIdx];
    suspPivot.position.set(wx, 0.49, wz);
    root.add(suspPivot);

    // Visible coil shock strut connecting frame rail to lower control arm
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.56, 8), darkTrimMat);
    strut.position.set(wx * 0.78, 0.76, wz);
    strut.rotation.z = wx < 0 ? 0.18 : -0.18;
    root.add(strut);
    shockStruts.push(strut);

    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.34, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.36, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.39, 8), darkTrimMat);
    hub.rotation.z = Math.PI / 2;
    // Wheel lug bolts
    for (let b = 0; b < 5; b++) {
      const ang = (b * Math.PI * 2) / 5;
      const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 6), darkTrimMat);
      lug.rotation.z = Math.PI / 2;
      lug.position.set(0, Math.sin(ang) * 0.18, Math.cos(ang) * 0.18);
      wheelGroup.add(lug);
    }

    wheelGroup.add(tire, rim, hub);
    if (isFront) {
      const pivot = frontWheelPivots[cornerIdx];
      pivot.add(wheelGroup);
      suspPivot.add(pivot);
    } else {
      suspPivot.add(wheelGroup);
    }
    wheels.push(wheelGroup);
  }

  // Pintle-mounted M2 .50 cal heavy MG turret with perforated cooling jacket & ammo box
  const turret = new THREE.Group();
  turret.position.set(0, 2.38, -0.68);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 14), darkTrimMat);
  ring.rotation.x = Math.PI / 2;
  const gun = new THREE.Group();
  gun.position.set(0, 0.24, 0);
  const mgBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.72), darkTrimMat);
  const ammoTin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.24), paintMat);
  ammoTin.position.set(-0.16, -0.02, 0.05);
  const coolingJacket = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.52, 10), darkTrimMat);
  coolingJacket.rotation.x = Math.PI / 2;
  coolingJacket.position.set(0, 0.03, 0.62);
  const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.72, 8), darkTrimMat);
  mgBarrel.rotation.x = Math.PI / 2;
  mgBarrel.position.set(0, 0.03, 1.15);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.4, 0.05), paintMat);
  shield.position.set(0, 0.12, 0.42);
  shield.rotation.x = -0.15;

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.03, 1.54);
  const muzzleFlash = createRealisticMuzzleFlash(1.35);
  muzzleFlash.position.copy(muzzlePoint.position);

  gun.add(mgBody, ammoTin, coolingJacket, mgBarrel, shield, muzzlePoint, muzzleFlash);
  turret.add(ring, gun);
  chassis.add(turret);

  return {
    root,
    chassis,
    turret,
    gun,
    muzzlePoint,
    muzzleFlash,
    wheels,
    frontWheelPivots,
    wheelSuspensionPivots,
    shockStruts: shockStruts as [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh],
    steerWheel,
    driverMesh,
    cockpitAnchor,
  };
}

export interface BattleTankRig {
  root: THREE.Group;
  hull: THREE.Group;
  turret: THREE.Group;
  gun: THREE.Group;
  barrelGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Object3D;
  wheels: THREE.Object3D[];
  roadWheelGroups: THREE.Group[];
  driverMesh: THREE.Group;
  cockpitAnchor: THREE.Object3D;
}

export function createBattleTank(team: Team): BattleTankRig {
  const root = new THREE.Group();
  const hull = new THREE.Group();
  root.add(hull);

  const isAllies = team === 'allies';
  const armorSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const rubberSet = typeof document !== 'undefined' ? getRubberTreadPbrSet() : null;
  const armorMat = makePbrMat(
    isAllies ? 0x516445 : 0x616569,
    0.54,
    0.42,
    false,
    pbrSetProps(armorSet, 0.012),
  );
  const darkSteelMat = makePbrMat(0x272c31, 0.42, 0.74, false, pbrSetProps(armorSet, 0.008));
  const trackMat = makePbrMat(0x1f2124, 0.88, 0.22, false, pbrSetProps(rubberSet, 0.028));
  const accentMat = makePbrMat(isAllies ? 0x2563eb : 0xdc2626, 0.5, 0.2);

  // Sculpted sloped-glacis armored tank hull via ExtrudeGeometry (replaces flat box!)
  const hullProfile = createExtrudedProfile(
    [
      [-3.15, 0.62],
      [-3.32, 1.05],
      [-2.85, 1.44],
      [1.82, 1.48],
      [3.38, 1.04],
      [3.12, 0.6],
      [2.65, 0.44],
      [-2.65, 0.44],
    ],
    2.78,
    0.06,
  );
  const mainHull = new THREE.Mesh(hullProfile, armorMat);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;

  // Armored side sponsons overhanging tracks + rear radiator exhaust grille & tow shackles
  const sponson = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.24, 5.85), armorMat);
  sponson.position.set(0, 1.18, 0);
  sponson.castShadow = true;

  const engineGrille = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.45), darkSteelMat);
  engineGrille.position.set(0, 1.5, -1.92);

  for (const ex of [-0.75, 0.75]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.95, 8), darkSteelMat);
    exhaust.rotation.x = 1.25;
    exhaust.position.set(ex, 1.18, -3.12);
    const spareFuel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 10), armorMat);
    spareFuel.rotation.z = Math.PI / 2;
    spareFuel.position.set(ex * 1.45, 1.38, -2.55);
    hull.add(exhaust, spareFuel);
  }

  // Driver visor periscope hood + bow machine gun + tow shackles
  const driverHood = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.42), darkSteelMat);
  driverHood.position.set(-0.55, 1.42, 2.05);
  const bowMg = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.65, 8), darkSteelMat);
  bowMg.rotation.x = Math.PI / 2;
  bowMg.position.set(0.68, 1.24, 2.75);
  const emblem = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.55), accentMat);
  emblem.position.set(0, 1.52, 1.45);

  hull.add(mainHull, sponson, engineGrille, driverHood, bowMg, emblem);

  // Continuous wrap-around caterpillar tracks + sprockets + 6 road wheels + segmented track cleats
  const trackLoopGeo = createExtrudedProfile(
    [
      [-2.92, 0.1],
      [2.92, 0.1],
      [3.34, 0.72],
      [2.98, 1.08],
      [-2.98, 1.08],
      [-3.34, 0.72],
    ],
    0.72,
    0.03,
  );

  const wheels: THREE.Object3D[] = [];
  const roadWheelGroups: THREE.Group[] = [];
  for (const sx of [-1.74, 1.74]) {
    const trackBelt = new THREE.Mesh(trackLoopGeo, trackMat);
    trackBelt.position.set(sx, 0, 0);
    trackBelt.castShadow = true;
    hull.add(trackBelt);

    // Armored mudguards + segmented outer side skirts
    const fender = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.11, 6.45), armorMat);
    fender.position.set(sx, 1.15, 0);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 5.7), armorMat);
    skirt.position.set(sx + (sx < 0 ? -0.4 : 0.4), 0.92, 0);
    hull.add(fender, skirt);

    // Visible track tread grousers along top and slanted front/rear
    for (let g = -2.6; g <= 2.6; g += 0.52) {
      const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.14), darkSteelMat);
      cleat.position.set(sx, 1.11, g);
      hull.add(cleat);
    }

    // Drive sprocket (rear) + Idler wheel (front) + 5 heavy dual road wheels mounted on root for independent bogie travel
    for (const endZ of [-2.95, 2.95]) {
      const sprocket = new THREE.Group();
      sprocket.position.set(sx, 0.74, endZ);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.76, 12), darkSteelMat);
      disc.rotation.z = Math.PI / 2;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.84, 8), armorMat);
      cap.rotation.z = Math.PI / 2;
      sprocket.add(disc, cap);
      hull.add(sprocket);
      wheels.push(sprocket);
    }
    for (let w = 0; w < 5; w++) {
      const wz = -2.1 + w * 1.05;
      const bogieWrap = new THREE.Group();
      bogieWrap.position.set(sx, 0.42, wz);
      const wheelGroup = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.78, 12), darkSteelMat);
      outer.rotation.z = Math.PI / 2;
      const rimRing = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.81, 10), armorMat);
      rimRing.rotation.z = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.84, 8), darkSteelMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(outer, rimRing, hub);
      bogieWrap.add(wheelGroup);
      root.add(bogieWrap);
      wheels.push(wheelGroup);
      roadWheelGroups.push(bogieWrap);
    }
  }

  // Cast sloped angular Battle Tank Turret (ExtrudeGeometry) + smoke dischargers + cupola + 105mm gun
  const turret = new THREE.Group();
  turret.position.set(0, 1.56, 0.2);

  const turretSideGeo = createExtrudedProfile(
    [
      [-1.55, 0.04],
      [-1.72, 0.76],
      [0.45, 0.84],
      [1.35, 0.56],
      [1.35, 0.06],
    ],
    2.24,
    0.1,
  );
  const turretBody = new THREE.Mesh(turretSideGeo, armorMat);
  turretBody.castShadow = true;

  // Armored commander cupola with periscope blocks + open hatch ring + side stowage boxes
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.34, 12), darkSteelMat);
  cupola.position.set(-0.46, 0.94, -0.35);
  const hatchLid = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 10), armorMat);
  hatchLid.position.set(-0.46, 1.24, -0.74);
  hatchLid.rotation.x = -1.15;

  for (const sx of [-1.22, 1.22]) {
    const stowBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 1.15), darkSteelMat);
    stowBox.position.set(sx, 0.44, -0.45);
    turret.add(stowBox);
    // Triple 66mm smoke grenade discharger cluster on cheeks
    for (let g = 0; g < 3; g++) {
      const smokeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 6), darkSteelMat);
      smokeTube.rotation.x = 0.95;
      smokeTube.rotation.z = sx < 0 ? 0.25 : -0.25;
      smokeTube.position.set(sx * 0.92, 0.46 + g * 0.08, 0.65 - g * 0.14);
      turret.add(smokeTube);
    }
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 2.2, 5), darkSteelMat);
  antenna.position.set(0.75, 1.88, -1.2);

  const driverMesh = buildSeatedSoldierMesh(team, false);
  driverMesh.position.set(-0.46, 0.72, -0.35);
  turret.add(driverMesh);

  // Interior Gunner/Commander Optics Console, Periscope Frame & Azimuth Gauges
  const opticsHousing = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.28), darkSteelMat);
  opticsHousing.position.set(-0.34, 1.02, 0.44);
  const sightGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.14),
    makePbrMat(0x0d2820, 0.12, 0.2, false, {
      emissive: 0x10b981,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.65,
    }),
  );
  sightGlass.rotation.y = Math.PI;
  sightGlass.position.set(-0.34, 1.04, 0.295);
  const turretDial = new THREE.Mesh(
    new THREE.CircleGeometry(0.065, 12),
    makePbrMat(0x111827, 0.2, 0.1, false, { emissive: 0xf59e0b, emissiveIntensity: 0.45 }),
  );
  turretDial.rotation.y = Math.PI;
  turretDial.position.set(0.02, 0.98, 0.34);
  turret.add(opticsHousing, sightGlass, turretDial);

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.position.set(-0.34, 1.18, -0.05);
  turret.add(cockpitAnchor);

  const gun = new THREE.Group();
  gun.position.set(0, 0.44, 1.32);

  const barrelGroup = new THREE.Group();
  const mantlet = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.92, 10), darkSteelMat);
  mantlet.rotation.z = Math.PI / 2;

  const barrel = new THREE.Mesh(
    createLatheBarrel([
      [0.145, 0.0],
      [0.132, 1.55],
      [0.112, 3.65],
    ]),
    armorMat,
  );
  barrel.rotation.y = Math.PI;
  barrel.position.set(0, 0, 0.15);
  barrel.castShadow = true;

  const boreEvacuator = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 12), armorMat);
  boreEvacuator.rotation.x = Math.PI / 2;
  boreEvacuator.position.set(0, 0, 1.78);

  const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.25, 0.44), darkSteelMat);
  muzzleBrake.position.set(0, 0, 3.88);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0, 4.18);
  const muzzleFlash = createRealisticMuzzleFlash(2.8);
  muzzleFlash.position.copy(muzzlePoint.position);

  barrelGroup.add(barrel, boreEvacuator, muzzleBrake, muzzlePoint, muzzleFlash);
  gun.add(mantlet, barrelGroup);
  turret.add(turretBody, cupola, hatchLid, antenna, gun);
  hull.add(turret);

  return {
    root,
    hull,
    turret,
    gun,
    barrelGroup,
    muzzlePoint,
    muzzleFlash,
    wheels,
    roadWheelGroups,
    driverMesh,
    cockpitAnchor,
  };
}

export interface CombatAircraftRig {
  root: THREE.Group;
  airframe: THREE.Group;
  propeller: THREE.Group;
  propDisc: THREE.Mesh;
  aileronL: THREE.Group;
  aileronR: THREE.Group;
  elevator: THREE.Group;
  rudder: THREE.Group;
  landingGear: THREE.Group;
  wingBombs: [THREE.Object3D, THREE.Object3D];
  wingMissiles: [THREE.Object3D, THREE.Object3D];
  muzzleL: THREE.Object3D;
  muzzleR: THREE.Object3D;
  muzzleFlashL: THREE.Object3D;
  muzzleFlashR: THREE.Object3D;
  pilotMesh: THREE.Group;
  cockpitAnchor: THREE.Object3D;
}

export function createCombatAircraft(
  team: Team,
  variant: 'fighter' | 'attacker' = 'fighter',
): CombatAircraftRig {
  const root = new THREE.Group();
  const airframe = new THREE.Group();
  root.add(airframe);

  const isAllies = team === 'allies';
  const isAttacker = variant === 'attacker';
  const armorSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const gunSet = typeof document !== 'undefined' ? getGunmetalPbrSet() : null;
  const bodyMat = makePbrMat(
    isAttacker ? (isAllies ? 0x475a42 : 0x565d65) : isAllies ? 0x5b7053 : 0x626871,
    0.38,
    0.6,
    false,
    pbrSetProps(armorSet, 0.008),
  );
  const underMat = makePbrMat(0xa3aab5, 0.44, 0.46, false, pbrSetProps(armorSet, 0.006));
  const canopyMat = makePbrMat(0x284d6b, 0.08, 0.3, false, { transparent: true, opacity: 0.58 });
  const darkMetal = makePbrMat(0x22272d, 0.36, 0.82, false, pbrSetProps(gunSet, 0.004));
  const wingStripeMat = makePbrMat(
    isAttacker ? (isAllies ? 0xe5940b : 0xb91c1c) : isAllies ? 0x2563eb : 0xdc2626,
    0.46,
    0.22,
  );
  const ordnanceMat = makePbrMat(0x414a37, 0.46, 0.35, false, pbrSetProps(armorSet, 0.006));
  const missileBodyMat = makePbrMat(0xe5e7eb, 0.34, 0.42, false, pbrSetProps(gunSet, 0.003, false));

  // Streamlined tapered fighter fuselage + underbelly P-51 style radiator scoop
  const fuselage = new THREE.Mesh(
    createLatheBarrel([
      [0.12, -3.95],
      [0.44, -2.2],
      [0.62, 0.0],
      [0.64, 1.85],
      [0.54, 3.25],
      [0.34, 3.88],
    ]),
    bodyMat,
  );
  fuselage.rotation.y = Math.PI;
  fuselage.castShadow = true;

  const bellyScoop = new THREE.Mesh(
    createExtrudedProfile(
      [
        [-1.35, -0.45],
        [0.45, -0.42],
        [0.32, -0.82],
        [-1.15, -0.78],
      ],
      0.56,
      0.04,
    ),
    underMat,
  );
  const scoopIntake = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.08), darkMetal);
  scoopIntake.position.set(0, -0.62, 0.4);
  airframe.add(bellyScoop, scoopIntake);

  // Exhaust manifold stubs along nose cowling
  for (const sx of [-0.52, 0.52]) {
    for (let e = 0; e < 4; e++) {
      const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.18, 6), darkMetal);
      stub.rotation.z = sx < 0 ? -0.8 : 0.8;
      stub.position.set(sx, 0.06, 2.25 + e * 0.24);
      airframe.add(stub);
    }
  }

  // Framed bubble canopy with structural ribs + visible pilot seated inside cockpit
  const canopy = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.48, 6, 12), canopyMat);
  canopy.rotation.x = Math.PI / 2;
  canopy.position.set(0, 0.56, 0.32);
  for (const cz of [-0.35, 0.25, 0.82]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 12, Math.PI), darkMetal);
    rib.position.set(0, 0.52, cz);
    airframe.add(rib);
  }

  const pilotMesh = buildSeatedSoldierMesh(team, true);
  pilotMesh.position.set(0, 0.22, 0.32);
  airframe.add(pilotMesh);

  // Detailed Fighter Cockpit Instrument Panel, Control Stick, Reflector Gunsight & Interior Camera Anchor
  const acPanel = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.18), darkMetal);
  acPanel.position.set(0, 0.56, 0.88);
  airframe.add(acPanel);
  const acDialMat = makePbrMat(0x0f172a, 0.18, 0.1, false, {
    emissive: 0x38bdf8,
    emissiveIntensity: 0.45,
  });
  for (const [gx, gy] of [
    [-0.16, 0.6],
    [0, 0.61],
    [0.16, 0.6],
    [-0.09, 0.51],
    [0.09, 0.51],
  ]) {
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.042, 10), acDialMat);
    dial.rotation.y = Math.PI;
    dial.position.set(gx, gy, 0.785);
    airframe.add(dial);
  }
  const reflectorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.14),
    makePbrMat(0x34d399, 0.08, 0.2, false, {
      transparent: true,
      opacity: 0.35,
      emissive: 0x10b981,
      emissiveIntensity: 0.4,
    }),
  );
  reflectorGlass.position.set(0, 0.74, 0.9);
  reflectorGlass.rotation.x = -0.35;
  const controlStick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.32, 8), darkMetal);
  controlStick.position.set(0, 0.4, 0.62);
  airframe.add(reflectorGlass, controlStick);

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.position.set(0, 0.84, 0.26);
  airframe.add(cockpitAnchor);

  // Swept tapered extruded main wings + aerodynamic wingroot fillets + wingtip nav lights
  const buildSweptWing = (side: -1 | 1) => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.68);
    s.lineTo(side * 5.75, 0.35);
    s.lineTo(side * 5.75, -0.65);
    s.lineTo(0, -0.78);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
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

  // Red/Green wingtip navigation lights + countermeasure flare dispenser pods
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 5),
    makePbrMat(0xef4444, 0.2, 0.1, false, { emissive: 0xef4444, emissiveIntensity: 0.7 }),
  );
  navL.position.set(6.05, -0.02, 0.35);
  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 5),
    makePbrMat(0x22c55e, 0.2, 0.1, false, { emissive: 0x22c55e, emissiveIntensity: 0.7 }),
  );
  navR.position.set(-6.05, -0.02, 0.35);
  airframe.add(navL, navR);

  // Animated Wing Ailerons (Left +X / Right -X when viewed along +Z)
  const aileronL = new THREE.Group();
  aileronL.position.set(3.8, -0.05, -0.2);
  const ailMeshL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.38), wingStripeMat);
  ailMeshL.position.set(0, 0, -0.15);
  aileronL.add(ailMeshL);

  const aileronR = new THREE.Group();
  aileronR.position.set(-3.8, -0.05, -0.2);
  const ailMeshR = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.38), wingStripeMat);
  ailMeshR.position.set(0, 0, -0.15);
  aileronR.add(ailMeshR);

  for (const wx of [-4.1, 4.1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 1.15), wingStripeMat);
    stripe.position.set(wx, -0.02, 0.4);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.4, 8), darkMetal);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(wx * 0.62, -0.25, 0.65);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.25, 8), darkMetal);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(wx * 0.58, -0.08, 1.42);
    const flarePod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.62), darkMetal);
    flarePod.position.set(wx * 0.35, -0.24, -0.55);
    airframe.add(stripe, pod, cannon, flarePod);
    if (isAttacker) {
      const twinNacelle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 1.75, 10),
        bodyMat,
      );
      twinNacelle.rotation.x = Math.PI / 2;
      twinNacelle.position.set(wx * 0.48, -0.14, 1.05);
      const podIntake = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), darkMetal);
      podIntake.rotation.x = Math.PI / 2;
      podIntake.position.set(wx * 0.48, -0.14, 1.94);
      airframe.add(twinNacelle, podIntake);
    }
  }

  // Underwing Air-to-Ground Bombs + Heat-Seeking IR Missiles
  const buildUnderwingBomb = (bx: number) => {
    const bGrp = new THREE.Group();
    bGrp.position.set(bx, -0.45, 0.35);
    const bBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 4, 8), ordnanceMat);
    bBody.rotation.x = Math.PI / 2;
    const bFin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.18), wingStripeMat);
    bFin.position.z = -0.46;
    bGrp.add(bBody, bFin);
    airframe.add(bGrp);
    return bGrp;
  };
  const wingBombs: [THREE.Object3D, THREE.Object3D] = [
    buildUnderwingBomb(-1.85),
    buildUnderwingBomb(1.85),
  ];

  const buildUnderwingMissile = (mx: number) => {
    const mGrp = new THREE.Group();
    mGrp.position.set(mx, -0.34, 0.55);
    const mTube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.55, 8), missileBodyMat);
    mTube.rotation.x = Math.PI / 2;
    const mNose = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 8), darkMetal);
    mNose.rotation.x = Math.PI / 2;
    mNose.position.z = 0.88;
    const mFins = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.14), wingStripeMat);
    mFins.position.z = -0.62;
    mGrp.add(mTube, mNose, mFins);
    airframe.add(mGrp);
    return mGrp;
  };
  const wingMissiles: [THREE.Object3D, THREE.Object3D] = [
    buildUnderwingMissile(-3.1),
    buildUnderwingMissile(3.1),
  ];

  // Retractable landing gear assembly
  const landingGear = new THREE.Group();
  landingGear.position.set(0, -0.18, 0.85);
  for (const gx of [-1.45, 1.45]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 6), darkMetal);
    strut.position.set(gx, -0.34, 0);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10), darkMetal);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(gx, -0.7, 0);
    landingGear.add(strut, wheel);
  }
  airframe.add(landingGear);

  // Swept horizontal tailplane + animated elevator & tapered vertical stabilizer
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.95), underMat);
  tailWing.position.set(0, 0.1, -3.25);

  const elevator = new THREE.Group();
  elevator.position.set(0, 0.1, -3.72);
  const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.36), wingStripeMat);
  elevMesh.position.z = -0.15;
  elevator.add(elevMesh);

  const tailFin = new THREE.Mesh(
    createExtrudedProfile(
      [
        [-2.75, 0.1],
        [-3.62, 0.1],
        [-3.52, 1.48],
        [-3.08, 1.48],
      ],
      0.13,
      0.02,
    ),
    bodyMat,
  );

  const rudder = new THREE.Group();
  rudder.position.set(0, 0.72, -3.6);
  const rudderFlap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.32, 0.44), wingStripeMat);
  rudderFlap.position.z = -0.2;
  rudderFlap.rotation.x = -0.12;
  rudder.add(rudderFlap);

  // Spinning nose spinner, 3 tapered propeller blades + translucent high-RPM blur disc
  const propeller = new THREE.Group();
  propeller.position.set(0, 0, 3.94);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 12), wingStripeMat);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.25;
  propeller.add(spinner);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.38, 0.045), darkMetal);
    blade.rotation.z = (b * Math.PI * 2) / 3;
    blade.position.set(
      Math.cos((b * Math.PI * 2) / 3 + Math.PI / 2) * 0.68,
      Math.sin((b * Math.PI * 2) / 3 + Math.PI / 2) * 0.68,
      0,
    );
    propeller.add(blade);
  }
  const propDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.36, 20),
    new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  propDisc.position.z = 3.94;
  propDisc.visible = false;

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
    aileronL,
    aileronR,
    tailWing,
    elevator,
    tailFin,
    rudder,
    propeller,
    propDisc,
    muzzleL,
    muzzleR,
    muzzleFlashL,
    muzzleFlashR,
  );
  return {
    root,
    airframe,
    propeller,
    propDisc,
    aileronL,
    aileronR,
    elevator,
    rudder,
    landingGear,
    wingBombs,
    wingMissiles,
    muzzleL,
    muzzleR,
    muzzleFlashL,
    muzzleFlashR,
    pilotMesh,
    cockpitAnchor,
  };
}

export interface CombatHelicopterRig {
  root: THREE.Group;
  airframe: THREE.Group;
  mainRotor: THREE.Group;
  mainRotorDisc: THREE.Mesh;
  tailRotor: THREE.Group;
  gunTurret: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Object3D;
  pilotMesh: THREE.Group;
  cockpitAnchor: THREE.Object3D;
}

/**
 * Builds a sleek, contoured attack/utility Combat Helicopter with sculpted nose,
 * twin turbines, greenhouse cockpit interior + instrument gauges, articulated 4-blade
 * main rotor, tail boom + tail rotor, landing skids, winglet rocket pods, and chin 20mm autocannon.
 */
export function createCombatHelicopter(team: Team): CombatHelicopterRig {
  const root = new THREE.Group();
  const airframe = new THREE.Group();
  root.add(airframe);

  const isAllies = team === 'allies';
  const armorSet = typeof document !== 'undefined' ? getArmorSteelPbrSet() : null;
  const gunSet = typeof document !== 'undefined' ? getGunmetalPbrSet() : null;

  const hullMat = makePbrMat(
    isAllies ? 0x4b5941 : 0x515860,
    0.46,
    0.42,
    false,
    pbrSetProps(armorSet, 0.01),
  );
  const darkMetal = makePbrMat(0x202429, 0.38, 0.78, false, pbrSetProps(gunSet, 0.005));
  const canopyMat = makePbrMat(0x254863, 0.08, 0.28, false, { transparent: true, opacity: 0.45 });
  const accentMat = makePbrMat(isAllies ? 0x2563eb : 0xdc2626, 0.48, 0.22);

  // Sculpted streamlined attack fuselage via ExtrudeGeometry (no boxy cubes!)
  const fuselageGeo = createExtrudedProfile(
    [
      [-1.95, 0.15],
      [-1.75, 1.38],
      [-0.45, 1.72],
      [0.85, 1.56],
      [2.65, 0.72],
      [3.35, 0.34],
      [3.12, -0.02],
      [1.8, -0.18],
      [-1.55, -0.14],
    ],
    1.56,
    0.12,
  );
  const fuselage = new THREE.Mesh(fuselageGeo, hullMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  airframe.add(fuselage);

  // Twin upper turbine engine nacelles & angled intakes
  for (const tx of [-0.52, 0.52]) {
    const nacelle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 1.75, 5, 10),
      hullMat,
    );
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(tx, 1.62, -0.45);
    nacelle.castShadow = true;
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.48, 10), darkMetal);
    exhaust.rotation.x = Math.PI / 2 - 0.12;
    exhaust.position.set(tx, 1.58, -1.52);
    airframe.add(nacelle, exhaust);
  }

  // Tapered tail boom + horizontal stabilizers + swept vertical tail fin
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, 4.9, 10), hullMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.position.set(0, 0.96, -4.15);
  tailBoom.castShadow = true;
  const tailFin = new THREE.Mesh(
    createExtrudedProfile(
      [
        [-5.75, 0.92],
        [-6.65, 0.92],
        [-7.12, 2.35],
        [-6.35, 2.35],
      ],
      0.16,
      0.02,
    ),
    hullMat,
  );
  const tailStab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.1, 0.54), accentMat);
  tailStab.position.set(0, 0.98, -5.85);
  airframe.add(tailBoom, tailFin, tailStab);

  // Stub weapon winglets + 7-tube Hydra rocket pods & AGM pylons
  for (const wx of [-1.75, 1.75]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.95), hullMat);
    wing.position.set(wx * 0.72, 0.55, 0.22);
    wing.rotation.z = wx < 0 ? 0.08 : -0.08;
    const rocketPod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.48, 12), darkMetal);
    rocketPod.rotation.x = Math.PI / 2;
    rocketPod.position.set(wx * 0.96, 0.34, 0.38);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.2, 12), accentMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(wx * 0.96, 0.34, 0.82);
    airframe.add(wing, rocketPod, band);
  }

  // Tubular steel landing skids
  for (const sx of [-1.05, 1.05]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.3, 8), darkMetal);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -0.78, 0.45);
    const strutF = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 6), darkMetal);
    strutF.rotation.z = sx < 0 ? 0.24 : -0.24;
    strutF.position.set(sx * 0.85, -0.4, 1.35);
    const strutR = strutF.clone();
    strutR.position.z = -0.65;
    airframe.add(skid, strutF, strutR);
  }

  // Armored Glass Cockpit Greenhouse + Full Interior Console + Cockpit Anchor
  const canopyShell = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.82, 2.05), canopyMat);
  canopyShell.position.set(0, 1.12, 1.62);
  canopyShell.rotation.x = 0.22;
  airframe.add(canopyShell);
  for (const fx of [-0.6, 0.6]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.88, 0.08), darkMetal);
    pillar.position.set(fx, 1.1, 2.52);
    pillar.rotation.x = 0.42;
    airframe.add(pillar);
  }

  const heliDash = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 0.42), darkMetal);
  heliDash.position.set(0, 0.78, 2.48);
  airframe.add(heliDash);
  const mfdMat = makePbrMat(0x0b1f18, 0.14, 0.1, false, {
    emissive: 0x22c55e,
    emissiveIntensity: 0.5,
  });
  for (const mx of [-0.24, 0.24]) {
    const mfd = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.18), mfdMat);
    mfd.rotation.y = Math.PI;
    mfd.position.set(mx, 0.84, 2.265);
    airframe.add(mfd);
  }
  const cyclic = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.42, 8), darkMetal);
  cyclic.position.set(0, 0.64, 2.05);
  airframe.add(cyclic);

  const pilotMesh = buildSeatedSoldierMesh(team, true);
  pilotMesh.position.set(0, 0.52, 1.55);
  airframe.add(pilotMesh);

  const cockpitAnchor = new THREE.Object3D();
  cockpitAnchor.position.set(0, 1.24, 1.72);
  airframe.add(cockpitAnchor);

  // Chin 20mm rotary autocannon turret
  const gunTurret = new THREE.Group();
  gunTurret.position.set(0, -0.22, 2.75);
  const turretPod = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), darkMetal);
  const barrelCluster = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.25, 8), darkMetal);
  barrelCluster.rotation.x = Math.PI / 2;
  barrelCluster.position.set(0, -0.05, 0.65);
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, -0.05, 1.32);
  const muzzleFlash = createRealisticMuzzleFlash(1.65);
  muzzleFlash.position.copy(muzzlePoint.position);
  gunTurret.add(turretPod, barrelCluster, muzzlePoint, muzzleFlash);
  airframe.add(gunTurret);

  // Main 4-Blade Rotor Mast + Blades + High-RPM Blur Disc
  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 2.15, 0.08);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 10), darkMetal);
  mast.position.y = -0.22;
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.18, 12), darkMetal);
  mainRotor.add(mast, hubCap);
  for (let b = 0; b < 4; b++) {
    const bladeWrap = new THREE.Group();
    bladeWrap.rotation.y = (b * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 5.2), darkMetal);
    blade.position.z = 2.65;
    blade.castShadow = true;
    const tipStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.044, 0.34),
      makePbrMat(0xf59e0b, 0.5, 0.1),
    );
    tipStripe.position.z = 5.05;
    bladeWrap.add(blade, tipStripe);
    mainRotor.add(bladeWrap);
  }
  const mainRotorDisc = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 28),
    new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mainRotorDisc.rotation.x = -Math.PI / 2;
  mainRotorDisc.position.set(0, 2.16, 0.08);
  mainRotorDisc.visible = true;
  airframe.add(mainRotor, mainRotorDisc);

  // Tail Anti-Torque Rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.22, 1.98, -6.78);
  for (let b = 0; b < 2; b++) {
    const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.45, 0.12), darkMetal);
    tBlade.rotation.x = (b * Math.PI) / 2;
    tailRotor.add(tBlade);
  }
  airframe.add(tailRotor);

  return {
    root,
    airframe,
    mainRotor,
    mainRotorDisc,
    tailRotor,
    gunTurret,
    muzzlePoint,
    muzzleFlash,
    pilotMesh,
    cockpitAnchor,
  };
}

/**
 * Visible 3D billowing parachute canopy & suspension risers for aerial bailout.
 */
export function createParachuteCanopy(): THREE.Group {
  const group = new THREE.Group();
  const bduSet = typeof document !== 'undefined' ? getBduCamoPbrSet('allies') : null;
  const canopyMat = makePbrMat(0x6e7e5d, 0.86, 0.03, false, {
    side: THREE.DoubleSide,
    ...pbrSetProps(bduSet, 0.008),
  });
  const trimMat = makePbrMat(0xd6cdb8, 0.88, 0.02, false, { side: THREE.DoubleSide });
  const cordMat = makePbrMat(0x1f2421, 0.7, 0.1);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3.1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    canopyMat,
  );
  dome.position.y = 3.4;
  dome.scale.set(1, 0.68, 1);

  const skirtRing = new THREE.Mesh(new THREE.TorusGeometry(3.04, 0.08, 8, 24), trimMat);
  skirtRing.rotation.x = Math.PI / 2;
  skirtRing.position.y = 3.55;
  group.add(dome, skirtRing);

  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI * 2) / 8;
    const tx = Math.cos(ang) * 2.95;
    const tz = Math.sin(ang) * 2.95;
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(tx * 0.25, 0.35, tz * 0.25),
      new THREE.Vector3(tx, 3.55, tz),
    );
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 0.014, 4, false), cordMat);
    group.add(cord);
  }
  return group;
}


