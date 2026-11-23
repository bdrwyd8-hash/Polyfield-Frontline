import * as THREE from 'three';
import type { CampaignSceneArchetype, CampaignWeather } from './campaignData';
import type { ObstacleBox } from './rules';
import {
  getAsphaltPbrSet,
  getBrickPbrSet,
  getConcretePbrSet,
  getRockPbrSet,
  getWoodStockPbrSet,
} from './pbrTextures';

export interface CampaignTargetProp {
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  radius: number;
  hit: boolean;
}

export interface CampaignTriggerPoint {
  id: string;
  labelEn: string;
  labelAr: string;
  x: number;
  z: number;
  radius: number;
  activated: boolean;
}

export interface CampaignTruckRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  passengerAnchor: THREE.Object3D;
  seatOffsets: Array<{ x: number; y: number; z: number; rotY: number }>;
}

export interface CampaignSetHandle {
  group: THREE.Group;
  obstacles: ObstacleBox[];
  targets: CampaignTargetProp[];
  triggerPoints: CampaignTriggerPoint[];
  truckRig?: CampaignTruckRig;
  convoyMeshes: THREE.Group[];
  rainSystem?: THREE.Points;
  beacons: THREE.Mesh[];
  update(timeSec: number, dt: number, playerPos: THREE.Vector3): void;
  dispose(): void;
}

function makeMat(
  color: number,
  roughness = 0.78,
  metalness = 0.08,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra,
  });
}

function addBoxObstacle(
  parent: THREE.Group,
  obstacles: ObstacleBox[],
  x: number,
  yBase: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  collide = true,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, yBase + h * 0.5, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (collide) {
    obstacles.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      height: h,
    });
  }
  return mesh;
}

function buildMilitaryTransportTruck(paintHex = 0x5c553e): CampaignTruckRig {
  const root = new THREE.Group();
  const bodyMat = makeMat(paintHex, 0.72, 0.22);
  const darkMat = makeMat(0x232629, 0.55, 0.55);
  const woodMat = makeMat(0x6b4c30, 0.85, 0.04);
  const canvasMat = makeMat(0x736b53, 0.9, 0.03, { side: THREE.DoubleSide });
  const glassMat = makeMat(0x3a5264, 0.14, 0.25, { transparent: true, opacity: 0.72 });

  // Steel frame rails & front armored cab
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.36, 7.6), darkMat);
  chassis.position.set(0, 0.78, 0);
  chassis.castShadow = true;
  root.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.02, 1.85), bodyMat);
  hood.position.set(0, 1.45, 2.78);
  hood.castShadow = true;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.56, 1.55), bodyMat);
  cab.position.set(0, 1.72, 1.25);
  cab.castShadow = true;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.62, 0.08), glassMat);
  windshield.position.set(0, 2.02, 2.04);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.68, 0.1), darkMat);
  grille.position.set(0, 1.4, 3.72);
  root.add(hood, cab, windshield, grille);

  // Rear open-topped cargo bed with wooden slat benches
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.18, 4.75), woodMat);
  bedFloor.position.set(0, 1.05, -1.78);
  bedFloor.receiveShadow = true;
  root.add(bedFloor);

  for (const sx of [-1.2, 1.2]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.98, 4.75), bodyMat);
    sideWall.position.set(sx, 1.62, -1.78);
    sideWall.castShadow = true;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 4.3), woodMat);
    bench.position.set(sx * 0.72, 1.45, -1.75);
    root.add(sideWall, bench);
  }
  const frontBulkhead = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.15, 0.12), bodyMat);
  frontBulkhead.position.set(0, 1.7, 0.54);
  const tailgate = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.65, 0.1), bodyMat);
  tailgate.position.set(0, 1.42, -4.12);
  root.add(frontBulkhead, tailgate);

  // Open steel canopy hoops with front half-tarp so sky & trailing convoy remain clearly visible
  for (const rz of [0.1, -1.35, -2.8, -3.95]) {
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.045, 6, 12, Math.PI),
      darkMat,
    );
    hoop.position.set(0, 2.1, rz);
    root.add(hoop);
  }
  const frontTarp = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 1.45, 10, 1, true, -Math.PI * 0.5, Math.PI),
    canvasMat,
  );
  frontTarp.rotation.x = Math.PI / 2;
  frontTarp.position.set(0, 2.1, -0.62);
  root.add(frontTarp);

  // 6 heavy off-road tires (front + dual rear axle)
  const wheels: THREE.Object3D[] = [];
  const wheelCoords: Array<[number, number]> = [
    [-1.28, 2.55],
    [1.28, 2.55],
    [-1.28, -0.88],
    [1.28, -0.88],
    [-1.28, -2.65],
    [1.28, -2.65],
  ];
  for (const [wx, wz] of wheelCoords) {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, 0.56, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.38, 14), darkMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.41, 10), bodyMat);
    hub.rotation.z = Math.PI / 2;
    wGroup.add(tire, hub);
    root.add(wGroup);
    wheels.push(wGroup);
  }

  // Camera sits inside cargo bed toward front bulkhead looking aft/outward across squadmates
  const passengerAnchor = new THREE.Object3D();
  passengerAnchor.position.set(-0.78, 2.18, -0.45);
  root.add(passengerAnchor);

  return {
    root,
    wheels,
    passengerAnchor,
    seatOffsets: [
      { x: 0.72, y: 1.48, z: -1.15, rotY: -Math.PI * 0.55 },
      { x: 0.72, y: 1.48, z: -2.45, rotY: -Math.PI * 0.65 },
      { x: -0.72, y: 1.48, z: -2.55, rotY: Math.PI * 0.45 },
    ],
  };
}

export function applyCampaignWeather(
  scene: THREE.Scene,
  skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
  } | null,
  sunLight: THREE.DirectionalLight | null,
  hemiLight: THREE.HemisphereLight | null,
  weather: CampaignWeather,
): void {
  let fogColor = 0xc9b99e;
  let fogDensity = 0.0022;
  let topHex = 0x4876a8;
  let horHex = 0xd9cbb4;
  let sunHex = 0xfff0d6;
  let sunIntensity = 2.05;
  let hemiIntensity = 0.72;
  let sunPos = new THREE.Vector3(65, 95, 45);

  if (weather === 'night') {
    fogColor = 0x0b111c;
    fogDensity = 0.0056;
    topHex = 0x060b16;
    horHex = 0x182538;
    sunHex = 0x6f8db8;
    sunIntensity = 0.62;
    hemiIntensity = 0.34;
    sunPos = new THREE.Vector3(-40, 82, -55);
  } else if (weather === 'rain') {
    fogColor = 0x4a5562;
    fogDensity = 0.0068;
    topHex = 0x2c3643;
    horHex = 0x636f7d;
    sunHex = 0xa8b8c9;
    sunIntensity = 0.95;
    hemiIntensity = 0.56;
    sunPos = new THREE.Vector3(35, 70, 20);
  } else if (weather === 'fog') {
    fogColor = 0x8f9496;
    fogDensity = 0.0095;
    topHex = 0x6c767e;
    horHex = 0xaab0b3;
    sunHex = 0xdad7cd;
    sunIntensity = 1.05;
    hemiIntensity = 0.65;
  } else if (weather === 'dust') {
    fogColor = 0xb98d5c;
    fogDensity = 0.0052;
    topHex = 0x7a654a;
    horHex = 0xc99c6b;
    sunHex = 0xffcf94;
    sunIntensity = 1.65;
    hemiIntensity = 0.62;
    sunPos = new THREE.Vector3(80, 48, 30);
  }

  scene.background = new THREE.Color(fogColor);
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  if (skyUniforms) {
    skyUniforms.uTopColor.value.setHex(topHex);
    skyUniforms.uHorizonColor.value.setHex(horHex);
    skyUniforms.uSunColor.value.setHex(sunHex);
    skyUniforms.uSunDir.value.copy(sunPos).normalize();
  }
  if (sunLight) {
    sunLight.color.setHex(sunHex);
    sunLight.intensity = sunIntensity;
    sunLight.position.copy(sunPos);
  }
  if (hemiLight) {
    hemiLight.intensity = hemiIntensity;
  }
}

export function buildCampaignSet(
  archetype: CampaignSceneArchetype,
  weather: CampaignWeather,
  sampleGroundY: (x: number, z: number) => number,
): CampaignSetHandle {
  const group = new THREE.Group();
  const obstacles: ObstacleBox[] = [];
  const targets: CampaignTargetProp[] = [];
  const triggerPoints: CampaignTriggerPoint[] = [];
  const convoyMeshes: THREE.Group[] = [];
  const beacons: THREE.Mesh[] = [];
  let truckRig: CampaignTruckRig | undefined;
  let rainSystem: THREE.Points | undefined;

  const hasDoc = typeof document !== 'undefined';
  const concreteSet = hasDoc ? getConcretePbrSet() : null;
  const rockSet = hasDoc ? getRockPbrSet() : null;
  const brickSet = hasDoc ? getBrickPbrSet() : null;
  const asphaltSet = hasDoc ? getAsphaltPbrSet() : null;
  const woodSet = hasDoc ? getWoodStockPbrSet() : null;

  const sandstoneMat = makeMat(0xc8b491, 0.88, 0.03, concreteSet ? { map: concreteSet.map, bumpMap: concreteSet.bumpMap, bumpScale: 0.014 } : {});
  const concreteMat = makeMat(0x888b86, 0.84, 0.05, concreteSet ? { map: concreteSet.map, bumpMap: concreteSet.bumpMap, bumpScale: 0.015 } : {});
  const brickMat = makeMat(0xa57a5b, 0.88, 0.03, brickSet ? { map: brickSet.map, bumpMap: brickSet.bumpMap, bumpScale: 0.014 } : {});
  const asphaltMat = makeMat(0x2d3035, 0.86, 0.06, asphaltSet ? { map: asphaltSet.map, bumpMap: asphaltSet.bumpMap, bumpScale: 0.012 } : {});
  const woodMat = makeMat(0x6e4f32, 0.82, 0.04, woodSet ? { map: woodSet.map, bumpMap: woodSet.bumpMap, bumpScale: 0.012 } : {});
  const rockMat = makeMat(0x8b7556, 0.92, 0.03, rockSet ? { map: rockSet.map, bumpMap: rockSet.bumpMap, bumpScale: 0.02 } : {});
  const steelMat = makeMat(0x3a434a, 0.48, 0.62);
  const sandbagMat = makeMat(0xa89268, 0.92, 0.02);
  const tentMat = makeMat(0x6e6a4f, 0.9, 0.03);
  const flagRedMat = makeMat(0x9e2121, 0.85, 0.02);
  const flagGreenMat = makeMat(0x1e5c31, 0.85, 0.02);
  const waterMat = makeMat(0x1f4f6b, 0.14, 0.25);

  const gAt = (x: number, z: number): number => sampleGroundY(x, z);

  // Common perimeter sandbags & cover crates helper
  const addSandbagWall = (x: number, z: number, len = 4.5, rotY = 0) => {
    const w = new THREE.Group();
    w.position.set(x, gAt(x, z), z);
    w.rotation.y = rotY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.85), sandbagMat);
    body.position.y = 0.52;
    body.castShadow = true;
    body.receiveShadow = true;
    w.add(body);
    group.add(w);
    obstacles.push({
      minX: x - (Math.abs(Math.cos(rotY)) * len + Math.abs(Math.sin(rotY)) * 0.9) * 0.5,
      maxX: x + (Math.abs(Math.cos(rotY)) * len + Math.abs(Math.sin(rotY)) * 0.9) * 0.5,
      minZ: z - (Math.abs(Math.sin(rotY)) * len + Math.abs(Math.cos(rotY)) * 0.9) * 0.5,
      maxZ: z + (Math.abs(Math.sin(rotY)) * len + Math.abs(Math.cos(rotY)) * 0.9) * 0.5,
      height: 1.05,
    });
  };

  if (archetype === 'recruitment_base') {
    // M1 Induction Courtyard — Jordanian Armed Forces Recruitment Center
    for (const [bx, bz] of [[-16, 12], [16, 12], [-18, -14], [18, -14]]) {
      addBoxObstacle(group, obstacles, bx, gAt(bx, bz), bz, 9.5, 4.2, 6.2, sandstoneMat);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.35, 6.6), concreteMat);
      roof.position.set(bx, gAt(bx, bz) + 4.35, bz);
      group.add(roof);
    }
    // Check-in reception desk & induction awning
    addBoxObstacle(group, obstacles, 0, gAt(0, 16), 16, 10, 3.2, 4.2, tentMat);
    addBoxObstacle(group, obstacles, 0, gAt(0, 11.5), 11.5, 5.2, 1.1, 1.0, woodMat);
    // Wooden courtyard benches
    for (const bx of [-6, 6]) {
      addBoxObstacle(group, obstacles, bx, gAt(bx, 3), 3, 3.4, 0.55, 0.85, woodMat);
    }
    // Jordanian tricolor + star flagpole centerpiece
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 10.5, 8), steelMat);
    pole.position.set(0, gAt(0, 0) + 5.25, 0);
    const flagBlack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.04), steelMat);
    flagBlack.position.set(1.35, gAt(0, 0) + 9.9, 0);
    const flagWhite = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.04), sandstoneMat);
    flagWhite.position.set(1.35, gAt(0, 0) + 9.45, 0);
    const flagGreen = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.04), flagGreenMat);
    flagGreen.position.set(1.35, gAt(0, 0) + 9.0, 0);
    const flagRed = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.35, 0.05), flagRedMat);
    flagRed.position.set(0.45, gAt(0, 0) + 9.45, 0);
    group.add(pole, flagBlack, flagWhite, flagGreen, flagRed);

    triggerPoints.push({
      id: 'm1_briefing',
      labelEn: 'Check-In Desk · Capt. Faisal',
      labelAr: 'مكتب الاستقبال · النقيب فيصل',
      x: 0,
      z: 9.5,
      radius: 5.5,
      activated: false,
    });
  } else if (archetype === 'training_ground') {
    // M2 Live-Fire Range — 4 sandbag stalls + 8 silhouette steel targets downrange
    for (let i = -3; i <= 3; i += 2) {
      addSandbagWall(i * 3.5, 8, 2.8, 0);
    }
    addBoxObstacle(group, obstacles, -16, gAt(-16, 10), 10, 6.2, 3.6, 5.2, tentMat);
    const rangeCoords: Array<[number, number]> = [
      [-10, -28], [-3.5, -34], [3.5, -34], [10, -28],
      [-7, -46], [0, -52], [7, -46], [0, -64],
    ];
    for (const [tx, tz] of rangeCoords) {
      const tg = new THREE.Group();
      const gy = gAt(tx, tz);
      tg.position.set(tx, gy, tz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8), woodMat);
      post.position.y = 0.7;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.25, 0.1), steelMat);
      plate.position.y = 1.65;
      const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), flagRedMat);
      bullseye.position.set(0, 1.72, 0.06);
      tg.add(post, plate, bullseye);
      group.add(tg);
      targets.push({ mesh: tg, x: tx, y: gy + 1.55, z: tz, radius: 0.9, hit: false });
    }
  } else if (archetype === 'night_drop_mud') {
    // M3 Night Parachute & Muddy Flats
    const mudMat = makeMat(0x2d2318, 0.35, 0.14);
    const mudFlat = new THREE.Mesh(new THREE.CircleGeometry(42, 24), mudMat);
    mudFlat.rotation.x = -Math.PI / 2;
    mudFlat.position.set(0, gAt(0, 0) + 0.04, 0);
    group.add(mudFlat);

    for (const [fx, fz] of [[-14, -18], [14, -18], [0, -34]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8), steelMat);
      mast.position.set(fx, gAt(fx, fz) + 3.25, fz);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.35, 0.35),
        makeMat(0xfef08a, 0.2, 0.1, { emissive: 0xfacc15, emissiveIntensity: 1.8 }),
      );
      lamp.position.set(fx, gAt(fx, fz) + 6.45, fz);
      group.add(mast, lamp);
      beacons.push(lamp);
    }
    addSandbagWall(-8, -28, 5, 0.25);
    addSandbagWall(8, -28, 5, -0.25);
    triggerPoints.push({
      id: 'm3_rally',
      labelEn: 'Night Rally Flare · Sgt. Khaled',
      labelAr: 'نقطة التجمع الليلية · الرقيب خالد',
      x: 0,
      z: -32,
      radius: 6.5,
      activated: false,
    });
  } else if (archetype === 'alarm_crater') {
    // M4 Outbreak & Base Attack — blast crater + wrecked truck + red alarm beacons
    const crater = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 7.5, 18),
      makeMat(0x241d17, 0.95, 0.02),
    );
    crater.rotation.x = -Math.PI / 2;
    crater.position.set(8, gAt(8, -14) + 0.06, -14);
    group.add(crater);

    for (const [bx, bz] of [[-18, 6], [18, 8], [-15, -22], [16, -24]]) {
      addBoxObstacle(group, obstacles, bx, gAt(bx, bz), bz, 8.5, 3.8, 5.5, concreteMat);
    }
    for (const [ax, az] of [[-10, -8], [12, 2], [0, -26]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), steelMat);
      pole.position.set(ax, gAt(ax, az) + 2.6, az);
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        makeMat(0xef4444, 0.2, 0.1, { emissive: 0xdc2626, emissiveIntensity: 2.0 }),
      );
      beacon.position.set(ax, gAt(ax, az) + 5.3, az);
      group.add(pole, beacon);
      beacons.push(beacon);
    }
    triggerPoints.push({
      id: 'm4_muster',
      labelEn: 'Muster Point · Capt. Faisal',
      labelAr: 'نقطة الاصطفاف · النقيب فيصل',
      x: 0,
      z: -16,
      radius: 6.5,
      activated: false,
    });
  } else if (archetype === 'truck_convoy') {
    // M5 Open-topped Military Transport Truck + Desert Highway + Escort Convoy
    const road = new THREE.Mesh(new THREE.PlaneGeometry(18, 560), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.05, 0);
    road.receiveShadow = true;
    group.add(road);

    for (let z = -220; z <= 220; z += 18) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 7.5), makeMat(0xd6c79c, 0.85, 0.02));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.07, z);
      group.add(dash);
    }

    truckRig = buildMilitaryTransportTruck(0x5c553e);
    truckRig.root.position.set(0, 0, 0);
    group.add(truckRig.root);

    // Trailing & flanking escort convoy trucks on neighboring lanes
    for (const [cx, cz] of [[-4.8, -16], [4.8, -32], [-4.5, -52], [0, 22]]) {
      const escort = buildMilitaryTransportTruck(0x544e39);
      escort.root.position.set(cx, 0, cz);
      group.add(escort.root);
      convoyMeshes.push(escort.root);
    }
  } else if (archetype === 'highway_evac') {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(20, 260), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.05, 0);
    group.add(road);
    for (let z = -70; z <= 70; z += 18) {
      addBoxObstacle(group, obstacles, z % 36 === 0 ? -5.5 : 5.5, 0, z, 4.2, 1.1, 1.2, concreteMat);
      addSandbagWall(z % 36 === 0 ? 4.8 : -4.8, z + 4, 3.8, 0.2);
    }
  } else if (archetype === 'emergency_clinic') {
    addBoxObstacle(group, obstacles, 0, gAt(0, -18), -18, 16, 5.2, 11, sandstoneMat);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.6, 0.14), flagRedMat);
    crossV.position.set(0, gAt(0, -18) + 3.5, -12.42);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 0.14), flagRedMat);
    crossH.position.set(0, gAt(0, -18) + 3.5, -12.42);
    group.add(crossV, crossH);
    addSandbagWall(-8, -8, 5, 0.15);
    addSandbagWall(8, -8, 5, -0.15);
    addBoxObstacle(group, obstacles, -18, gAt(-18, -12), -12, 6, 3.2, 4, tentMat);
  } else if (archetype === 'wadi_search') {
    for (let i = -3; i <= 3; i++) {
      addBoxObstacle(group, obstacles, -24 + (i % 2) * 3, gAt(-24, i * 22), i * 22, 10, 8.5, 16, rockMat);
      addBoxObstacle(group, obstacles, 24 - (i % 2) * 3, gAt(24, i * 22), i * 22, 10, 8.5, 16, rockMat);
    }
    const wreck = buildMilitaryTransportTruck(0x423a2c);
    wreck.root.position.set(3, gAt(3, -34), -34);
    wreck.root.rotation.set(0.06, 0.72, -0.12);
    group.add(wreck.root);
    triggerPoints.push({
      id: 'm9_wreck',
      labelEn: 'Ambush Wreck · Locate Squad Survivors',
      labelAr: 'حطام الكمين · تفقد الناجين',
      x: 3,
      z: -34,
      radius: 8,
      activated: false,
    });
  } else if (archetype === 'aqaba_port') {
    // M11 Harbor docks, shipping containers, cranes & Red Sea water
    const water = new THREE.Mesh(new THREE.PlaneGeometry(280, 120), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.6, -95);
    group.add(water);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(220, 1.4, 90), concreteMat);
    quay.position.set(0, -0.35, -5);
    quay.receiveShadow = true;
    group.add(quay);

    const containerColors = [0x8c2f23, 0x24557a, 0x3b6340, 0xa86f23];
    const containerPositions: Array<[number, number, boolean]> = [
      [-18, -14, false], [-18, -22, true], [16, -16, false], [16, -24, false],
      [-6, -34, false], [8, -36, true], [-28, -32, false], [28, -30, false],
    ];
    containerPositions.forEach(([cx, cz, stacked], idx) => {
      const cMat = makeMat(containerColors[idx % containerColors.length], 0.58, 0.45);
      addBoxObstacle(group, obstacles, cx, 0.35, cz, 6.2, 2.7, 2.6, cMat);
      if (stacked) {
        addBoxObstacle(group, obstacles, cx, 3.05, cz, 6.2, 2.7, 2.6, makeMat(containerColors[(idx + 1) % 4], 0.58, 0.45), false);
      }
    });
    // Port Gantry Crane
    addBoxObstacle(group, obstacles, -22, 0.35, -42, 2.2, 16, 2.2, steelMat);
    const craneArm = new THREE.Mesh(new THREE.BoxGeometry(24, 1.6, 2.0), makeMat(0xb87624, 0.55, 0.5));
    craneArm.position.set(-12, 16.5, -42);
    group.add(craneArm);
  } else if (archetype === 'comms_station') {
    addBoxObstacle(group, obstacles, 0, gAt(0, -28), -28, 12, 4.4, 9, concreteMat);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.35, 22, 6), steelMat);
    tower.position.set(10, gAt(10, -32) + 11, -32);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.5, 0.9, 14), sandstoneMat);
    dish.rotation.x = Math.PI * 0.35;
    dish.position.set(10, gAt(10, -32) + 21.5, -31.2);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 8),
      makeMat(0xef4444, 0.2, 0.1, { emissive: 0xef4444, emissiveIntensity: 2.0 }),
    );
    beacon.position.set(10, gAt(10, -32) + 23.2, -32);
    group.add(tower, dish, beacon);
    beacons.push(beacon);
    addSandbagWall(-10, -14, 5, 0.2);
    addSandbagWall(10, -14, 5, -0.2);
  } else if (archetype === 'residential_city' || archetype === 'ruined_quarter') {
    const isRuined = archetype === 'ruined_quarter';
    const blocks: Array<[number, number, number, number, number]> = [
      [-16, 8, 11, isRuined ? 6.5 : 10, 9],
      [16, 8, 11, isRuined ? 5.2 : 9.5, 9],
      [-17, -14, 12, isRuined ? 4.8 : 11, 10],
      [17, -14, 12, isRuined ? 7.2 : 10.5, 10],
      [-15, -36, 10, 9, 9],
      [15, -36, 10, 8.5, 9],
    ];
    for (const [bx, bz, bw, bh, bd] of blocks) {
      addBoxObstacle(group, obstacles, bx, gAt(bx, bz), bz, bw, bh, bd, brickMat);
    }
    const street = new THREE.Mesh(new THREE.PlaneGeometry(16, 180), asphaltMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.05, -16);
    group.add(street);
    addSandbagWall(-4, -8, 4.5, 0.12);
    addSandbagWall(4, -26, 4.5, -0.15);
  } else if (archetype === 'command_bunker') {
    addBoxObstacle(group, obstacles, 0, gAt(0, -24), -24, 18, 4.8, 14, concreteMat);
    addSandbagWall(-7, -11, 5.5, 0.25);
    addSandbagWall(7, -11, 5.5, -0.25);
    // Tactical intelligence table with red/blue pins & blinking map console
    const table = addBoxObstacle(group, obstacles, 0, gAt(0, -14), -14, 3.8, 1.0, 2.2, woodMat);
    const mapSheet = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.8),
      makeMat(0xd6c79c, 0.8, 0.02),
    );
    mapSheet.rotation.x = -Math.PI / 2;
    mapSheet.position.set(table.position.x, table.position.y + 0.52, table.position.z);
    group.add(mapSheet);
    triggerPoints.push({
      id: 'm16_intel',
      labelEn: 'Captured Command Table · Inspect Maps',
      labelAr: 'طاولة العمليات · فحص الخرائط السرية',
      x: 0,
      z: -14,
      radius: 5.5,
      activated: false,
    });
  } else if (archetype === 'dawn_trenches' || archetype === 'rain_outpost') {
    for (let i = -2; i <= 2; i++) {
      addSandbagWall(i * 11, -12, 7.5, (i % 2) * 0.22);
      addSandbagWall(i * 11, -28, 7.5, -(i % 2) * 0.22);
    }
    addBoxObstacle(group, obstacles, -16, gAt(-16, -20), -20, 5.5, 3.2, 5.5, woodMat);
    addBoxObstacle(group, obstacles, 16, gAt(16, -20), -20, 5.5, 3.2, 5.5, woodMat);
  } else if (archetype === 'quiet_memorial') {
    // M20 Quiet Dawn Overlook Memorial
    const stone = addBoxObstacle(group, obstacles, 0, gAt(0, -12), -12, 3.6, 2.4, 1.1, sandstoneMat);
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 0.14),
      makeMat(0x2d3236, 0.4, 0.7),
    );
    plaque.position.set(stone.position.x, stone.position.y + 0.2, stone.position.z + 0.55);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 9.0, 8), steelMat);
    pole.position.set(3.5, gAt(3.5, -12) + 4.5, -12);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.04), flagGreenMat);
    banner.position.set(4.7, gAt(3.5, -12) + 8.3, -12);
    group.add(plaque, pole, banner);
    triggerPoints.push({
      id: 'm20_overlook',
      labelEn: 'Ridge Memorial Stone · Pay Respects',
      labelAr: 'النصب التذكاري · قف مع رفاقك',
      x: 0,
      z: -10,
      radius: 6,
      activated: false,
    });
  } else {
    // desert_ridge, border_pass, bastion_approach, final_corridor
    for (const [rx, rz, rw, rh] of [
      [-18, -14, 8, 4.5],
      [18, -14, 8, 4.5],
      [-24, -36, 10, 5.8],
      [24, -36, 10, 5.8],
      [0, -48, 12, 3.6],
    ]) {
      addBoxObstacle(group, obstacles, rx, gAt(rx, rz), rz, rw, rh, 7, rockMat);
    }
    addSandbagWall(-7, -10, 5, 0.18);
    addSandbagWall(7, -10, 5, -0.18);
    addSandbagWall(0, -24, 6.5, 0);
  }

  // Atmospheric Rain Streaks particle pool when weather === 'rain'
  if (weather === 'rain') {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xc2d5e8,
      size: 0.28,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    rainSystem = new THREE.Points(geo, mat);
    group.add(rainSystem);
  }

  return {
    group,
    obstacles,
    targets,
    triggerPoints,
    truckRig,
    convoyMeshes,
    rainSystem,
    beacons,
    update(timeSec: number, dt: number, playerPos: THREE.Vector3) {
      for (const b of beacons) {
        const mat = b.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.7 + Math.abs(Math.sin(timeSec * 5.2)) * 1.8;
      }
      if (truckRig) {
        for (const w of truckRig.wheels) {
          w.rotation.x += dt * 7.5;
        }
        truckRig.root.position.y = Math.sin(timeSec * 14) * 0.022 + Math.cos(timeSec * 23) * 0.012;
      }
      for (let i = 0; i < convoyMeshes.length; i++) {
        const cm = convoyMeshes[i];
        cm.position.y = Math.sin(timeSec * 11 + i) * 0.025;
      }
      if (rainSystem) {
        const attr = rainSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        rainSystem.position.set(playerPos.x, 0, playerPos.z);
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= dt * 24;
          if (arr[i + 1] < 0) {
            arr[i + 1] = 26 + Math.random() * 4;
          }
        }
        attr.needsUpdate = true;
      }
    },
    dispose() {
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    },
  };
}
