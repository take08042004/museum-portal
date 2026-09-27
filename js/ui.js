// ---------------------------------------------------------------------------
// Thin, "dumb" presentation layer: DOM element references and small functions
// that just render whatever data they're given. Nothing in here reads game
// state on its own — callers (mainly state.js) pass in the values to show.
// ---------------------------------------------------------------------------

export const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
export const hud = document.getElementById("hud");

export function bindStartButton(onClick) {
  startBtn.addEventListener("click", onClick);
}

export function showHud() {
  startScreen.style.display = "none";
  hud.style.display = "block";
}

export function showStartScreen() {
  startScreen.style.display = "flex";
  hud.style.display = "none";
}

export function isHudVisible() {
  return hud.style.display !== "none";
}

const areaLabelEl = document.getElementById("area-label");
export function setAreaLabel(text) {
  areaLabelEl.textContent = text;
}

const invTitleEl = document.querySelector(".inv-title");
const inventoryListEl = document.getElementById("inventory-list");
export function refreshInventoryUI(items, total) {
  inventoryListEl.innerHTML = "";
  for (const it of items) {
    const li = document.createElement("li");
    li.textContent = it.name;
    inventoryListEl.appendChild(li);
  }
  invTitleEl.textContent = `持ち物 (${items.length}/${total})`;
}

const toastEl = document.getElementById("toast");
let toastTimer = null;
export function showToast(text, ms = 3400) {
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), ms);
}

const heldItemEl = document.getElementById("held-item");
export function refreshHeldUI(itemName) {
  if (itemName) {
    heldItemEl.textContent = `手に持っている:「${itemName}」`;
    heldItemEl.classList.add("visible");
  } else {
    heldItemEl.classList.remove("visible");
  }
}

const scoreTextEl = document.getElementById("score-text");
export function updateScoreText(score) {
  scoreTextEl.textContent = `スコア: ${score}`;
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const timerTextEl = document.getElementById("timer-text");
export function updateTimerText(elapsedSeconds) {
  timerTextEl.textContent = `タイム: ${formatTime(elapsedSeconds)}`;
}

export const promptEl = document.getElementById("prompt");
export function showPrompt(label) {
  promptEl.textContent = label;
  promptEl.classList.add("visible");
}
export function hidePrompt() {
  promptEl.classList.remove("visible");
}

export const fadeOverlayEl = document.getElementById("fade-overlay");
