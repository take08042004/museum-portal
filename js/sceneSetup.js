import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { EYE_HEIGHT } from "./config.js";

// ---------------------------------------------------------------------------
// The renderer, camera, scene, and first-person pointer-lock controls. This
// module has no dependency on any other part of the game — everything else
// depends on it.
// ---------------------------------------------------------------------------

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);
controls.object.position.set(0, EYE_HEIGHT, 6);

export const keyState = {};
window.addEventListener("keydown", (e) => {
  keyState[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keyState[e.code] = false;
});

scene.background = new THREE.Color(0x141218);
