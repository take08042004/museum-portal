import * as THREE from "three";
import { scene, controls } from "./sceneSetup.js";
import {
  PAINTINGS,
  SECRET_THEME,
  CELEBRATION_THEME,
  ALL_THEMES,
  INTERACT_DIST,
  ENTER_RADIUS,
  EXIT_RADIUS,
  WORLD_RADIUS,
  ROOM_HALF,
  STAR_CORRIDOR,
  OCEAN_VORTEX,
  VOLCANO_VENT,
  ALTAR_EFFECTS,
  ALTAR_NEEDS,
  SCORE,
} from "./config.js";
import {
  worldGroups,
  pedestalSlots,
  enterTriggers,
  galleryGroup,
  gallerySpotlights,
  galleryAmbient,
  secretFrameGroup,
  secretGlow,
  secretTrigger,
  celebrationFrameGroup,
  celebrationGlow,
  celebrationTrigger,
} from "./worldBuilders.js";
import { playPickupChime, playFanfare, playGrandFanfare } from "./audio.js";
import * as ui from "./ui.js";

// ---------------------------------------------------------------------------
// This is the game's "brain": every piece of mutable progress (what area
// you're in, what you're carrying, what's been unlocked, your score) plus
// the functions that change it. Display is delegated to ui.js; 3D objects
// come from worldBuilders.js.
// ---------------------------------------------------------------------------

let currentArea = "gallery"; // "gallery" | theme.id
let transitionLockUntil = 0;
const inventory = []; // {themeId, name, color}

let secretRevealed = false;
let grandComplete = false; // true once every altar has been used
let secretBonusCollected = false;
let starCorridorEffective = STAR_CORRIDOR;

let score = 0;
let offtrackCount = 0;
let runStartTime = null;

let heldItem = null; // themeId currently carried in hand, or null
const altarUsed = {
  stars: false,
  desert: false,
  ocean: false,
  forest: false,
  volcano: false,
  maze: false,
};

// ---- getters/mutators used by other modules (mainly movement.js) ----

export function getCurrentArea() {
  return currentArea;
}
export function getStarCorridorEffective() {
  return starCorridorEffective;
}
export function incrementOfftrackCount() {
  offtrackCount++;
}
export function startRunTimerIfNeeded() {
  if (runStartTime === null && !grandComplete) runStartTime = performance.now();
}
export function refreshTimerUI() {
  const elapsed = runStartTime === null ? 0 : (performance.now() - runStartTime) / 1000;
  ui.updateTimerText(elapsed);
}

function addScore(points) {
  score = Math.max(0, score + points);
  ui.updateScoreText(score);
}
export { addScore };

function galleryLabel() {
  return grandComplete ? "美術館 ー 安らぎに満ちて ー" : "美術館";
}

ui.setAreaLabel(galleryLabel());

function refreshInventoryUI() {
  ui.refreshInventoryUI(inventory, PAINTINGS.length);
}

// ---------------------------------------------------------------------------
// Area transitions
// ---------------------------------------------------------------------------

function fadeSwitch(callback) {
  ui.fadeOverlayEl.classList.add("active");
  setTimeout(() => {
    callback();
    setTimeout(() => ui.fadeOverlayEl.classList.remove("active"), 30);
  }, 260);
}

function enterWorld(theme) {
  fadeSwitch(() => {
    galleryGroup.visible = false;
    const w = worldGroups[theme.id];
    w.group.visible = true;
    scene.background = null;
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear ?? 6, theme.fogFar ?? WORLD_RADIUS + 6);
    controls.object.position.copy(w.spawn);
    controls.object.rotation.set(0, 0, 0); // face into the world; the portal stays behind you
    currentArea = theme.id;
    transitionLockUntil = performance.now() + 900;
    ui.setAreaLabel(theme.title);
  });
}

function exitWorld(theme) {
  fadeSwitch(() => {
    const w = worldGroups[theme.id];
    w.group.visible = false;
    galleryGroup.visible = true;
    scene.background = new THREE.Color(0x141218);
    scene.fog = null;
    const trigger = enterTriggers.find((t) => t.theme.id === theme.id);
    const outPos = trigger.position.clone();
    outPos.z += 1.6; // step further into the room so we are outside the enter radius
    controls.object.position.copy(outPos);
    controls.object.rotation.set(0, 0, 0);
    currentArea = "gallery";
    transitionLockUntil = performance.now() + 900;
    ui.setAreaLabel(galleryLabel());
  });
}

export function updateAreaProximity() {
  if (performance.now() < transitionLockUntil) return;
  const playerPos = controls.object.position;

  if (currentArea === "gallery") {
    for (const trig of enterTriggers) {
      const d = Math.hypot(playerPos.x - trig.position.x, playerPos.z - trig.position.z);
      if (d < ENTER_RADIUS) {
        enterWorld(trig.theme);
        return;
      }
    }
  } else {
    const w = worldGroups[currentArea];
    const theme = ALL_THEMES.find((t) => t.id === currentArea);
    const d = Math.hypot(playerPos.x - w.portalPosition.x, playerPos.z - w.portalPosition.z);
    if (d < EXIT_RADIUS) {
      exitWorld(theme);
    }
  }
}

// ---------------------------------------------------------------------------
// Collecting treasures + the hidden 4th painting
// ---------------------------------------------------------------------------

export function collectItem(theme, opts = {}) {
  const w = worldGroups[theme.id];
  if (w.collected) return;
  w.collected = true;
  w.itemGroup.visible = false;
  inventory.push({ themeId: theme.id, name: theme.itemName, color: theme.itemColor });
  refreshInventoryUI();
  pedestalSlots[theme.id].group.visible = true;
  if (!opts.silent) {
    playPickupChime();
    addScore(SCORE.item);
    ui.showToast(`「${theme.itemName}」を手に入れた。${theme.flavor}(+${SCORE.item})`);
    checkSecretUnlock();
  }
}

function checkSecretUnlock(opts = {}) {
  if (secretRevealed || inventory.length < PAINTINGS.length) return;
  secretRevealed = true;
  secretFrameGroup.visible = true;
  secretGlow.intensity = 1.6;
  enterTriggers.push(secretTrigger);
  if (!opts.silent) {
    playFanfare();
    addScore(SCORE.secret);
    ui.showToast(`美術館の奥に、見たことのない絵が浮かび上がった…(+${SCORE.secret})`);
  }
}

function collectSecretBonus() {
  if (secretBonusCollected) return;
  secretBonusCollected = true;
  worldGroups.secret.bonusItem.visible = false;
  playPickupChime();
  addScore(SCORE.secretBonus);
  ui.showToast(
    `幻の結晶を見つけた。誰にも見せたことのない、この美術館だけの秘密。(+${SCORE.secretBonus})`,
    4200
  );
}

function showEpilogue() {
  playPickupChime();
  ui.showToast(
    "この場所に集められた光と色は、これからも静かに輝き続ける。あなたが見つけた道のりも、きっとどこかの絵の中に残るだろう。",
    6200
  );
}

// ---------------------------------------------------------------------------
// Carrying a treasure between worlds
// ---------------------------------------------------------------------------

function refreshHeldUI() {
  ui.refreshHeldUI(heldItem ? PAINTINGS.find((t) => t.id === heldItem).itemName : null);
}

function pickUpTreasure(theme) {
  if (heldItem !== null) return;
  heldItem = theme.id;
  pedestalSlots[theme.id].gem.visible = false;
  refreshHeldUI();
  ui.showToast(`「${theme.itemName}」を手に取った。`);
}

function returnHeldItemHome(opts = {}) {
  if (heldItem === null) return;
  pedestalSlots[heldItem].gem.visible = true;
  heldItem = null;
  refreshHeldUI();
  if (!opts.silent) ui.showToast("台座に戻した。");
}

function applyAltarEffect(themeId, opts = {}) {
  altarUsed[themeId] = true;
  const w = worldGroups[themeId];
  w.altarGlow.intensity = 1.6;
  w.altarBowl.material.emissiveIntensity = 0.8;
  if (themeId === "stars") starCorridorEffective = 999;
  if (themeId === "desert") {
    for (const { mesh } of worldGroups.desert.mirages) mesh.visible = false;
  }
  if (themeId === "ocean") OCEAN_VORTEX.strength = 0.15;
  if (themeId === "forest") {
    const forestTheme = PAINTINGS.find((t) => t.id === "forest");
    forestTheme.fogNear = 6;
    forestTheme.fogFar = WORLD_RADIUS + 6;
    if (currentArea === "forest") scene.fog = new THREE.Fog(forestTheme.fog, 6, WORLD_RADIUS + 6);
  }
  if (themeId === "volcano") VOLCANO_VENT.pushStrength = 0.4;
  if (themeId === "maze") w.guideLine.visible = true;
  if (!opts.silent) {
    playFanfare();
    addScore(SCORE.altar);
    const usedTheme = PAINTINGS.find((t) => t.id === heldItem);
    const itemPhrase = usedTheme ? `「${usedTheme.itemName}」の力で、` : "";
    ui.showToast(`${itemPhrase}${ALTAR_EFFECTS[themeId]}(+${SCORE.altar})`);
  }
  if (Object.values(altarUsed).every(Boolean)) {
    triggerGrandCompletion(opts);
  }
}

function triggerGrandCompletion(opts = {}) {
  if (grandComplete) return;
  grandComplete = true;

  galleryAmbient.intensity = 1.7;
  for (const spot of gallerySpotlights) {
    spot.color.set(0xffe9b0);
    spot.intensity = 28;
  }
  for (let i = 0; i < 40; i++) {
    const mote = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0 })
    );
    mote.position.set(
      (Math.random() - 0.5) * ROOM_HALF * 1.8,
      1 + Math.random() * 4,
      (Math.random() - 0.5) * ROOM_HALF * 1.8
    );
    galleryGroup.add(mote);
  }
  if (currentArea === "gallery") ui.setAreaLabel(galleryLabel());

  celebrationFrameGroup.visible = true;
  celebrationGlow.intensity = 1.6;
  enterTriggers.push(celebrationTrigger);

  if (!opts.silent) {
    playGrandFanfare();
    const elapsedSeconds = runStartTime === null ? 0 : (performance.now() - runStartTime) / 1000;
    const timeBonus = Math.max(0, 3000 - Math.floor(elapsedSeconds) * 6);
    addScore(SCORE.clearBase + timeBonus);
    ui.showToast(
      `3つの絵画世界が、静かな光に包まれた。美術館に、深い安らぎが満ちていく……(+${SCORE.clearBase + timeBonus})`,
      5200
    );
    showResultsModal(score, elapsedSeconds);
  }
}

function useAltar(theme) {
  if (heldItem === null) return;
  if (altarUsed[theme.id]) {
    ui.showToast("この祭壇はもう役目を終えている。");
    returnHeldItemHome({ silent: true });
    return;
  }
  if (heldItem === ALTAR_NEEDS[theme.id]) {
    applyAltarEffect(theme.id);
  } else {
    ui.showToast("……何も起こらなかった。");
  }
  returnHeldItemHome({ silent: true });
}

// ---------------------------------------------------------------------------
// High scores (localStorage) — progress itself is never persisted, so every
// fresh page load starts from an empty museum; only the score history remains.
// ---------------------------------------------------------------------------

const HIGHSCORE_KEY = "museum-portal-highscores-v1";

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveHighScore(entryScore, elapsedSeconds) {
  const list = loadHighScores();
  list.push({ score: entryScore, time: elapsedSeconds, date: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, 5);
  try {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // ignore
  }
  return trimmed;
}

const resultsModal = document.getElementById("results-modal");
const resTimeEl = document.getElementById("res-time");
const resOfftrackEl = document.getElementById("res-offtrack");
const resScoreEl = document.getElementById("res-score");
const resBestNoteEl = document.getElementById("res-best-note");
const resHighscoreListEl = document.getElementById("res-highscore-list");
const resCloseBtn = document.getElementById("res-close-btn");
const resRetryBtn = document.getElementById("res-retry-btn");

function showResultsModal(finalScore, elapsedSeconds) {
  const previousBest = loadHighScores()[0];
  const isNewBest = !previousBest || finalScore > previousBest.score;
  const list = saveHighScore(finalScore, elapsedSeconds);

  resTimeEl.textContent = ui.formatTime(elapsedSeconds);
  resOfftrackEl.textContent = String(offtrackCount);
  resScoreEl.textContent = String(finalScore);
  resBestNoteEl.textContent = isNewBest ? "自己ベスト更新!" : "";

  resHighscoreListEl.innerHTML = "";
  list.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.score}点 — ${ui.formatTime(entry.time)}`;
    if (entry.score === finalScore && entry.time === elapsedSeconds) li.classList.add("current");
    resHighscoreListEl.appendChild(li);
  });

  resultsModal.classList.add("visible");
  controls.unlock();
}

resCloseBtn.addEventListener("click", () => {
  resultsModal.classList.remove("visible");
  controls.lock();
});
resRetryBtn.addEventListener("click", () => {
  location.reload();
});

// ---------------------------------------------------------------------------
// Collection screen — a journal of everything discovered so far
// ---------------------------------------------------------------------------

const collectionModal = document.getElementById("collection-modal");
const collectionItemsEl = document.getElementById("collection-items");
const collectionAltarsEl = document.getElementById("collection-altars");
const collectionEventsEl = document.getElementById("collection-events");
const collectionCloseBtn = document.getElementById("collection-close-btn");

let collectionOpen = false;
let wasLockedBeforeCollection = false;

function refreshCollectionUI() {
  collectionItemsEl.innerHTML = "";
  for (const theme of PAINTINGS) {
    const collected = inventory.some((i) => i.themeId === theme.id);
    const hex = "#" + theme.itemColor.toString(16).padStart(6, "0");
    const card = document.createElement("div");
    card.className = "collection-card" + (collected ? "" : " locked");
    card.innerHTML = `
      <div class="collection-card-head">
        <div class="collection-swatch" style="background:${collected ? hex : "#4a4458"};color:${hex}"></div>
        <div class="collection-card-name">${collected ? theme.itemName : "？？？"}</div>
      </div>
      <div class="collection-card-world">${theme.title}</div>
      <div class="collection-card-flavor">${collected ? theme.flavor : "まだ見つけていない"}</div>
    `;
    collectionItemsEl.appendChild(card);
  }

  collectionAltarsEl.innerHTML = "";
  for (const theme of PAINTINGS) {
    const used = altarUsed[theme.id];
    const li = document.createElement("li");
    if (used) {
      const itemTheme = PAINTINGS.find((t) => t.id === ALTAR_NEEDS[theme.id]);
      li.innerHTML = `<b>${theme.title}</b>の祭壇 — 「${itemTheme.itemName}」の力で: ${ALTAR_EFFECTS[theme.id]}`;
    } else {
      li.className = "locked";
      li.innerHTML = `<b>${theme.title}</b>の祭壇 — まだ捧げられていない`;
    }
    collectionAltarsEl.appendChild(li);
  }

  collectionEventsEl.innerHTML = "";
  const events = [
    { done: secretRevealed, text: `隠された「${SECRET_THEME.title}」を見つけた` },
    { done: secretBonusCollected, text: "幻の結晶を見つけた" },
    { done: grandComplete, text: `美術館の奥に「${CELEBRATION_THEME.title}」が現れた` },
  ];
  for (const ev of events) {
    const li = document.createElement("li");
    li.textContent = ev.done ? ev.text : "？？？";
    if (!ev.done) li.className = "locked";
    collectionEventsEl.appendChild(li);
  }
}

function openCollection() {
  if (collectionOpen) return;
  collectionOpen = true;
  refreshCollectionUI();
  collectionModal.classList.add("visible");
  wasLockedBeforeCollection = controls.isLocked;
  if (controls.isLocked) controls.unlock();
}

function closeCollection() {
  if (!collectionOpen) return;
  collectionOpen = false;
  collectionModal.classList.remove("visible");
  if (wasLockedBeforeCollection) controls.lock();
}

export function toggleCollection() {
  if (resultsModal.classList.contains("visible")) return;
  if (!ui.isHudVisible() && !collectionOpen) return;
  if (collectionOpen) closeCollection();
  else openCollection();
}

collectionCloseBtn.addEventListener("click", () => closeCollection());

// ---------------------------------------------------------------------------
// Interaction (E key): item pickup, altars, the secret bonus, the epilogue
// ---------------------------------------------------------------------------

let currentInteractable = null; // { label, action }

export function tryInteract() {
  if (currentInteractable) currentInteractable.action();
}

export function updatePrompt() {
  currentInteractable = null;
  const playerPos = controls.object.position;

  if (currentArea === "gallery") {
    for (const theme of PAINTINGS) {
      const slot = pedestalSlots[theme.id];
      if (!slot.group.visible) continue; // not collected yet
      const d = playerPos.distanceTo(slot.group.position);
      if (d < INTERACT_DIST) {
        if (heldItem === theme.id) {
          currentInteractable = {
            label: `E で「${theme.itemName}」を台座に戻す`,
            action: () => returnHeldItemHome(),
          };
        } else if (heldItem === null) {
          currentInteractable = {
            label: `E で「${theme.itemName}」を持つ`,
            action: () => pickUpTreasure(theme),
          };
        }
        break;
      }
    }
  } else if (currentArea === "secret") {
    if (!secretBonusCollected) {
      const d = playerPos.distanceTo(worldGroups.secret.bonusItem.position);
      if (d < INTERACT_DIST) {
        currentInteractable = {
          label: "E で光る結晶を拾う",
          action: () => collectSecretBonus(),
        };
      }
    }
  } else if (currentArea === "celebration") {
    const d = playerPos.distanceTo(worldGroups.celebration.monumentPosition);
    if (d < INTERACT_DIST) {
      currentInteractable = {
        label: "E で碑文を読む",
        action: () => showEpilogue(),
      };
    }
  } else {
    const w = worldGroups[currentArea];
    const theme = ALL_THEMES.find((t) => t.id === currentArea);
    if (!w.collected) {
      const d = playerPos.distanceTo(
        new THREE.Vector3(w.itemGroup.position.x, playerPos.y, w.itemGroup.position.z)
      );
      if (d < INTERACT_DIST) {
        currentInteractable = {
          label: `E で「${theme.itemName}」を拾う`,
          action: () => collectItem(theme),
        };
      }
    }
    if (!currentInteractable && heldItem !== null) {
      const d = playerPos.distanceTo(
        new THREE.Vector3(w.altarPosition.x, playerPos.y, w.altarPosition.z)
      );
      if (d < INTERACT_DIST) {
        const heldTheme = PAINTINGS.find((t) => t.id === heldItem);
        currentInteractable = {
          label: `E で「${heldTheme.itemName}」を祭壇に捧げる`,
          action: () => useAltar(theme),
        };
      }
    }
  }

  if (currentInteractable) {
    ui.showPrompt(currentInteractable.label);
  } else {
    ui.hidePrompt();
  }
}
