import * as THREE from "three";
import { scene } from "./sceneSetup.js";
import {
  ROOM_HALF,
  EYE_HEIGHT,
  WORLD_RADIUS,
  PAINTINGS,
  SECRET_THEME,
  CELEBRATION_THEME,
  STAR_PATH,
  VOLCANO_VENT,
  MAZE_SIZE,
  MAZE_CELL,
  MAZE_ENTRANCE_Z,
  ALTAR_NEEDS,
} from "./config.js";
import { makeSkydome, makePaintingTexture, makePlaqueTexture, addTitlePlacard, createItemGeometry } from "./textures.js";
import { generateMazeCells, solveMazePath } from "./mazeGenerator.js";

// ---------------------------------------------------------------------------
// Builds every 3D object in the game: the gallery room (with its paintings,
// pedestals, and hidden frames) and each painting world. Everything this
// module creates is added to `scene` as a side effect of importing it.
// ---------------------------------------------------------------------------

export const galleryGroup = new THREE.Group();
scene.add(galleryGroup);

export const galleryAmbient = new THREE.AmbientLight(0x555560, 1.1);
galleryGroup.add(galleryAmbient);
export const gallerySpotlights = [];
for (const x of [-6, 0, 6]) {
  const spot = new THREE.PointLight(0xfff2d8, 18, 18, 2);
  spot.position.set(x, 5.6, -6);
  galleryGroup.add(spot);
  gallerySpotlights.push(spot);
}

const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7a63, roughness: 0.8 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2), floorMat);
floor.rotation.x = -Math.PI / 2;
galleryGroup.add(floor);

const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 1 });
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2), ceilMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 6;
galleryGroup.add(ceiling);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xdcd6c8, roughness: 0.95 });
function addWall(w, h, x, y, z, rotY) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  wall.position.set(x, y, z);
  wall.rotation.y = rotY;
  galleryGroup.add(wall);
}
addWall(ROOM_HALF * 2, 6, 0, 3, -ROOM_HALF, 0); // back
addWall(ROOM_HALF * 2, 6, 0, 3, ROOM_HALF, Math.PI); // front
addWall(ROOM_HALF * 2, 6, -ROOM_HALF, 3, 0, Math.PI / 2); // left
addWall(ROOM_HALF * 2, 6, ROOM_HALF, 3, 0, -Math.PI / 2); // right

export const enterTriggers = []; // {theme, position}
export const pedestalSlots = {}; // theme.id -> { group, gem }

// where a painting mounts depending on which gallery wall it's assigned to —
// new paintings just need a `wall` + `wallPos` and fall into place automatically
function getWallPlacement(theme) {
  if (theme.wall === "left") {
    return {
      framePos: new THREE.Vector3(-ROOM_HALF + 0.05, 2.6, theme.wallPos),
      frameRotY: Math.PI / 2,
      triggerPos: new THREE.Vector3(-ROOM_HALF + 1.6, EYE_HEIGHT, theme.wallPos),
      pedestalPos: new THREE.Vector3(-ROOM_HALF + 2.0, 0, theme.wallPos),
    };
  }
  if (theme.wall === "front") {
    return {
      framePos: new THREE.Vector3(theme.wallPos, 2.6, ROOM_HALF - 0.05),
      frameRotY: Math.PI,
      triggerPos: new THREE.Vector3(theme.wallPos, EYE_HEIGHT, ROOM_HALF - 1.6),
      pedestalPos: new THREE.Vector3(theme.wallPos, 0, ROOM_HALF - 4.2),
    };
  }
  if (theme.wall === "right") {
    return {
      framePos: new THREE.Vector3(ROOM_HALF - 0.05, 2.6, theme.wallPos),
      frameRotY: -Math.PI / 2,
      triggerPos: new THREE.Vector3(ROOM_HALF - 1.6, EYE_HEIGHT, theme.wallPos),
      pedestalPos: new THREE.Vector3(ROOM_HALF - 2.0, 0, theme.wallPos),
    };
  }
  // back (default)
  return {
    framePos: new THREE.Vector3(theme.wallPos, 2.6, -ROOM_HALF + 0.05),
    frameRotY: 0,
    triggerPos: new THREE.Vector3(theme.wallPos, EYE_HEIGHT, -ROOM_HALF + 1.6),
    pedestalPos: new THREE.Vector3(theme.wallPos, 0, -ROOM_HALF + 4.2),
  };
}

for (const theme of PAINTINGS) {
  const { framePos, frameRotY, triggerPos, pedestalPos } = getWallPlacement(theme);

  const frameGroup = new THREE.Group();
  frameGroup.position.copy(framePos);
  frameGroup.rotation.y = frameRotY;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xcda45a, metalness: 0.4, roughness: 0.4 })
  );
  frameGroup.add(frame);

  const canvasMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({ map: makePaintingTexture(theme) })
  );
  canvasMesh.position.z = 0.09;
  frameGroup.add(canvasMesh);
  addTitlePlacard(frameGroup, theme.title);

  galleryGroup.add(frameGroup);

  enterTriggers.push({ theme, position: triggerPos });

  const pedestal = new THREE.Group();
  pedestal.position.copy(pedestalPos);
  pedestal.visible = false;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 0.9, 16),
    new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 })
  );
  base.position.y = 0.45;
  pedestal.add(base);
  const item = new THREE.Mesh(
    createItemGeometry(theme, 0.28),
    new THREE.MeshStandardMaterial({
      color: theme.itemColor,
      emissive: theme.itemColor,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    })
  );
  item.position.y = 1.1;
  pedestal.add(item);
  galleryGroup.add(pedestal);
  pedestalSlots[theme.id] = { group: pedestal, gem: item };
}

// hidden 4th painting, revealed once every treasure has been brought back
export const secretFrameGroup = new THREE.Group();
secretFrameGroup.position.set(0, 2.6, ROOM_HALF - 0.05);
secretFrameGroup.rotation.y = Math.PI;
secretFrameGroup.visible = false;
secretFrameGroup.add(
  new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.4, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0xcda45a,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x55442a,
      emissiveIntensity: 0.4,
    })
  )
);
const secretCanvas = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 3),
  new THREE.MeshBasicMaterial({ map: makePaintingTexture(SECRET_THEME) })
);
secretCanvas.position.z = 0.09;
secretFrameGroup.add(secretCanvas);
addTitlePlacard(secretFrameGroup, SECRET_THEME.title);
export const secretGlow = new THREE.PointLight(0xe8c6ff, 0, 10, 2);
secretGlow.position.set(0, 0, 0.6);
secretFrameGroup.add(secretGlow);
galleryGroup.add(secretFrameGroup);

export const secretTrigger = {
  theme: SECRET_THEME,
  position: new THREE.Vector3(0, EYE_HEIGHT, ROOM_HALF - 1.6),
};

// hidden 5th painting, revealed only once every altar has been calmed
export const celebrationFrameGroup = new THREE.Group();
celebrationFrameGroup.position.set(ROOM_HALF - 0.05, 2.6, 0);
celebrationFrameGroup.rotation.y = -Math.PI / 2;
celebrationFrameGroup.visible = false;
celebrationFrameGroup.add(
  new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.4, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0xffdf9a,
      metalness: 0.5,
      roughness: 0.25,
      emissive: 0xffbf5a,
      emissiveIntensity: 0.5,
    })
  )
);
const celebrationCanvas = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 3),
  new THREE.MeshBasicMaterial({ map: makePaintingTexture(CELEBRATION_THEME) })
);
celebrationCanvas.position.z = 0.09;
celebrationFrameGroup.add(celebrationCanvas);
addTitlePlacard(celebrationFrameGroup, CELEBRATION_THEME.title);
export const celebrationGlow = new THREE.PointLight(0xffd27a, 0, 10, 2);
celebrationGlow.position.set(0, 0, 0.6);
celebrationFrameGroup.add(celebrationGlow);
galleryGroup.add(celebrationFrameGroup);

export const celebrationTrigger = {
  theme: CELEBRATION_THEME,
  position: new THREE.Vector3(ROOM_HALF - 1.6, EYE_HEIGHT, 0),
};

// ---------------------------------------------------------------------------
// Painting worlds
// ---------------------------------------------------------------------------

export const worldGroups = {}; // theme.id -> { group, itemMesh, portalMesh, spawn, ... }

function buildPaintingWorld(theme) {
  const group = new THREE.Group();
  group.visible = false;
  group.add(makeSkydome(theme));

  const groundMat = new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD_RADIUS, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const ambient = new THREE.AmbientLight(theme.ambient, 1.2);
  group.add(ambient);
  const sun = new THREE.DirectionalLight(theme.sunColor, 1.4);
  sun.position.set(8, 14, 4);
  group.add(sun);

  // theme decorations
  let ventGlow = null;
  let smoke = [];
  let mazeWallBoxes = [];
  let mazeGuideLine = null;
  let mazeItemPos = null;
  if (theme.id === "stars") {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * WORLD_RADIUS;
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff3c0 })
      );
      star.position.set(Math.cos(a) * r, 1 + Math.random() * 6, Math.sin(a) * r);
      group.add(star);
    }
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfdf6d8 })
    );
    moon.position.set(-8, 10, -10);
    group.add(moon);

    // glowing stepping stones + a connecting ribbon of light tracing the safe path
    for (let i = 0; i < STAR_PATH.length - 1; i++) {
      const a = STAR_PATH[i];
      const b = STAR_PATH[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const angle = Math.atan2(b.x - a.x, b.z - a.z);

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.03, segLen),
        new THREE.MeshStandardMaterial({
          color: 0xfff3c0,
          emissive: 0xfff3c0,
          emissiveIntensity: 0.9,
          roughness: 0.5,
          transparent: true,
          opacity: 0.85,
        })
      );
      ribbon.position.set(midX, 0.03, midZ);
      ribbon.rotation.y = angle;
      group.add(ribbon);

      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        if (s === 0 && i > 0) continue; // avoid doubling shared waypoints
        const t = s / steps;
        const stone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.75, 0.14, 16),
          new THREE.MeshStandardMaterial({
            color: 0xfff3c0,
            emissive: 0xfff3c0,
            emissiveIntensity: 0.9,
            roughness: 0.35,
          })
        );
        stone.position.set(a.x + (b.x - a.x) * t, 0.07, a.z + (b.z - a.z) * t);
        group.add(stone);
      }
    }
    // soft lights along the way so the path reads clearly even from a distance
    for (const p of STAR_PATH) {
      const pathLight = new THREE.PointLight(0xfff3c0, 0.8, 6, 2);
      pathLight.position.set(p.x, 1.2, p.z);
      group.add(pathLight);
    }
  } else if (theme.id === "desert") {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 4 + Math.random() * (WORLD_RADIUS - 6);
      const cactus = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x35662f })
      );
      body.position.y = 0.8;
      cactus.add(body);
      cactus.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      group.add(cactus);
    }
  } else if (theme.id === "ocean") {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * WORLD_RADIUS;
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xbfefff,
          transparent: true,
          opacity: 0.55,
          roughness: 0.1,
        })
      );
      bubble.position.set(Math.cos(a) * r, 0.3 + Math.random() * 5, Math.sin(a) * r);
      group.add(bubble);
    }
  } else if (theme.id === "forest") {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (WORLD_RADIUS - 4);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 })
      );
      trunk.position.y = 1.6;
      tree.add(trunk);
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(1.1 + Math.random() * 0.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2f5a30, roughness: 0.85 })
      );
      canopy.position.y = 3.4;
      tree.add(canopy);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      group.add(tree);
    }
    for (let i = 0; i < 26; i++) {
      const firefly = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xd8ffb0 })
      );
      firefly.position.set(
        (Math.random() - 0.5) * WORLD_RADIUS * 1.4,
        0.4 + Math.random() * 2,
        (Math.random() - 0.5) * WORLD_RADIUS * 1.4
      );
      group.add(firefly);
    }
  } else if (theme.id === "volcano") {
    // central vent with glowing lava
    const vent = new THREE.Group();
    vent.position.set(VOLCANO_VENT.x, 0, VOLCANO_VENT.z);
    const ventCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 2.4, 1.6, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1c1210, roughness: 0.9, side: THREE.DoubleSide })
    );
    ventCone.position.y = 0.8;
    vent.add(ventCone);
    const lavaPool = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 20),
      new THREE.MeshStandardMaterial({
        color: 0xff7a3c,
        emissive: 0xff5a20,
        emissiveIntensity: 1.2,
        roughness: 0.4,
      })
    );
    lavaPool.rotation.x = -Math.PI / 2;
    lavaPool.position.y = 1.58;
    vent.add(lavaPool);
    ventGlow = new THREE.PointLight(0xff7a3c, 2.5, 14, 2);
    ventGlow.position.set(0, 2, 0);
    vent.add(ventGlow);
    group.add(vent);

    // scattered glowing lava cracks across the ground
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (WORLD_RADIUS - 5);
      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 1.4 + Math.random()),
        new THREE.MeshStandardMaterial({
          color: 0xff7a3c,
          emissive: 0xff5a20,
          emissiveIntensity: 0.9,
        })
      );
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = Math.random() * Math.PI;
      crack.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
      group.add(crack);
    }

    // dark smoke rising slowly
    for (let i = 0; i < 16; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 0.4, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2220, transparent: true, opacity: 0.4 })
      );
      puff.position.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 8,
        VOLCANO_VENT.z + (Math.random() - 0.5) * 4
      );
      group.add(puff);
      smoke.push(puff);
    }
  } else if (theme.id === "maze") {
    const size = MAZE_SIZE;
    const cellsGrid = generateMazeCells(size);
    const entranceCell = [Math.floor(size / 2), 0];
    const exitCell = [size - 1, size - 1];
    cellsGrid[entranceCell[1]][entranceCell[0]].N = false; // open a door to the outside

    const cellCenter = (cx, cy) => ({
      x: -(size * MAZE_CELL) / 2 + MAZE_CELL * (cx + 0.5),
      z: MAZE_ENTRANCE_Z - MAZE_CELL * (cy + 0.5),
    });

    const mazeWallMat = new THREE.MeshStandardMaterial({ color: 0x4a4258, roughness: 0.85 });
    const wallH = 2.4;
    const wallT = 0.16;
    const addWallSegment = (wx, wz, w, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mazeWallMat);
      mesh.position.set(wx, wallH / 2, wz);
      group.add(mesh);
      mazeWallBoxes.push({
        minX: wx - w / 2 - 0.05,
        maxX: wx + w / 2 + 0.05,
        minZ: wz - d / 2 - 0.05,
        maxZ: wz + d / 2 + 0.05,
      });
    };
    for (let cy = 0; cy < size; cy++) {
      for (let cx = 0; cx < size; cx++) {
        const c = cellsGrid[cy][cx];
        const { x, z } = cellCenter(cx, cy);
        if (c.N) addWallSegment(x, z + MAZE_CELL / 2, MAZE_CELL + wallT, wallT);
        if (c.S) addWallSegment(x, z - MAZE_CELL / 2, MAZE_CELL + wallT, wallT);
        if (c.E) addWallSegment(x + MAZE_CELL / 2, z, wallT, MAZE_CELL + wallT);
        if (c.W) addWallSegment(x - MAZE_CELL / 2, z, wallT, MAZE_CELL + wallT);
      }
    }

    // a handful of torches scattered through the labyrinth for atmosphere
    for (let i = 0; i < 16; i++) {
      const cx = Math.floor(Math.random() * size);
      const cy = Math.floor(Math.random() * size);
      const { x, z } = cellCenter(cx, cy);
      const ox = (Math.random() - 0.5) * 0.9;
      const oz = (Math.random() - 0.5) * 0.9;
      const torchLight = new THREE.PointLight(0xffab5a, 1.8, 7.5, 2);
      torchLight.position.set(x + ox, 1.7, z + oz);
      group.add(torchLight);
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffcf8a })
      );
      flame.position.copy(torchLight.position);
      group.add(flame);
    }

    // solution guide-line, hidden until the maze's altar is calmed
    const path = solveMazePath(cellsGrid, entranceCell, exitCell);
    const guide = new THREE.Group();
    guide.visible = false;
    for (let i = 0; i < path.length - 1; i++) {
      const a = cellCenter(...path[i]);
      const b = cellCenter(...path[i + 1]);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const angle = Math.atan2(b.x - a.x, b.z - a.z);
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.03, len),
        new THREE.MeshStandardMaterial({
          color: 0xd8c8ff,
          emissive: 0xd8c8ff,
          emissiveIntensity: 0.9,
          roughness: 0.5,
        })
      );
      seg.position.set((a.x + b.x) / 2, 0.03, (a.z + b.z) / 2);
      seg.rotation.y = angle;
      guide.add(seg);
    }
    group.add(guide);
    mazeGuideLine = guide;
    mazeItemPos = cellCenter(...exitCell);
  }

  scene.fog = null; // set on switch

  // spawn point + portal back marker, placed together but offset so re-entry doesn't insta-trigger
  const spawn = new THREE.Vector3(0, EYE_HEIGHT, 5);
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, 6.6);
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.09, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf4e7c1,
      emissive: 0xf4e7c1,
      emissiveIntensity: 0.6,
    })
  );
  portalRing.position.y = 1.4;
  portalGroup.add(portalRing);
  group.add(portalGroup);

  // collectible item, out in the world away from the portal
  const itemGroup = new THREE.Group();
  if (mazeItemPos) itemGroup.position.set(mazeItemPos.x, 0, mazeItemPos.z);
  else itemGroup.position.set(0, 0, -6);
  const itemMesh = new THREE.Mesh(
    createItemGeometry(theme, 0.4),
    new THREE.MeshStandardMaterial({
      color: theme.itemColor,
      emissive: theme.itemColor,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    })
  );
  itemMesh.position.y = 1;
  itemGroup.add(itemMesh);
  group.add(itemGroup);

  // desert mirages: decoys near the real item that fade out as you approach
  const mirages = [];
  if (theme.id === "desert") {
    for (const offset of [
      { x: 2.4, z: 1.1 },
      { x: -2.1, z: -1.4 },
    ]) {
      const decoy = new THREE.Mesh(
        createItemGeometry(theme, 0.4),
        new THREE.MeshStandardMaterial({
          color: theme.itemColor,
          emissive: theme.itemColor,
          emissiveIntensity: 0.5,
          roughness: 0.25,
          transparent: true,
          opacity: 0.55,
        })
      );
      decoy.position.set(offset.x, 1, offset.z);
      itemGroup.add(decoy);
      mirages.push({ mesh: decoy, offset });
    }
  }

  // altar for offering a treasure carried in from another world
  const altarGroup = new THREE.Group();
  altarGroup.position.set(-3, 0, 4);
  const altarBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.65, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.7 })
  );
  altarBase.position.y = 0.35;
  altarGroup.add(altarBase);
  const altarBowl = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.07, 10, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      roughness: 0.4,
    })
  );
  altarBowl.rotation.x = Math.PI / 2;
  altarBowl.position.y = 0.75;
  altarGroup.add(altarBowl);
  const altarGlow = new THREE.PointLight(0xffffff, 0.3, 4, 2);
  altarGlow.position.set(0, 1, 0);
  altarGroup.add(altarGlow);

  // inscription plaque: a riddle hinting at the treasure this altar wants,
  // without naming it outright — the mystery/deduction element
  const plaquePost = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.8 })
  );
  plaquePost.position.set(0, 0.55, -0.55);
  altarGroup.add(plaquePost);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.76),
    new THREE.MeshBasicMaterial({
      map: makePlaqueTexture(PAINTINGS.find((t) => t.id === ALTAR_NEEDS[theme.id]).riddle),
      side: THREE.DoubleSide,
    })
  );
  plaque.position.set(0, 1.25, -0.55);
  plaque.rotation.x = -0.12;
  altarGroup.add(plaque);

  group.add(altarGroup);

  scene.add(group);

  return {
    group,
    itemMesh,
    itemGroup,
    mirages,
    ventGlow,
    smoke,
    wallBoxes: mazeWallBoxes,
    guideLine: mazeGuideLine,
    portalPosition: portalGroup.position.clone(),
    altarPosition: altarGroup.position.clone(),
    altarBowl,
    altarGlow,
    spawn,
    collected: false,
  };
}

for (const theme of PAINTINGS) {
  worldGroups[theme.id] = buildPaintingWorld(theme);
}

function buildSecretWorld(theme) {
  const group = new THREE.Group();
  group.visible = false;
  group.add(makeSkydome(theme));

  const groundMat = new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.85, metalness: 0.15 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD_RADIUS, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  group.add(new THREE.AmbientLight(theme.ambient, 1.3));
  const glow = new THREE.PointLight(theme.sunColor, 2.4, 22, 2);
  glow.position.set(0, 4, -5);
  group.add(glow);

  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * WORLD_RADIUS;
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xe8c6ff })
    );
    mote.position.set(Math.cos(a) * r, 0.5 + Math.random() * 5, Math.sin(a) * r);
    group.add(mote);
  }

  // slowly spinning display of the treasures brought back from the paintings
  const treasureRing = new THREE.Group();
  treasureRing.position.set(0, 2, -5);
  for (const t of PAINTINGS) {
    const idx = PAINTINGS.indexOf(t);
    const angle = (idx / PAINTINGS.length) * Math.PI * 2;
    const gem = new THREE.Mesh(
      createItemGeometry(t, 0.35),
      new THREE.MeshStandardMaterial({
        color: t.itemColor,
        emissive: t.itemColor,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      })
    );
    gem.position.set(Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2);
    treasureRing.add(gem);
  }
  group.add(treasureRing);

  // a bonus crystal hidden above the ring, purely for curious explorers
  const bonusItem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe8c6ff,
      emissiveIntensity: 0.9,
      roughness: 0.15,
    })
  );
  bonusItem.position.set(0, 3.6, -5);
  group.add(bonusItem);

  const spawn = new THREE.Vector3(0, EYE_HEIGHT, 5);
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, 6.6);
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.09, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xe8c6ff,
      emissive: 0xe8c6ff,
      emissiveIntensity: 0.6,
    })
  );
  portalRing.position.y = 1.4;
  portalGroup.add(portalRing);
  group.add(portalGroup);

  scene.add(group);

  return {
    group,
    portalPosition: portalGroup.position.clone(),
    spawn,
    collected: true, // nothing to pick up here
    treasureRing,
    bonusItem,
  };
}

worldGroups[SECRET_THEME.id] = buildSecretWorld(SECRET_THEME);

function buildCelebrationWorld(theme) {
  const group = new THREE.Group();
  group.visible = false;
  group.add(makeSkydome(theme));

  const groundMat = new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.8, metalness: 0.05 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD_RADIUS, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  group.add(new THREE.AmbientLight(theme.ambient, 1.5));
  const sun = new THREE.DirectionalLight(theme.sunColor, 1.8);
  sun.position.set(6, 16, 6);
  group.add(sun);

  // sky lanterns rising gently forever
  const lanternColors = PAINTINGS.map((t) => t.itemColor);
  const lanterns = [];
  for (let i = 0; i < 24; i++) {
    const baseX = (Math.random() - 0.5) * WORLD_RADIUS * 1.6;
    const baseZ = (Math.random() - 0.5) * WORLD_RADIUS * 1.6;
    const color = lanternColors[i % lanternColors.length];
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    lantern.position.set(baseX, Math.random() * 9, baseZ);
    group.add(lantern);
    lanterns.push({
      mesh: lantern,
      baseX,
      baseZ,
      speed: 0.6 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // centerpiece: a crystal fusing every treasure's color, plus a glowing ground inlay
  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.6, 40),
    new THREE.MeshStandardMaterial({
      color: 0xffe9b0,
      emissive: 0xffcf8a,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      side: THREE.DoubleSide,
    })
  );
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.set(0, 0.02, -6);
  group.add(inlay);

  const monument = new THREE.Group();
  monument.position.set(0, 0, -6);
  const pedestalBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.1, 1.2, 20),
    new THREE.MeshStandardMaterial({ color: 0xffe9b0, roughness: 0.5, metalness: 0.3 })
  );
  pedestalBase.position.y = 0.6;
  monument.add(pedestalBase);
  const crystal = new THREE.Group();
  crystal.position.y = 1.8;
  PAINTINGS.forEach((t, i) => {
    const shard = new THREE.Mesh(
      createItemGeometry(t, 0.32),
      new THREE.MeshStandardMaterial({
        color: t.itemColor,
        emissive: t.itemColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    );
    const a = (i / PAINTINGS.length) * Math.PI * 2;
    shard.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4);
    crystal.add(shard);
  });
  monument.add(crystal);
  group.add(monument);

  const spawn = new THREE.Vector3(0, EYE_HEIGHT, 5);
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0, 6.6);
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.09, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xffd27a,
      emissiveIntensity: 0.6,
    })
  );
  portalRing.position.y = 1.4;
  portalGroup.add(portalRing);
  group.add(portalGroup);

  scene.add(group);

  return {
    group,
    portalPosition: portalGroup.position.clone(),
    monumentPosition: monument.position.clone(),
    spawn,
    collected: true, // nothing to pick up here
    lanterns,
    crystal,
    inlay,
  };
}

worldGroups[CELEBRATION_THEME.id] = buildCelebrationWorld(CELEBRATION_THEME);
