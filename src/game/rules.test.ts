import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWeaponWithAttachments,
  isAttachmentUnlocked,
  sanitizeWeaponAttachmentLoadout,
} from './attachments';
import {
  ARENA_RADIUS,
  MAP_ZONES,
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
  foxholeHeightDelta,
  groundHeightAt,
  groundNormalAt,
  intersectObstaclesRay,
  resolveCircleEntities,
  resolveCircleObstacles,
  steerAroundObstacles,
  stepBallisticProjectile,
  stepBombDrop,
  stepCaptureZone,
  stepFlightPhysics,
  stepMissileHoming,
  stepParachutePhysics,
  stepSuspensionArticulation,
  stepVehicleDriving,
  testSoldierHitbox,
} from './rules';

test('large-scale 5-zone battlefields sit on flat local terrain pads far apart across all 4 maps', () => {
  for (const mapId of ['forest', 'desert', 'normandy', 'stalingrad'] as const) {
    const zones = MAP_ZONES[mapId];
    assert.equal(zones.length, 5);
    assert.ok(Math.hypot(zones[4].x - zones[0].x, zones[4].z - zones[0].z) > 350);
    for (const z of zones) {
      const centerH = groundHeightAt(z.x, z.z, mapId);
      const edgeH = groundHeightAt(z.x + 4, z.z - 4, mapId);
      assert.ok(Math.abs(centerH - edgeH) < 0.25);
    }
  }
  const n = groundNormalAt(0, 0, 'forest');
  assert.ok(Math.abs(Math.hypot(n.nx, n.ny, n.nz) - 1) < 0.001);
});

test('circle obstacle collision slides along walls and clamps expanded 380m arena bounds', () => {
  const obs = [
    { id: 'wall', minX: -2, maxX: 2, minZ: -2, maxZ: 2, height: 3, blocksSight: true },
  ];
  const res = resolveCircleObstacles(2.2, 0.5, 0.6, obs, ARENA_RADIUS);
  assert.ok(res.x >= 2.59);
  assert.equal(res.hitBoundary, false);

  const clamped = resolveCircleObstacles(420, 0, 0.5, obs, ARENA_RADIUS);
  assert.equal(clamped.hitBoundary, true);
  assert.ok(clamped.x <= ARENA_RADIUS - 0.5 + 0.001);
});

test('capture zone neutralizes enemy control then captures for allies', () => {
  const zones = createInitialZones('forest');
  const axisZone = zones[4];
  assert.equal(axisZone.owner, 'axis');

  let current = axisZone;
  for (let i = 0; i < 10; i++) {
    current = stepCaptureZone(current, 2, 0, 0.5).zone;
  }
  assert.equal(current.owner, null);

  let captured = false;
  for (let i = 0; i < 12; i++) {
    const res = stepCaptureZone(current, 2, 0, 0.5);
    current = res.zone;
    if (res.newlyCapturedBy === 'allies') captured = true;
  }
  assert.equal(current.owner, 'allies');
  assert.equal(captured, true);
});

test('ticket bleed drains team with fewer flags', () => {
  const zones = createInitialZones('desert');
  zones[1].owner = 'allies';
  const bleed = calculateTicketBleed(zones, 1.0);
  assert.equal(bleed.alliesBleed, 0);
  assert.ok(bleed.axisBleed > 0);
});

test('headshot, range falloff, AK-47, PPSh-41, binoculars, shovel and launchers behave accurately', () => {
  const garand = WEAPONS.m1_garand;
  const bodyClose = computeHitDamage(garand, 20, false);
  const headClose = computeHitDamage(garand, 20, true);
  const bodyFar = computeHitDamage(garand, 120, false);

  assert.ok(headClose > bodyClose * 1.7);
  assert.ok(bodyFar < bodyClose);
  assert.equal(WEAPONS.ak47.magSize, 30);
  assert.equal(WEAPONS.ak47.automatic, true);
  assert.equal(WEAPONS.ppsh41.magSize, 71);
  assert.equal(WEAPONS.binoculars.slotType, 'gadget');
  assert.equal(WEAPONS.binoculars.damage, 0);
  assert.equal(WEAPONS.shovel.slotType, 'gadget');
  assert.equal(WEAPONS.bazooka.isExplosive, true);
  assert.ok((WEAPONS.bazooka.blastRadius ?? 0) >= 7);
  assert.equal(WEAPONS.rpg7.isExplosive, true);
  assert.ok(WEAPONS.rpg7.damage >= 200);
  assert.ok((WEAPONS.rpg7.blastRadius ?? 0) >= 9.5);
});

test('ballistic projectiles drop noticeably over long distances and lose speed to drag', () => {
  const dropShort = computeBallisticDrop(120, 20, 1.85);
  const dropLong = computeBallisticDrop(120, 110, 1.85);
  assert.ok(dropLong > dropShort * 15);
  assert.ok(dropLong > 6.0);

  let x = 0;
  let y = 1.6;
  let z = 0;
  let vx = 0;
  let vy = 0;
  let vz = -126;
  for (let i = 0; i < 60; i++) {
    const step = stepBallisticProjectile(x, y, z, vx, vy, vz, 1.85, 0.21, 0.02);
    x = step.x;
    y = step.y;
    z = step.z;
    vx = step.vx;
    vy = step.vy;
    vz = step.vz;
  }
  assert.ok(y < 0);
  assert.ok(Math.abs(vz) < 126);
});

test('foxhole excavation lowers terrain pit and builds protective rim parapet', () => {
  const foxholes = [{ x: 10, z: 10, radius: 2.2, depth: 0.85 }];
  const centerDelta = foxholeHeightDelta(10, 10, foxholes);
  const rimDelta = foxholeHeightDelta(12.2, 10, foxholes);
  const farDelta = foxholeHeightDelta(25, 25, foxholes);

  assert.ok(centerDelta < -0.7);
  assert.ok(rimDelta > 0.2);
  assert.equal(farDelta, 0);
});

test('smart tactical bot AI retreats under low HP, rushes forward at range, and holds tactical cover', () => {
  assert.equal(chooseBotTacticalAction(28, 100, true, 30, 'rusher'), 'retreat_heal');
  assert.equal(chooseBotTacticalAction(85, 100, true, 40, 'rusher'), 'advance');
  assert.equal(chooseBotTacticalAction(85, 100, true, 16, 'rusher'), 'flank');
  assert.equal(chooseBotTacticalAction(85, 100, true, 25, 'defender'), 'hold_cover');
  assert.equal(chooseBotTacticalAction(85, 100, true, 50, 'defender'), 'advance');
  assert.equal(chooseBotTacticalAction(85, 100, true, 50, 'marksman'), 'hold_cover');
  assert.equal(chooseBotTacticalAction(90, 100, false, 99, 'rusher'), 'advance');
});

test('directional death fall tilts camera cleanly without clipping below terrain', () => {
  const start = computeDirectionalDeathPose(1.2, 0.2, 3.0, 1.66, 0);
  const end = computeDirectionalDeathPose(1.2, 0.2, 3.0, 1.66, 1);
  assert.ok(Math.abs(start.eyeHeight - 1.66) < 0.01);
  assert.ok(end.eyeHeight >= 0.35);
  assert.ok(Math.abs(end.roll) > 0.9);
});

test('match outcome triggers on ticket depletion or timeout', () => {
  assert.equal(checkMatchOutcome(100, 0, 120), 'allies');
  assert.equal(checkMatchOutcome(0, 45, 120), 'axis');
  assert.equal(checkMatchOutcome(80, 60, 0), 'allies');
  assert.equal(checkMatchOutcome(50, 50, 0), 'draw');
  assert.equal(checkMatchOutcome(50, 50, 10), null);
});

test('bot obstacle steering detours around walls and 4-zone hitbox covers head through legs', () => {
  const wallObs = [
    { id: 'house_wall', minX: -2, maxX: 2, minZ: 1.5, maxZ: 3.5, height: 3.2, blocksSight: true },
  ];
  const steer = steerAroundObstacles(0, 0, 0, 10, wallObs, 1);
  assert.equal(steer.blockedCenter, true);
  assert.ok(Math.abs(steer.dirX) > 0.45);

  const chestHit = testSoldierHitbox(0, 1.38, -5, 0, 0, 1, 10, 0, 0, 0, false);
  const headHit = testSoldierHitbox(0, 1.62, -5, 0, 0, 1, 10, 0, 0, 0, false);
  const hipHit = testSoldierHitbox(0, 0.85, -5, 0, 0, 1, 10, 0, 0, 0, false);
  assert.equal(chestHit.hit, true);
  assert.equal(chestHit.isHead, false);
  assert.equal(headHit.hit, true);
  assert.equal(headHit.isHead, true);
  assert.equal(hipHit.hit, true);
});

test('light aim assist gently nudges toward targets inside cone and ignores off-angle targets', () => {
  const nearTarget = { x: 0.6, y: 1.5, z: -20 };
  const res = computeLightAimAssist(0, 1.5, 0, 0, 0, [nearTarget], 0.09, 115, 0.16, 0.016);
  assert.equal(res.active, true);
  assert.ok(res.yawDelta < 0 && Math.abs(res.yawDelta) < 0.02);

  const farOffTarget = { x: 18, y: 1.5, z: -10 };
  const miss = computeLightAimAssist(0, 1.5, 0, 0, 0, [farOffTarget], 0.09, 115, 0.16, 0.016);
  assert.equal(miss.active, false);
  assert.equal(miss.yawDelta, 0);
});

test('weapon attachment stats scale magazine, recoil, suppression, optics zoom, and unlocks cleanly', () => {
  const customAk = computeWeaponWithAttachments(WEAPONS.ak47, {
    optic: 'scope_4x',
    stock: 'heavy',
    grip: 'vertical',
    muzzle: 'suppressor',
    rail: 'laser',
    magazine: 'drum_mag',
  });
  assert.equal(customAk.suppressed, true);
  assert.equal(customAk.hasLaser, true);
  assert.equal(customAk.spec.magSize, Math.round(30 * 2.2));
  assert.ok(customAk.spec.recoilPitch < WEAPONS.ak47.recoilPitch * 0.65);
  assert.ok(customAk.spec.adsSpread < WEAPONS.ak47.adsSpread * 0.55);
  assert.equal(customAk.spec.adsFov, 22);

  // Pistol cannot equip drum mags or buttstocks
  const sanitizedPistol = sanitizeWeaponAttachmentLoadout('m1911', {
    stock: 'heavy',
    magazine: 'drum_mag',
  });
  assert.equal(sanitizedPistol.stock, 'standard');
  assert.equal(sanitizedPistol.magazine, 'extended_mag');

  assert.equal(
    isAttachmentUnlocked(
      {
        id: 'scope_8x',
        category: 'optic',
        nameEn: '8x',
        nameAr: '8x',
        descEn: '',
        descAr: '',
        unlockKills: 20,
        recoilMult: 1,
        spreadMult: 1,
      },
      { careerKills: 10, unlockAllPass: false },
    ),
    false,
  );
  assert.equal(
    isAttachmentUnlocked(
      {
        id: 'scope_8x',
        category: 'optic',
        nameEn: '8x',
        nameAr: '8x',
        descEn: '',
        descAr: '',
        unlockKills: 20,
        recoilMult: 1,
        spreadMult: 1,
      },
      { careerKills: 20, unlockAllPass: false },
    ),
    true,
  );
});

test('combat aircraft flight physics climbs, banks right wing down on right turn, accelerates, and clamps safe altitude floor', () => {
  const start = { x: 0, y: 12, z: 0, yaw: 0, pitch: 0, roll: 0, speed: 28 };
  const climb = stepFlightPhysics(start, 1, 0.8, 0.8, 1.5, 0.1);
  assert.ok(climb.speed > start.speed);
  assert.ok(climb.y > start.y);
  assert.ok(climb.roll > 0.1);
  assert.ok(climb.yaw < 0);

  const groundHug = stepFlightPhysics(
    { x: 0, y: 2, z: 0, yaw: 0, pitch: -0.4, roll: 0, speed: 30 },
    0,
    0,
    -1,
    1.5,
    0.1,
  );
  assert.ok(groundHug.y >= 1.5 + 4.2);
});

test('War Thunder instructor, M4A1 stats, air-to-ground bomb, IR homing missile, and parachute descent work accurately', () => {
  assert.equal(WEAPONS.m4a1.magSize, 30);
  assert.equal(WEAPONS.m4a1.automatic, true);

  // Turning right (aimYaw < currentYaw) must produce positive steerInput & bank right
  const instRight = computeFlightInstructorInputs(0, 0, -0.35, 0.2);
  assert.ok(instRight.steerInput > 0.4);
  assert.ok(instRight.pitchInput > 0.2);

  // Bomb falls under gravity while retaining forward motion
  const bombStep = stepBombDrop(0, 30, 0, 0, 0, 38, 0.5);
  assert.ok(bombStep.y < 30);
  assert.ok(bombStep.vy < 0);
  assert.ok(bombStep.z > 15);

  // IR missile curves smoothly toward off-axis target
  const mStep = stepMissileHoming(0, 20, 0, 0, 0, 75, 28, 20, 60, 75, 2.8, 0.2);
  assert.ok(mStep.vx > 5);

  // Parachute arrests fast freefall smoothly and signals landing on ground contact
  const airPara = stepParachutePhysics(18, -22, 1.0, 2.0, 0.25);
  assert.equal(airPara.landed, false);
  assert.ok(airPara.vy > -22);
  const landPara = stepParachutePhysics(2.3, -5.6, 1.5, 2.0, 0.25);
  assert.equal(landPara.landed, true);
  assert.equal(landPara.y, 2.0);
});

test('solid entity collision pushes soldiers cleanly outside parked vehicles and aircraft hulls', () => {
  const vehicles = [
    { x: 10, z: 10, radius: 2.25 },
    { x: 30, z: 15, radius: 2.85 },
  ];
  const insideJeep = resolveCircleEntities(10.8, 10.2, 0.65, vehicles);
  assert.equal(insideJeep.hit, true);
  assert.ok(Math.hypot(insideJeep.x - 10, insideJeep.z - 10) >= 2.25 + 0.65 - 0.001);

  const clearPos = resolveCircleEntities(0, 0, 0.65, vehicles);
  assert.equal(clearPos.hit, false);
  assert.equal(clearPos.x, 0);
});

test('ground vehicle driving accelerates smoothly, steers wheels, and inverts turn in reverse', () => {
  let jeep = { x: 0, z: 0, yaw: 0, speed: 0, steerAngle: 0 };
  for (let i = 0; i < 15; i++) {
    jeep = stepVehicleDriving('jeep', jeep, 1, 1, 0.05);
  }
  assert.ok(jeep.speed > 7);
  assert.ok(jeep.yaw < 0); // Right steer turns nose clockwise (negative yaw)
  assert.ok(jeep.steerAngle < -0.2);

  // Reversing with right steer turns tail right (yaw increases)
  let revJeep = { x: 0, z: 0, yaw: 0, speed: -5, steerAngle: 0 };
  revJeep = stepVehicleDriving('jeep', revJeep, -1, 1, 0.1);
  assert.ok(revJeep.yaw > 0);
});

test('cockpit threat warnings fire strictly on real danger and clear when threat ends', () => {
  // Calm takeoff / low level flight -> NO warning
  assert.equal(
    evaluateAircraftThreats({
      altAboveGround: 4.5,
      verticalSpeed: 1.2,
      pitch: 0.05,
      speed: 28,
      hpRatio: 1.0,
      incomingMissileDist: null,
    }),
    'none',
  );
  // Steep dive close to terrain -> pull_up
  assert.equal(
    evaluateAircraftThreats({
      altAboveGround: 11.5,
      verticalSpeed: -8.5,
      pitch: -0.35,
      speed: 44,
      hpRatio: 0.9,
      incomingMissileDist: null,
    }),
    'pull_up',
  );
  // Active IR missile closing in -> missile
  assert.equal(
    evaluateAircraftThreats({
      altAboveGround: 45,
      verticalSpeed: 0,
      pitch: 0,
      speed: 40,
      hpRatio: 0.9,
      incomingMissileDist: 110,
    }),
    'missile',
  );
  // Threat cleared (missile spoofed by flares) -> none
  assert.equal(
    evaluateAircraftThreats({
      altAboveGround: 45,
      verticalSpeed: 0,
      pitch: 0,
      speed: 40,
      hpRatio: 0.9,
      incomingMissileDist: null,
    }),
    'none',
  );
  // Critical airframe damage -> eject
  assert.equal(
    evaluateAircraftThreats({
      altAboveGround: 60,
      verticalSpeed: -2,
      pitch: -0.1,
      speed: 35,
      hpRatio: 0.24,
      incomingMissileDist: 100,
    }),
    'eject',
  );
});

test('weapon wall tuck pulls weapon back cleanly near walls and resets in open space', () => {
  const open = computeWeaponWallTuck(2.5);
  assert.equal(open.factor, 0);
  assert.equal(open.pullbackZ, 0);

  const pressed = computeWeaponWallTuck(0.35);
  assert.ok(pressed.factor > 0.7);
  assert.ok(pressed.pullbackZ > 0.14);
  assert.ok(pressed.cantYaw > 0.25);
});

test('independent 4-wheel suspension articulation lifts uneven wheels and tilts chassis smoothly', () => {
  let susp = {
    wheelOffsets: [0, 0, 0, 0] as [number, number, number, number],
    wheelVelocities: [0, 0, 0, 0] as [number, number, number, number],
    chassisHeave: 0,
    chassisPitch: 0,
    chassisRoll: 0,
  };
  // Front-left wheel hits a 0.28m bump while other 3 remain at 0m
  for (let i = 0; i < 20; i++) {
    susp = stepSuspensionArticulation(susp, 0, [0.28, 0, 0, 0], 1.25, 0.9, 0, 0, 0.28, 0.016);
  }
  assert.ok(susp.wheelOffsets[0] > 0.14);
  assert.ok(Math.abs(susp.wheelOffsets[1]) < 0.05);
  assert.ok(susp.chassisHeave > 0.02);
  assert.ok(Math.abs(susp.chassisPitch) > 0.02);
  assert.ok(Math.abs(susp.chassisRoll) > 0.02);
});

test('analytical obstacle raycast computes exact hit distance without Three.js overhead', () => {
  const obs = [
    { id: 'bunker', minX: -2, maxX: 2, minZ: -12, maxZ: -8, height: 3.5, blocksSight: true },
  ];
  const hitDist = intersectObstaclesRay(0, 1.5, 0, 0, 0, -1, 50, obs);
  assert.ok(hitDist !== null && Math.abs(hitDist - 8) < 0.01);

  const missDist = intersectObstaclesRay(0, 1.5, 0, 1, 0, 0, 50, obs);
  assert.equal(missDist, null);
});
