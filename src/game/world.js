import * as THREE from 'three';
import { makeDanfo } from './models.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const box = (w, h, d, c, x, y, z, parent) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y + h / 2, z); parent.add(m); return m;
};

// Grey-box main gate area. Campus is north (negative z); the road is south (positive z).
export function buildWorld(scene) {
  scene.background = new THREE.Color(0x9fd3f0);
  scene.fog = new THREE.Fog(0x9fd3f0, 40, 110);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556b55, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.2); sun.position.set(30, 50, 20); scene.add(sun);

  const g = new THREE.Group(); scene.add(g);
  box(200, 0.2, 200, 0x6aa84f, 0, -0.2, 0, g);                // grass
  box(200, 0.2, 10, 0x3a3a3a, 0, -0.1, 30, g);                // road
  box(200, 0.2, 5, 0xb0a99a, 0, -0.1, 22, g);                 // pavement
  box(10, 0.2, 40, 0xb0a99a, 0, -0.1, -18, g);                // path into campus
  for (let x = -90; x < 90; x += 12) box(5, 0.05, 0.4, 0xffffff, x, 0.02, 30, g); // road markings

  // Gate: pillars, beam, sign, walls, guard house
  box(2, 7, 2, 0x8b1e1e, -6, 0, 0, g); box(2, 7, 2, 0x8b1e1e, 6, 0, 0, g);
  box(14, 1.5, 1.5, 0x8b1e1e, 0, 7, 0, g);
  box(9, 1.2, 0.3, 0xf2c94c, 0, 7.15, 0.9, g);                // sign board
  box(34, 3, 1, 0xd8d2c4, -24, 0, 0, g); box(34, 3, 1, 0xd8d2c4, 24, 0, 0, g); // perimeter walls
  box(3.5, 3.2, 3.5, 0xeeeeee, 9.5, 0, 4, g);                 // guard house
  box(3.8, 0.4, 3.8, 0x555555, 9.5, 3.2, 4, g);

  // Campus blocks beyond the gate
  box(22, 9, 12, 0xc9c1b0, -22, 0, -30, g);
  box(22, 12, 12, 0xbdb5a2, 22, 0, -34, g);
  box(14, 6, 10, 0xd8d2c4, 0, 0, -42, g);
  for (const [x, z] of [[-14, 12], [16, 14], [-30, 14], [28, -8], [-12, -14]]) {   // trees
    box(0.8, 3, 0.8, 0x6b4a2b, x, 0, z, g); box(3.5, 3.5, 3.5, 0x2e7d32, x, 3, z, g);
  }

  const bus = makeDanfo();
  scene.add(bus);
  bus.position.set(-90, 0, 27);

  return { bus };
}
