// ---------------------------------------------------------------------------
// Static configuration: room/player constants, the painting worlds' data,
// and the altar riddle/effect system. Nothing here depends on THREE.js or
// the DOM — it's pure data plus a couple of pure helper functions.
// ---------------------------------------------------------------------------

export const ROOM_HALF = 10; // gallery walls at +-ROOM_HALF
export const PLAYER_BOUND_GALLERY = ROOM_HALF - 0.7;
export const WORLD_RADIUS = 15;
export const PLAYER_BOUND_WORLD = WORLD_RADIUS - 1.2;
export const MOVE_SPEED = 9;
export const INTERACT_DIST = 3.2;
export const ENTER_RADIUS = 1.6;
export const EXIT_RADIUS = 1.6;
export const EYE_HEIGHT = 1.65;

export const PAINTINGS = [
  {
    id: "stars",
    title: "星月夜の間",
    wall: "back",
    wallPos: -6,
    skyTop: 0x0b0c2a,
    skyBottom: 0x2a2a6b,
    ground: 0x1c1a3a,
    fog: 0x14163a,
    sunColor: 0xfff3c0,
    ambient: 0x33366b,
    itemName: "金色の星のかけら",
    itemColor: 0xffd76a,
    flavor: "夜空からこぼれ落ちた、小さな光の欠片。",
    riddle: ["夜空からこぼれ落ちた", "小さな光のかけら", "金色に輝く"],
  },
  {
    id: "desert",
    title: "灼熱の砂丘の間",
    wall: "back",
    wallPos: 0,
    skyTop: 0xffb066,
    skyBottom: 0xffe1a8,
    ground: 0xd9a15b,
    fog: 0xf0c37e,
    sunColor: 0xfff2d0,
    ambient: 0x8a5a2c,
    itemName: "砂漠のオアシスの雫",
    itemColor: 0x6adfff,
    flavor: "蜃気楼の奥に隠されていた、一滴の涼しさ。",
    riddle: ["蜃気楼の奥に隠れた", "灼熱の地に眠る", "ひとしずくの涼しさ"],
  },
  {
    id: "ocean",
    title: "深海の間",
    wall: "back",
    wallPos: 6,
    skyTop: 0x03203a,
    skyBottom: 0x0d5c7a,
    ground: 0x073048,
    fog: 0x0a4562,
    sunColor: 0xbfe8ff,
    ambient: 0x134a63,
    itemName: "深海の真珠",
    itemColor: 0xbfefff,
    flavor: "深海の静寂が、そのまま結晶になったもの。",
    riddle: ["深き水底に眠る", "丸く冷たい", "静寂の涙"],
  },
  {
    id: "forest",
    title: "霧森の間",
    wall: "left",
    wallPos: -3,
    skyTop: 0xcfe6a8,
    skyBottom: 0x1c3a24,
    ground: 0x2a4a2e,
    fog: 0x9fc79a,
    fogNear: 2,
    fogFar: 11,
    sunColor: 0xdff0b0,
    ambient: 0x3a5a3c,
    itemName: "木漏れ日の欠片",
    itemColor: 0x9be07a,
    flavor: "葉間からこぼれる光が、そのまま固まったもの。",
    riddle: ["深い森の奥に宿る", "葉間からこぼれた", "柔らかな光のかけら"],
  },
  {
    id: "volcano",
    title: "紅蓮の間",
    wall: "left",
    wallPos: 3,
    skyTop: 0x2a1410,
    skyBottom: 0x7a2410,
    ground: 0x241414,
    fog: 0x3a1c14,
    sunColor: 0xff8a5a,
    ambient: 0x5a2418,
    itemName: "紅蓮の欠片",
    itemColor: 0xff5a3c,
    flavor: "火口の奥で燃え続ける、静かな熱の記憶。",
    riddle: ["燃え盛る山の奥に眠る", "静かな熱を秘めた", "紅蓮のかけら"],
  },
  {
    id: "maze",
    title: "迷宮の間",
    wall: "front",
    wallPos: 5,
    skyTop: 0x241f30,
    skyBottom: 0x0a0810,
    ground: 0x342e40,
    fog: 0x1c1826,
    fogNear: 3,
    fogFar: 15,
    sunColor: 0x9c8cb4,
    ambient: 0x3e3654,
    itemName: "迷宮の糸玉",
    itemColor: 0xd8c8ff,
    flavor: "迷宮の奥で静かに丸まっていた、道しるべの糸。",
    riddle: ["複雑に絡み合った", "迷宮の奥に眠る", "銀色に光る糸玉"],
  },
];

export const SECRET_THEME = {
  id: "secret",
  title: "幻の間",
  skyTop: 0x3a1a5c,
  skyBottom: 0x0a0616,
  ground: 0x1a0f2e,
  fog: 0x160b28,
  sunColor: 0xe8c6ff,
  ambient: 0x3d2060,
};

export const CELEBRATION_THEME = {
  id: "celebration",
  title: "祝福の間",
  skyTop: 0xfff0c8,
  skyBottom: 0xffb066,
  ground: 0xffe3ad,
  fog: 0xffdca0,
  sunColor: 0xffffff,
  ambient: 0xffe0a8,
};

export const ALL_THEMES = [...PAINTINGS, SECRET_THEME, CELEBRATION_THEME];

// stepping-stone path the player must follow in the stars world
export const STAR_PATH = [
  { x: 0, z: 5 },
  { x: 3, z: 2 },
  { x: -3, z: -1 },
  { x: 2, z: -4 },
  { x: 0, z: -6 },
];
export const STAR_CORRIDOR = 2.6; // how far off the path you can stray
export const STAR_OFFTRACK_LIMIT = 2.5; // seconds before being sent back

// whirlpool current near the item in the ocean world
export const OCEAN_VORTEX = { x: 0, z: -6, radius: 5.5, strength: 1.0 };

// each altar's own calming effect, independent of which treasure satisfies it —
// the item's name is prepended at runtime once we know what actually worked
export const ALTAR_EFFECTS = {
  stars: "光の道が大きく広がり、迷うことがなくなった。",
  desert: "揺らめいていた蜃気楼が、すべて消え去った。",
  ocean: "荒ぶる渦潮が、そっと鎮まった。",
  forest: "立ち込めていた深い霧が、静かに晴れていった。",
  volcano: "山の怒りが鎮まり、大地の震えが収まった。",
  maze: "入り組んだ迷宮の床に、道しるべの光が浮かび上がった。",
};

// which treasure each altar secretly wants — reshuffled into a fresh
// derangement (no altar ever wants its own world's treasure) every time the
// page loads, so the riddles can't just be memorized across playthroughs
function shuffleAltarNeeds(ids) {
  let arr = ids.slice();
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    attempts++;
  } while (ids.some((id, idx) => arr[idx] === id) && attempts < 200);
  const map = {};
  ids.forEach((id, idx) => {
    map[id] = arr[idx];
  });
  return map;
}
export const ALTAR_NEEDS = shuffleAltarNeeds(PAINTINGS.map((t) => t.id));

// vent that periodically shocks the player back in the volcano world
export const VOLCANO_VENT = { x: 0, z: -6, radius: 6, pushStrength: 6, interval: 4.5 };

// layout of the procedurally generated labyrinth in the maze world
export const MAZE_SIZE = 5;
export const MAZE_CELL = 2.3;
export const MAZE_ENTRANCE_Z = -1;

export const SCORE = {
  item: 1000,
  secret: 1500,
  altar: 800,
  clearBase: 2000,
  offtrackPenalty: 150,
  secretBonus: 3000,
};
