// Reference-plate world: same world DATA as story.js (village, road, water, clinic),
// but frameState renders the EMPTY sandbar (no actors, no fx) for the world style plate.
// main.js imports { frameState, TOTAL, VILLAGE, ROAD, LANE, CLINIC, SHORT, WATER } from
// "./story.js" — this file is swapped in via an import map in refworld.html. It imports
// NOTHING from story.js (that would be a circular remap); the data below is copied verbatim.
export const FPS = 30, TOTAL = 2666;

// ---------------- world layout (copied from story.js) ----------------
const houses = [];
{
  let s = 5;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rowL = [[-14, 100, 1], [-16, 112, 0], [-13, 124, 2], [-15, 136, 1], [-28, 108, 0], [-30, 122, 2]];
  const rowR = [[14, 102, 0], [16, 114, 2], [13, 126, 1], [15, 138, 0], [28, 110, 1], [30, 124, 0]];
  for (const [x, z, k] of rowL) houses.push([x, z, 5 + r() * 2.5, 4.2 + r() * 1.5, 2.9 + r() * 0.6, Math.PI / 2, k, r() < 0.45]);
  for (const [x, z, k] of rowR) houses.push([x, z, 5 + r() * 2.5, 4.2 + r() * 1.5, 2.9 + r() * 0.6, -Math.PI / 2, k, r() < 0.45]);
}
export const VILLAGE = {
  houses,
  palms: [[-20, 98, 10], [20, 100, 9], [-8, 128, 11], [30, 110, 9.5], [-32, 120, 10], [34, 128, 8.5]],
  trees: [[-10, 96, 2.6, 2.4], [18, 122, 3, 2.8], [-24, 130, 2.8, 2.6]],
  hay: [[-22, 104, 1], [22, 108, 0.9], [-24, 118, 1.1]],
  fields: [[-60, 132, 50, 35, 0, 0.05], [60, 136, 55, 40, 0, -0.04]],
};
export const LANE = [[-18, 112], [0, 110], [18, 114]];
export const ROAD = [[0, 132], [0, 100], [2, 70], [0, 40], [-1, 10], [0, -20], [1, -45]];
export const WATER = [[-400, -55], [-100, -52], [0, -56], [100, -53], [400, -58]];
export const CLINIC = [500, -500, 0.3];
export const MAPCAM = { pos: [0, 220, 60], look: [0, 0, 20], fov: 50 };
export const SHORT = [[0, 30], [4, 10], [0, -10], [2, -30]];
export const SHOTLIST = [];
export const shotAt = () => null;

// Day light preset (copied from story.js LP.day).
const DAY = { az: 112, el: 50, sun: [1.2, 1.12, 0.97], amb: [0.36, 0.37, 0.46], gnd: [0.32, 0.27, 0.2], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.1, lift: [0.02, 0.025, 0.05], gain: [1, 1, 1], card: [1, 1, 1], cloud: [1, 1, 1], disc: 0 };

// Empty sandbar, bare (progress 0 = no forest), ELEVATED camera looking north across
// the bar so the sandbar, horizon and sky read. DOF kept mild (focus 45, cInf 3) so the
// cracked-sand texture stays readable, unlike the video's heavy foreground blur.
// NOTE: the Brahmaputra water ribbon never renders visibly in this kit — its triangles
// wind downward (all 1,336 vertex normals point -y) and the toon material is FrontSide,
// so the river is invisible from above; the tan horizon band is what the video itself
// shows (cf. frames/f0000.jpg, f0500.jpg). The plate therefore shows the kit's real
// look: cracked sand + boulders + tan horizon + blue gradient sky with clouds.
export const frameState = (f) => ({
  shot: "refworld",
  cam: { pos: [0, 22, 62], look: [0, 0, -55], fov: 44 },
  light: DAY,
  actors: [],
  fx: [],
  world: { progress: 0, slab: null, plug: null, short: false },
  flash: 0,
  vign: 0.18,
  dof: { focus: 45, cInf: 3 },
  shadow: { c: [0, 0, 0], r: 60 },
});
