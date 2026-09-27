import * as THREE from "three";
import { SECRET_THEME } from "./js/config.js";
import { scene, camera, renderer, controls } from "./js/sceneSetup.js";
import { worldGroups } from "./js/worldBuilders.js";
import * as ui from "./js/ui.js";
import * as audio from "./js/audio.js";
import * as state from "./js/state.js";
import * as movement from "./js/movement.js";

// ---------------------------------------------------------------------------
// Slim orchestrator: wires up the DOM/input events and runs the animation
// loop. All of the actual game logic lives in state.js/movement.js; all of
// the 3D content is already built by importing worldBuilders.js above.
// ---------------------------------------------------------------------------

controls.addEventListener("lock", () => {
  ui.showHud();
  audio.startBgm();
});
controls.addEventListener("unlock", () => {
  ui.showStartScreen();
});
ui.bindStartButton(() => controls.lock());

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyE") state.tryInteract();
  else if (e.code === "KeyM") audio.setBgmMuted(!audio.isBgmMuted());
  else if (e.code === "KeyI") state.toggleCollection();
});

const clock = new THREE.Clock();
let uiThrottle = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  uiThrottle += dt;
  if (uiThrottle > 0.2) {
    state.refreshTimerUI();
    uiThrottle = 0;
  }

  movement.updateMovement(dt);
  movement.applyOceanCurrent(dt);
  movement.updateStarPath(dt);
  movement.updateMirages();
  state.updateAreaProximity();
  state.updatePrompt();
  worldGroups[SECRET_THEME.id].treasureRing.rotation.y += dt * 0.3;
  movement.updateCelebration(dt);
  movement.updateVolcanoShockwave(dt);
  movement.resolveMazeCollision();

  renderer.render(scene, camera);
}
animate();
