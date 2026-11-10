// Brahmaputra sandbar world (Jadav Payeng): gentle dunes, river to the north, village to the south.
// Progress p is FOREST GROWTH (0 = bare sand, 1 = dense Molai forest), handled in main.js —
// the terrain itself is static; there is no ridge and no channel to carve.
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (i, j) => { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); };
const vnoise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1; for (let k = 0; k < oct; k++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s / 0.9375; };

export const W0 = 20; // kept for engine compatibility (no channel in this world)
export const crest = (x) => 2.2 + 0.8 * (fbm(x * 0.02 + 3, 1.7, 3) - 0.5);
export const halfW = (x) => 60;
export const ridgeH = (x, z) => {
  // gentle sand dunes
  let h = 0.5 + 1.3 * fbm(x * 0.03 + 1, z * 0.03, 3) + 0.4 * fbm(x * 0.15 + 7, z * 0.15, 2);
  // slight rise toward the village (south, +z)
  h += 1.2 * sstep(80, 140, z);
  // river dip to the north (z < -40): bed drops below the ground plane (hidden; the river is a ribbon)
  h -= 3.0 * sstep(-40, -58, z);
  return Math.max(-2.5, h);
};
export const CH = { half: 3.3, rim: 1.4 };
export const chanEnd = (p) => 0;
export const floorH = (z) => 0.2;
/** no channel in the sandbar world */
export const chan = (x, z, p) => 0;
export const terrainH = (x, z, p, base) => (base ?? ridgeH(x, z)) - 0.35;
export const groundAt = (x, z, p) => Math.max(0, terrainH(x, z, p));
