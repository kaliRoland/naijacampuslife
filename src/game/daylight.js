// Day and night: the sky, fog and light follow the game clock (and rooms indoors are always lit).
import * as THREE from 'three';

const DAY_SKY = new THREE.Color(0x9fd3f0), NIGHT_SKY = new THREE.Color(0x0a1224), SUNSET = new THREE.Color(0xff9a4d);
const INDOOR = new THREE.Color(0x1d2328);
const tmp = new THREE.Color();

// 0 = dark night, 1 = bright day
export function daylightLevel(minutes) {
  const h = minutes / 60;
  if (h < 5 || h >= 21) return 0.18;
  if (h < 7) return 0.18 + (h - 5) / 2 * 0.82;          // dawn
  if (h < 16.5) return 1;                                // day
  if (h < 19.5) return 1 - (h - 16.5) / 3 * 0.78;        // dusk
  return 0.22 - (h - 19.5) / 1.5 * 0.04;                 // early night
}
const warmth = minutes => Math.max(0, 1 - Math.abs(minutes / 60 - 18.2) / 1.6);   // golden hour around 6 pm

export function applyDaylight(scene, world, minutes, indoors) {
  if (indoors) {
    scene.background = INDOOR; scene.fog = null;
    world.hemi.intensity = 1.5; world.sun.intensity = 0.5; world.sun.color.set(0xfff2cc);
    return;
  }
  const level = daylightLevel(minutes), w = warmth(minutes);
  tmp.copy(NIGHT_SKY).lerp(DAY_SKY, level).lerp(SUNSET, w * 0.5);
  if (!(scene.background instanceof THREE.Color) || scene.background === INDOOR) scene.background = new THREE.Color();
  scene.background.copy(tmp);
  if (!scene.fog) scene.fog = new THREE.Fog(tmp.getHex(), 45, 120);
  scene.fog.color.copy(tmp);
  world.hemi.intensity = 0.55 + 1.15 * level;
  world.sun.intensity = 0.12 + 1.38 * level;
  world.sun.color.set(0xfff2cc).lerp(SUNSET, w * 0.7);
}
