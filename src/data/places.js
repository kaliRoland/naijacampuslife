// Places on the in-game map, and where the "go here" guide points. Editable: names, icons, positions.
// Coordinates match the 3D world (x = left/right, z = toward the road is positive).

export const MAP_BOUNDS = { minX: -68, maxX: 68, minZ: -64, maxZ: 38 };

export const PLACES = [
  { id: 'busstop', name: 'Bus stop', icon: '🚌', x: -12, z: 27 },
  { id: 'gate', name: 'Main Gate', icon: '🏛️', x: 0, z: 0 },
  { id: 'kiosk', name: 'Supplies Kiosk', icon: '🛒', x: -14, z: -8, side: 'l' },
  { id: 'registration', name: 'Registration', icon: '📝', x: 17, z: -16.5, side: 'r' },
  { id: 'fountain', name: 'Fountain', icon: '⛲', x: 0, z: -20 },
  { id: 'lecture', name: 'Lecture Theatre', icon: '🎓', x: -22, z: -32, side: 'l' },
  { id: 'admin', name: 'Admin Block', icon: '🏢', x: 22, z: -32 },
  { id: 'library', name: 'Library', icon: '📚', x: 0, z: -58 },
  { id: 'hostel', name: 'Hostel Block A', icon: '🛏️', x: -50, z: -40, side: 'r' },
];

// Where the guide arrow points for each step (the spot you stand to talk to someone)
export const TARGETS = {
  gate: { x: 0, z: -2.5, name: 'Main Gate', place: 'gate' },
  kiosk: { x: -14, z: -4.5, name: 'Supplies Kiosk', place: 'kiosk' },
  registration: { x: 17, z: -15.3, name: 'Registration desk', place: 'registration' },
};

// Flat shapes for drawing the map (same as the ground in the 3D world): x, z, width, depth, colour
export const MAP_GROUND = [
  [0, 30, 240, 10, '#3a3a3a'],          // road
  [0, 22, 240, 5, '#b0a99a'],           // pavement
  [0, 7, 12, 24, '#b0a99a'],            // gate forecourt
  [0, -29, 10, 55, '#c9c1b0'],          // main avenue
  [0, -20, 22, 22, '#d4ccb8'],          // fountain plaza
  [0, -23, 50, 4, '#c9c1b0'],           // cross path
  [-22, -22.5, 5, 7, '#c9c1b0'],        // path to Lecture Theatre
  [22, -22.5, 5, 7, '#c9c1b0'],         // path to Admin Block
];
export const MAP_WALLS = [[-37.4, 0, 60, 1.2], [37.4, 0, 60, 1.2]];   // perimeter wall, gap at the gate
export const MAP_SMALL = [                                          // kiosk, canopy, guard house
  [-14, -8, 5.2, 3.4, '#2e7d9a'], [17, -16.5, 8.4, 6.6, '#0b3d2e'], [11, 4, 4.6, 4.6, '#eeeeee'],
];
