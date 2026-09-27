import * as THREE from "three";
import { controls, keyState } from "./sceneSetup.js";
import {
  MOVE_SPEED,
  PLAYER_BOUND_GALLERY,
  PLAYER_BOUND_WORLD,
  EYE_HEIGHT,
  STAR_PATH,
  STAR_OFFTRACK_LIMIT,
  OCEAN_VORTEX,
  VOLCANO_VENT,
  SCORE,
} from "./config.js";
import { worldGroups } from "./worldBuilders.js";
import {
  getCurrentArea,
  getStarCorridorEffective,
  incrementOfftrackCount,
  startRunTimerIfNeeded,
  addScore,
} from "./state.js";
import { playTone } from "./audio.js";
import { showToast } from "./ui.js";

// ---------------------------------------------------------------------------
// Everything that moves the player or reacts to their position each frame:
// walking, world-boundary clamping, and every world's special movement
// hazard (star path, ocean current, maze walls, volcano shockwave) plus the
// gallery's celebratory fireworks.
// ---------------------------------------------------------------------------

function clampPlayer() {
  const p = controls.object.position;
  const bound = getCurrentArea() === "gallery" ? PLAYER_BOUND_GALLERY : PLAYER_BOUND_WORLD;
  p.x = Math.max(-bound, Math.min(bound, p.x));
  p.z = Math.max(-bound, Math.min(bound, p.z));
  p.y = EYE_HEIGHT;
}

let bobPhase = 0;

export function updateMovement(dt) {
  if (!controls.isLocked) return;
  const forward = (keyState["KeyW"] ? 1 : 0) - (keyState["KeyS"] ? 1 : 0);
  const strafe = (keyState["KeyD"] ? 1 : 0) - (keyState["KeyA"] ? 1 : 0);
  const moving = forward !== 0 || strafe !== 0;

  if (moving) {
    controls.moveForward(forward * MOVE_SPEED * dt);
    controls.moveRight(strafe * MOVE_SPEED * dt);
    startRunTimerIfNeeded();
    bobPhase += dt * 10;
    controls.object.position.y = EYE_HEIGHT + Math.sin(bobPhase) * 0.045;
  } else {
    controls.object.position.y = EYE_HEIGHT;
  }

  clampPlayer();
}

export function updateMirages() {
  const w = worldGroups.desert;
  if (!w || !w.mirages) return;
  const t = performance.now() * 0.001;
  for (const { mesh } of w.mirages) {
    mesh.position.y = 1 + Math.sin(t * 1.4 + mesh.position.x) * 0.08;
    mesh.material.opacity = 0.35 + Math.sin(t * 2 + mesh.position.z) * 0.15;
  }
}

// ---------------------------------------------------------------------------
// Celebration room fireworks
// ---------------------------------------------------------------------------

const FIREWORK_COLORS = [0xffe9b0, 0xffb0c8, 0xb0d8ff, 0xc8ffb0, 0xffffff];

function spawnFirework(group) {
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
  const origin = new THREE.Vector3((Math.random() - 0.5) * 14, 4 + Math.random() * 3, (Math.random() - 0.5) * 14);
  const particles = [];
  const count = 24;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x;
    positions[i * 3 + 1] = origin.y;
    positions[i * 3 + 2] = origin.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const speed = 2 + Math.random() * 2;
    particles.push({
      vx: Math.sin(phi) * Math.cos(theta) * speed,
      vy: Math.sin(phi) * Math.sin(theta) * speed,
      vz: Math.cos(phi) * speed,
    });
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.12, transparent: true, opacity: 1 });
  const points = new THREE.Points(geo, mat);
  points.userData = { origin: origin.clone(), particles, age: 0 };
  group.add(points);
  return points;
}

const activeFireworks = [];
let fireworkClock = 0;

export function updateCelebration(dt) {
  if (getCurrentArea() !== "celebration") return;
  const w = worldGroups.celebration;
  if (!w) return;

  fireworkClock -= dt;
  if (fireworkClock <= 0) {
    activeFireworks.push(spawnFirework(w.group));
    fireworkClock = 0.5 + Math.random() * 0.9;
  }

  for (let i = activeFireworks.length - 1; i >= 0; i--) {
    const pts = activeFireworks[i];
    pts.userData.age += dt;
    const pos = pts.geometry.attributes.position;
    for (let p = 0; p < pts.userData.particles.length; p++) {
      const particle = pts.userData.particles[p];
      particle.vy -= 2.2 * dt;
      pos.array[p * 3] += particle.vx * dt;
      pos.array[p * 3 + 1] += particle.vy * dt;
      pos.array[p * 3 + 2] += particle.vz * dt;
    }
    pos.needsUpdate = true;
    pts.material.opacity = Math.max(0, 1 - pts.userData.age / 1.6);
    if (pts.userData.age > 1.6) {
      w.group.remove(pts);
      pts.geometry.dispose();
      pts.material.dispose();
      activeFireworks.splice(i, 1);
    }
  }

  if (w.inlay) w.inlay.rotation.z += dt * 0.15;
  if (w.crystal) w.crystal.rotation.y += dt * 0.25;
  if (w.lanterns) {
    const t = performance.now() * 0.001;
    for (const lantern of w.lanterns) {
      lantern.mesh.position.y = 1 + ((t * lantern.speed + lantern.phase) % 8);
      lantern.mesh.position.x = lantern.baseX + Math.sin(t * 0.4 + lantern.phase) * 0.6;
      lantern.mesh.position.z = lantern.baseZ + Math.cos(t * 0.4 + lantern.phase) * 0.6;
    }
  }
}

// ---------------------------------------------------------------------------
// Star world: staying on the path of light
// ---------------------------------------------------------------------------

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}

let starOfftrackTimer = 0;

export function updateStarPath(dt) {
  if (getCurrentArea() !== "stars") {
    starOfftrackTimer = 0;
    return;
  }
  const p = controls.object.position;
  let minDist = Infinity;
  for (let i = 0; i < STAR_PATH.length - 1; i++) {
    const a = STAR_PATH[i];
    const b = STAR_PATH[i + 1];
    const d = distToSegment(p.x, p.z, a.x, a.z, b.x, b.z);
    if (d < minDist) minDist = d;
  }

  if (minDist > getStarCorridorEffective()) {
    starOfftrackTimer += dt;
    if (starOfftrackTimer > STAR_OFFTRACK_LIMIT) {
      starOfftrackTimer = 0;
      incrementOfftrackCount();
      addScore(-SCORE.offtrackPenalty);
      showToast(`光の道を見失った……(-${SCORE.offtrackPenalty})`);
      playTone(220, 0.3, 0, "sawtooth", 0.12);
      const w = worldGroups.stars;
      controls.object.position.copy(w.spawn);
    }
  } else {
    starOfftrackTimer = Math.max(0, starOfftrackTimer - dt * 2);
  }
}

// ---------------------------------------------------------------------------
// Ocean world: gentle vortex current
// ---------------------------------------------------------------------------

export function applyOceanCurrent(dt) {
  if (getCurrentArea() !== "ocean") return;
  const p = controls.object.position;
  const dx = p.x - OCEAN_VORTEX.center.x;
  const dz = p.z - OCEAN_VORTEX.center.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return;
  const tangentX = -dz / dist;
  const tangentZ = dx / dist;
  const pull = OCEAN_VORTEX.strength * dt;
  p.x += tangentX * pull - (dx / dist) * pull * 0.15;
  p.z += tangentZ * pull - (dz / dist) * pull * 0.15;
  clampPlayer();
}

// ---------------------------------------------------------------------------
// Maze world: wall collision
// ---------------------------------------------------------------------------

const MAZE_PLAYER_RADIUS = 0.35;

export function resolveMazeCollision() {
  if (getCurrentArea() !== "maze") return;
  const w = worldGroups.maze;
  if (!w || !w.wallBoxes) return;
  const p = controls.object.position;
  for (const box of w.wallBoxes) {
    const closestX = Math.max(box.minX, Math.min(p.x, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(p.z, box.maxZ));
    const dx = p.x - closestX;
    const dz = p.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < MAZE_PLAYER_RADIUS * MAZE_PLAYER_RADIUS) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const push = MAZE_PLAYER_RADIUS - dist;
      p.x += (dx / dist) * push;
      p.z += (dz / dist) * push;
    }
  }
}

// ---------------------------------------------------------------------------
// Volcano world: periodic shockwave from the vent
// ---------------------------------------------------------------------------

let volcanoShockClock = 0;

export function updateVolcanoShockwave(dt) {
  if (getCurrentArea() !== "volcano") {
    volcanoShockClock = 0;
    return;
  }
  const w = worldGroups.volcano;
  if (!w) return;

  volcanoShockClock += dt;
  const period = 6.5;
  const phase = volcanoShockClock % period;

  if (w.ventGlow) {
    w.ventGlow.intensity = 1.2 + Math.sin((phase / period) * Math.PI * 2) * 0.6;
  }
  if (w.smoke) {
    for (const puff of w.smoke) {
      puff.position.y += dt * 0.4;
      if (puff.position.y > 8) puff.position.y = 0.5;
    }
  }

  if (phase < dt) {
    const p = controls.object.position;
    const dx = p.x - VOLCANO_VENT.x;
    const dz = p.z - VOLCANO_VENT.z;
    const dist = Math.hypot(dx, dz) || 0.0001;
    if (dist < 6) {
      const push = VOLCANO_VENT.pushStrength * (1 - dist / 6);
      p.x += (dx / dist) * push;
      p.z += (dz / dist) * push;
      clampPlayer();
      showToast("噴気が突き上げた!");
      playTone(140, 0.35, 0, "sawtooth", 0.14);
    }
  }
}
