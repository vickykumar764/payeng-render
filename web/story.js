// Staging for "Jadav Payeng — The Forest Man of India": every value is a pure function of the frame number.
// Frame ranges are REAL, derived from timing.py on the AI Studio voiceover (88.88 s = 2666 frames).
// world.progress p = FOREST GROWTH (0 = bare sand, 1 = dense Molai forest).
import { clamp, lin, smooth, smoother, easeOut, easeIn, easeInOut, back, spring, lerp, lerp3, add3, catmull, camKeys, kick, blinkAt, idle, q } from "./motion.js";
import { groundAt } from "./terrain.js";
import { JADHAV_Y, JADHAV_M, JADHAV_O, OFFICIAL, VIL_1, VIL_2, VIL_3, VIL_4, VIL_5, KID } from "./castdefs.js";

export const FPS = 30, TOTAL = 2666;

// ---------------- world layout ----------------
// Brahmaputra sandbar: river to the north (z ~ -55), village to the south (z 95-140),
// planting clearing at the centre (0, 28), forest grows over x -130..130, z -25..85.
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
export const CLINIC = [500, -500, 0.3]; // unused in this story: parked far out of frame
export const MAPCAM = { pos: [0, 220, 60], look: [0, 0, 20], fov: 50 };
export const SHORT = [[0, 30], [4, 10], [0, -10], [2, -30]];

// ---------------- light presets ----------------
const LP = {
  day: { az: 112, el: 50, sun: [1.2, 1.12, 0.97], amb: [0.36, 0.37, 0.46], gnd: [0.32, 0.27, 0.2], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.1, lift: [0.02, 0.025, 0.05], gain: [1, 1, 1], card: [1, 1, 1], cloud: [1, 1, 1], disc: 0 },
  morning: { az: 28, el: 20, sun: [1.38, 1.04, 0.74], amb: [0.34, 0.34, 0.47], gnd: [0.3, 0.24, 0.19], top: "#4f8ad8", mid: "#a6c3e4", hor: "#f0dcbc", fog: [110, 1200], sat: 1.12, lift: [0.025, 0.02, 0.05], gain: [1.02, 1, 0.97], card: [1.03, 0.98, 0.93], cloud: [1, 0.93, 0.86], disc: 0.003 },
  golden: { az: 168, el: 10, sun: [1.62, 0.98, 0.52], amb: [0.31, 0.28, 0.48], gnd: [0.27, 0.21, 0.19], top: "#6d7cc4", mid: "#e6a98e", hor: "#ffcf8e", fog: [90, 1100], sat: 1.14, lift: [0.03, 0.02, 0.06], gain: [1.04, 0.99, 0.94], card: [1.06, 0.94, 0.82], cloud: [1, 0.84, 0.72], disc: 0.004 },
  night: { az: 135, el: 42, sun: [0.34, 0.44, 0.72], amb: [0.15, 0.19, 0.34], gnd: [0.08, 0.09, 0.15], top: "#0d1838", mid: "#1f3058", hor: "#34496f", fog: [80, 900], sat: 0.82, lift: [0.01, 0.02, 0.05], gain: [0.95, 1, 1.08], card: [0.56, 0.63, 0.88], cloud: [0.32, 0.4, 0.58], disc: 0 },
};
const hexMix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0"); return `#${ch(16)}${ch(8)}${ch(0)}`; };
const blendL = (a, b, t) => {
  const o = {};
  for (const k of Object.keys(a)) {
    const x = a[k], y = b[k];
    o[k] = typeof x === "string" ? hexMix(x, y, t) : Array.isArray(x) ? x.map((v, i) => lerp(v, y[i], t)) : lerp(x, y, t);
  }
  let d = b.az - a.az; if (d > 180) d -= 360; if (d < -180) d += 360; o.az = a.az + d * t;
  return o;
};
/** piecewise light: [[f, preset], ...] with smooth blends */
const lightSeq = (seq, f) => {
  if (f <= seq[0][0]) return LP[seq[0][1]];
  for (let i = 0; i < seq.length - 1; i++) if (f <= seq[i + 1][0]) return blendL(LP[seq[i][1]], LP[seq[i + 1][1]], smooth(lin(seq[i][0], seq[i + 1][0], f)));
  return LP[seq[seq.length - 1][1]];
};

// ---------------- helpers ----------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(...sub(a, b));
const camRight = (c) => norm(cross(sub(c.look, c.pos), [0, 1, 0]));
const camUp = (c) => norm(cross(camRight(c), sub(c.look, c.pos)));
const lightAng = (c, L, mirror = 1) => {
  const d = [Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180), Math.sin(L.el * Math.PI / 180), Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)];
  const r = camRight(c), u = camUp(c);
  const sx = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) * mirror, sy = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
  return q(Math.atan2(-Math.max(0.25, sy), sx), 0.35);
};
const mirrorOf = (c, dir) => { const r = camRight(c); return dir[0] * r[0] + dir[1] * r[2] < 0 ? -1 : 1; };
const ext = (f, a, b) => f >= a && f < b;
const ht = (x, z, p) => groundAt(x, z, p);
const walkPhase = (d) => q(d / 1.25, 1 / 24);
const birds = (fx, f, f0, span, x0 = -40, y0 = 30, z0 = 60) => {
  for (let i = 0; i < 3; i++) { const t = (f - f0) / span; fx.push({ id: "bird" + i, kind: "bird", pos: [x0 + t * 80 + i * 4, y0 + i * 2.5 + Math.sin(t * 6 + i) * 1.5, z0 - i * 3], size: 1.6, t: q(((f * 0.09 + i * 0.33) % 1), 0.125) }); }
};

// ---------------- shots ----------------
// Shot frame ranges (from timing.py): key words — जंगल f136, उगा f153 | जाधव f348, साँप f441 | मर f630 |
// बीस f697, पौधे f735, रुका f841 | पौधा f939, हरा f1066 | हँसे f1112, उगता f1241 | हरी f1302, पेड़ f1492 |
// हिरण f1598, हाथी f1656, बाघ f1727 | तीस f1790, आदमी f1916 | मोलाई f2152, वन f2170 | तेरह f2199, बड़ा f2366 | वन-मानव f2618
const SHOTS = [];
const shot = (id, a, b, fn) => SHOTS.push({ id, a, b, fn });

// 1 HOOK (0-207): bare sand island, Jadhav stands with a bamboo seedling, low wide slow push-in
shot("hook", 0, 207, (f) => {
  const p = 0, A = [0.5, 0, 28]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 0, pos: add3(A, [3.2, 2.4, 9.2]), look: add3(A, [-0.35, 1.6, -1.0]), fov: 44 },
    { f: 207, pos: add3(A, [2.6, 2.0, 7.6]), look: add3(A, [-0.3, 1.5, -0.8]), fov: 43, ease: (t) => t },
  ], f);
  const L = LP.day, mir = mirrorOf(cam, [0, -1]);
  const id = idle(f, 3);
  const actors = [{ id: "jadhav", kind: "side", wide: true, pull: 0.9, outfit: JADHAV_Y, pos: [A[0], A[2]], dir: [0, -1],
    opts: { mode: "stand", expr: f >= 130 && f < 160 ? "stubborn" : "calm", blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir), lean0: q(id.tilt * 0.6, 0.5) } }];
  const fx = [];
  birds(fx, f, 0, 207);
  return { cam, L, actors, fx, p, world: { sapling: { pos: [1.35, 27.2], scale: 1.1 } }, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.4, 0])), cInf: 12 }, shadow: { c: A, r: 12 } };
});

// 2 SNAKES (208-480): riverbank after the flood; Jadhav walks in, stops, kneels by a dead snake (साँप f441)
shot("snakes", 208, 480, (f) => {
  const p = 0, fs = 430;
  const z = lerp(10, -10, lin(208, fs, f)), A = [1.5, 0, z]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 208, pos: [25, 30, -70], look: [0, 2, -10], fov: 46 },
    { f: 360, pos: [7.5, 3.2, -24], look: [1.2, 1.4, -11], fov: 42, ease: smoother, path: [[16, 12, -48]] },
    { f: 480, pos: [4.6, 1.5, -3.4], look: [1.3, 1.0, -10.6], fov: 40, ease: (t) => smooth(t) },
  ], f);
  const L = LP.day, mir = mirrorOf(cam, [0, -1]);
  let actor;
  if (f < fs) actor = { id: "jadhav", kind: "side", wide: true, outfit: JADHAV_Y, pos: [A[0], A[2]], dir: [0, -1], opts: { mode: "walk", phase: walkPhase(10 - z), expr: "calm", blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir) } };
  else actor = { id: "jadhav", kind: "front", outfit: JADHAV_Y, pos: [A[0], A[2]], opts: { mode: "sit", expr: f >= 441 ? "sad" : "calm", headTilt: f >= 441 ? q(-6, 1) : 0, armR: f >= 441 ? "knee" : "hang", blink: blinkAt(f, 3), seed: 3, light: -2.1 } };
  const fx = [];
  birds(fx, f, 208, 272, -30, 34, -40);
  return { cam, L, actors: [actor], fx, p, world: { snakes: true }, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.2, 0])), cInf: 8 }, shadow: { c: lerp3([2, 0, -30], A, smooth(lin(300, 400, f))), r: lerp(40, 14, smooth(lin(300, 400, f))) } };
});

// 3 HEAT (481-669): harsh sun, lateral glide over the dead snakes, ends on Jadhav's face; he bows his head (मर f630)
shot("heat", 481, 669, (f) => {
  const p = 0, A = [1.5, 0, -10]; A[1] = ht(A[0], A[2], p);
  const lookT = lerp3([4.5, 0.3, -13], add3(A, [0, 1.2, 0]), smooth(lin(560, 640, f)));
  const cam = camKeys([
    { f: 481, pos: [8, 2.2, -4], look: [4.5, 0.3, -13], fov: 40 },
    { f: 669, pos: [-6, 2.0, -6], look: lookT, fov: 38, ease: (t) => smooth(t) },
  ], f);
  const L = { ...LP.day, sun: [1.35, 1.2, 1.0], amb: [0.4, 0.4, 0.48] };
  const mir = mirrorOf(cam, [0, -1]);
  const bowed = f >= 630;
  const actors = [{ id: "jadhav", kind: "front", outfit: JADHAV_Y, pos: [A[0], A[2]],
    opts: { mode: "stand", expr: bowed ? "stubborn" : "sad", headTilt: bowed ? q(-8, 1) : 0, armR: bowed ? "hip" : "hang", armL: "hang", blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir) } }];
  const fx = [];
  birds(fx, f, 481, 188, -20, 36, -30);
  return { cam, L, actors, fx, p, world: { snakes: true }, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.3, 0])), cInf: 9 }, shadow: { c: A, r: 14 } };
});

// 4 PLANT (670-885): kneeling, he presses the first bamboo seedling into the sand (पौधे f735), waters it, stands (रुका f841)
shot("plant", 670, 885, (f) => {
  const p = 0, A = [0, 0, 28]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 670, pos: add3(A, [2.2, 1.4, 4.2]), look: add3(A, [0.3, 0.6, -0.5]), fov: 38 },
    { f: 885, pos: add3(A, [3.4, 2.2, 7.6]), look: add3(A, [0, 1.2, 0]), fov: 40, ease: (t) => smooth(t) },
  ], f);
  const L = LP.morning, mir = mirrorOf(cam, [0, -1]);
  let actor;
  if (f < 850) actor = { id: "jadhav", kind: "front", outfit: JADHAV_Y, pos: [A[0], A[2]],
    opts: { mode: "sit", expr: f >= 735 ? "calm" : "stubborn", headTilt: f >= 735 && f < 800 ? q(-5, 1) : 0, armR: f >= 735 ? "knee" : "hang", armL: "hang", blink: blinkAt(f, 3), seed: 3, light: -2.1 } };
  else actor = { id: "jadhav", kind: "side", wide: true, outfit: JADHAV_Y, pos: [A[0], A[2]], dir: [0, -1],
    opts: { mode: "stand", expr: "stubborn", headTilt: f >= 841 && f < 860 ? q(-6, 1) : 0, blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir) } };
  const fx = [];
  if (ext(f, 735, 756)) fx.push({ id: "dust1", kind: "puff", pos: [0.9, 0.35, 27.2], size: 1.2, t: q((f - 735) / 21, 0.05), alpha: 0.7 });
  if (ext(f, 760, 782)) fx.push({ id: "splash1", kind: "splash", pos: [0.9, 0.25, 27.2], size: 1.0, t: q((f - 760) / 22, 0.05) });
  birds(fx, f, 670, 215, -30, 28, 50);
  const sc = f < 735 ? 0.5 : lerp(0.5, 1.0, lin(735, 800, f));
  return { cam, L, actors: [actor], fx, p, world: { sapling: { pos: [0.9, 27.2], scale: sc } }, kicks: [{ f: 735, a: 0.008 }], dof: { focus: dist(cam.pos, add3(A, [0, 0.8, 0])), cInf: 6 }, shadow: { c: A, r: 10 } };
});

// 5 DAILY (886-1101): timelapse — day/night cycles, one seedling a day, the island slowly greens
shot("daily", 886, 1101, (f) => {
  const p = lin(886, 1101, f) * 0.15, A = [0, 0, 28]; A[1] = ht(A[0], A[2], p);
  const cam = { pos: [-3.4, 2.6, 40.5], look: [0.4, 1.4, 27.5], fov: 42 };
  const L = lightSeq([[886, "day"], [930, "golden"], [955, "night"], [985, "morning"], [1010, "day"], [1040, "golden"], [1065, "night"], [1090, "morning"], [1101, "day"]], f);
  const bend = 8 + 8 * Math.sin((f - 886) * 0.28);
  const actors = [{ id: "jadhav", kind: "side", wide: true, pull: 0.9, outfit: JADHAV_Y, pos: [A[0] + 1.5 * Math.sin((f - 886) * 0.05), A[2]], dir: [0, -1],
    opts: { mode: "stand", expr: "stubborn", blink: blinkAt(f, 3), seed: 3, light: -2.2, lean0: q(bend, 0.5) } }];
  const fx = [];
  const fl = (c) => (f >= c - 2 && f < c + 6 ? [0.5, 1, 0.85, 0.6, 0.38, 0.22, 0.1, 0.04][f - c + 2] : 0);
  return { cam, L, actors, fx, p, flash: Math.max(fl(950), fl(1030)), kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.2, 0])), cInf: 5 }, shadow: { c: A, r: 16 } };
});

// 6 LAUGH (1102-1287): villagers laugh at the village edge (हँसे f1112); one points at the sandbar (उगता f1241)
shot("laugh", 1102, 1287, (f) => {
  const p = 0.15;
  const cam = camKeys([
    { f: 1102, pos: [5.6, 1.72, 100.0], look: [5.0, 1.5, 90.0], fov: 38 },
    { f: 1287, pos: [4.8, 1.62, 99.2], look: [4.8, 1.48, 90.0], fov: 36, ease: (t) => smooth(t) },
  ], f);
  const L = LP.day;
  const laugh = f >= 1112, bounce = (s) => (laugh ? q(4 * Math.sin((f - 1112) * 1.05 + s), 1) : q(idle(f, s).tilt, 0.5));
  const bob = (s) => (laugh ? q(Math.abs(Math.sin((f - 1112) * 0.52 + s)) * -6, 1) : 0);
  const actors = [
    { id: "v1", kind: "front", outfit: VIL_1, pos: [4.0, 91.0], opts: { expr: laugh ? "laugh" : "smile", armL: laugh ? "belly" : "hang", armR: laugh ? "belly" : "hip", blink: blinkAt(f, 7), seed: 7, light: -2.2, tilt: bounce(1), bob: bob(1), look: 0.6 } },
    { id: "v2", kind: "front", outfit: VIL_2, pos: [5.9, 93.2], opts: { expr: laugh ? "laugh" : "squint", armR: laugh ? "belly" : "hang", blink: blinkAt(f, 9), seed: 9, light: -2.2, tilt: bounce(2), bob: bob(2), look: -0.5 } },
    { id: "v3", kind: "front", outfit: VIL_3, pos: [6.6, 89.4], opts: { expr: laugh ? "grin" : "neutral", armL: "hip", armR: f >= 1241 ? "point" : "hang", blink: blinkAt(f, 11), seed: 11, light: -2.2, tilt: bounce(3), bob: bob(3) } },
    { id: "kid", kind: "front", outfit: KID, pos: [4.6, 95.0], opts: { expr: laugh ? "laugh" : "smile", armL: laugh ? "belly" : "hang", armR: laugh ? "point" : "hang", blink: blinkAt(f, 13), seed: 13, light: -2.2, tilt: bounce(4), bob: bob(4) } },
  ];
  // tiny Jadhav planting far behind them on the sandbar
  actors.push({ id: "jadhav", kind: "side", wide: true, outfit: JADHAV_Y, pos: [0, 30], dir: [0, -1], opts: { mode: "stand", expr: "stubborn", seed: 3, light: -2.2, lean0: q(8 + 8 * Math.sin((f - 1102) * 0.28), 0.5) } });
  const fx = [];
  return { cam, L, actors, fx, p, kicks: [], dof: { focus: dist(cam.pos, [5.2, 1.5, 92.6]), cInf: 9 }, shadow: { c: [5, 0, 90], r: 18 } };
});

// 7 GREEN (1288-1530): the sand turns green — grass, bushes, trees; Jadhav runs his hand over the grass (हरी f1302)
shot("green", 1288, 1530, (f) => {
  const p = 0.15 + 0.4 * lin(1288, 1530, f);
  const x = lerp(-4, 4, lin(1288, 1530, f)), A = [x, 0, 35]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 1288, pos: [12, 3, 55], look: [0, 1.5, 34], fov: 42 },
    { f: 1470, pos: [6, 2.4, 44], look: [0, 1.6, 34], fov: 41, ease: smoother },
    { f: 1530, pos: [6, 6, 46], look: [0, 4, 30], fov: 40, ease: (t) => smooth(t) },
  ], f);
  const L = LP.day, mir = mirrorOf(cam, [0, -1]);
  const actors = [{ id: "jadhav", kind: "side", wide: true, pull: 0.9, outfit: JADHAV_M, outfitKey: "m", pos: [A[0], A[2]], dir: [0, -1],
    opts: { mode: "walk", phase: walkPhase(x + 4), expr: f >= 1302 ? "soft" : "calm", armR: f >= 1302 && f < 1420 ? "knee" : "hang", blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir) } }];
  const fx = [];
  birds(fx, f, 1288, 242, -30, 30, 50);
  return { cam, L, actors, fx, p, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.3, 0])), cInf: 6 }, shadow: { c: A, r: 16 } };
});

// 8 ANIMALS (1531-1789): twenty years later — camera tracks the deer herd in (हिरण f1598), pans to the elephant (हाथी f1656), then the tiger peeking from the bushes (बाघ f1727), back to Jadhav
shot("animals", 1531, 1789, (f) => {
  const p = 0.7, A = [-3, 0, 44]; A[1] = ht(A[0], A[2], p);
  const deerLead = () => lerp(-14, 10, lin(1531, 1700, f));
  const elX = lerp(-12, -6, lin(1600, 1789, f));
  const cam = camKeys([
    { f: 1531, pos: [2, 2.4, 52], look: [deerLead(), 1.2, 40], fov: 42 },
    { f: 1600, pos: [1, 2.3, 51], look: [deerLead(), 1.2, 40], fov: 42, ease: smoother },
    { f: 1656, pos: [5, 3.2, 57], look: [elX, 1.5, 46], fov: 41, ease: smoother, path: [[3, 3.5, 54]] },
    { f: 1727, pos: [3, 2.2, 50], look: [8, 1.2, 40], fov: 41, ease: smoother, path: [[2, 2.6, 51]] },
    { f: 1789, pos: [2, 2.4, 52], look: [-3, 1.5, 44], fov: 42, ease: (t) => smooth(t) },
  ], f);
  const L = LP.morning, mir = mirrorOf(cam, [0, -1]);
  const actors = [{ id: "jadhav", kind: "side", wide: true, pull: 0.9, outfit: JADHAV_M, outfitKey: "m", pos: [A[0], A[2]], dir: [0, -1],
    opts: { mode: "stand", expr: f >= 1598 ? "soft" : "calm", blink: blinkAt(f, 3), seed: 3, light: lightAng(cam, L, mir) } }];
  const fx = [];
  for (let i = 0; i < 4; i++) fx.push({ id: "bird" + i, kind: "bird", pos: [-30 + (f - 1531) * 0.35 + i * 3, 26 + i * 2 + Math.sin(f * 0.05 + i) * 1.2, 30 - i * 4], size: 1.4, t: q(((f * 0.08 + i * 0.25) % 1), 0.125) });
  // deer herd runs left->right across the meadow, lead deer tracked by the camera
  const deer = [];
  for (let i = 0; i < 4; i++) {
    const t = lin(1531 + i * 8, 1700, f);
    if (t > 0 && t < 1) deer.push([lerp(-14, 10, t), 39 + (i % 3) * 3, 0]);
  }
  const el = f >= 1600 ? [elX, 46, 0] : null;
  const tiger = f >= 1700 ? [8, 40, 0.5] : null;
  return { cam, L, actors, fx, p, world: { animals: { deer, elephant: el, tiger } }, kicks: [], dof: { focus: dist(cam.pos, cam.look), cInf: 8 }, shadow: { c: [0, 0, 40], r: 30 } };
});

// 9 SECRET (1790-1999): high aerial pull-back over the forest; tiny Jadhav walks alone (आदमी f1916)
shot("secret", 1790, 1999, (f) => {
  const p = 0.85, A = [0, 0, 35]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 1790, pos: [30, 60, 120], look: [0, 0, 30], fov: 50 },
    { f: 1999, pos: [60, 120, 200], look: [0, 0, 30], fov: 50, ease: (t) => t },
  ], f);
  const L = LP.day;
  const actors = [{ id: "jadhav", kind: "side", wide: true, outfit: JADHAV_M, outfitKey: "m", pos: [A[0], A[2]], dir: [0, -1],
    opts: { mode: "walk", phase: walkPhase((f - 1790) * 0.06), expr: f >= 1916 ? "calm" : "stubborn", blink: blinkAt(f, 3), seed: 3, light: -2.4 } }];
  const fx = [];
  for (let i = 0; i < 4; i++) fx.push({ id: "bird" + i, kind: "bird", pos: [-40 + (f - 1790) * 0.4 + i * 3, 40 + i * 2, 20 - i * 4], size: 1.4, t: q(((f * 0.08 + i * 0.25) % 1), 0.125) });
  return { cam, L, actors, fx, p, kicks: [], dof: { focus: 100, cInf: 0 }, shadow: { c: [0, 0, 30], r: 120 } };
});

// 10 NAME (2000-2198): the world finds out — officials meet Jadhav, the "मोलाई वन" board (मोलाई f2152, वन f2170)
shot("name", 2000, 2198, (f) => {
  const p = 0.9, A = [10, 0, 58]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 2000, pos: [20, 12, 80], look: [10, 1.5, 56], fov: 44 },
    { f: 2100, pos: [14, 2.4, 68], look: [11, 1.4, 57], fov: 41, ease: easeInOut, path: [[18, 6, 74]] },
    { f: 2198, pos: [14.5, 2.0, 66], look: [13, 1.2, 56], fov: 40, ease: (t) => smooth(t) },
  ], f);
  const L = LP.day, mir = mirrorOf(cam, [0, -1]);
  const actors = [
    { id: "jadhav", kind: "front", outfit: JADHAV_M, outfitKey: "m", pos: [A[0], A[2]], opts: { mode: "stand", expr: "soft", armR: f >= 2080 ? "shoulder" : "hang", blink: blinkAt(f, 3), seed: 3, light: -2.2 } },
    { id: "off1", kind: "front", outfit: OFFICIAL, pos: [12.6, 58.5], opts: { mode: "stand", expr: "smile", armR: f >= 2080 ? "shoulder" : "hang", blink: blinkAt(f, 15), seed: 15, light: -2.2 } },
    { id: "v4", kind: "front", outfit: VIL_4, pos: [8.2, 60.5], opts: { mode: "stand", expr: "grin", blink: blinkAt(f, 17), seed: 17, light: -2.2 } },
  ];
  const fx = [];
  for (let i = 0; i < 3; i++) fx.push({ id: "bird" + i, kind: "bird", pos: [-20 + (f - 2000) * 0.3 + i * 3, 28 + i * 2, 40 - i * 4], size: 1.4, t: q(((f * 0.08 + i * 0.25) % 1), 0.125) });
  return { cam, L, actors, fx, p, world: { board: { pos: [13.5, 56.5], rot: -0.3 } }, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.4, 0])), cInf: 9 }, shadow: { c: A, r: 18 } };
});

// 11 SCALE (2199-2404): high aerial fly-over of the whole forest; pull up on "बड़ा" (f2366)
shot("scale", 2199, 2404, (f) => {
  const p = 1.0;
  const cam = camKeys([
    { f: 2199, pos: [0, 150, 150], look: [0, 0, 20], fov: 50 },
    { f: 2330, pos: [0, 220, 60], look: [0, 0, 20], fov: 50, ease: easeInOut, path: [[0, 180, 110]] },
    { f: 2404, pos: [40, 260, -20], look: [0, 0, 0], fov: 55, ease: (t) => t },
  ], f);
  const L = LP.day;
  const actors = [{ id: "jadhav", kind: "side", wide: true, outfit: JADHAV_O, outfitKey: "o", pos: [0, 35], dir: [0, -1],
    opts: { mode: "walk", phase: walkPhase((f - 2199) * 0.05), expr: "calm", blink: blinkAt(f, 3), seed: 3, light: -2.4 } }];
  const fx = [];
  for (let i = 0; i < 5; i++) fx.push({ id: "bird" + i, kind: "bird", pos: [-30 + (f - 2199) * 0.5 + i * 2.5, 60 + i * 3, 0 - i * 3], size: 1.3, t: q(((f * 0.09 + i * 0.2) % 1), 0.125) });
  return { cam, L, actors, fx, p, kicks: [], dof: { focus: 200, cInf: 0 }, shadow: { c: [0, 0, 20], r: 260 } };
});

// 12 PAYOFF (2405-2666): golden sunset; old Jadhav in the forest, then pull back to the whole green forest (वन-मानव f2618)
shot("payoff", 2405, 2666, (f) => {
  const p = 1.0, A = [0.2, 0, 30]; A[1] = ht(A[0], A[2], p);
  const cam = camKeys([
    { f: 2405, pos: add3(A, [0.9, 1.6, 5.4]), look: add3(A, [0, 1.5, 0]), fov: 36 },
    { f: 2500, pos: add3(A, [0.65, 1.55, 3.9]), look: add3(A, [0, 1.5, 0]), fov: 35, ease: (t) => smooth(t) },
    { f: 2656, pos: [0.9, 9.0, 94], look: [0.3, 6.6, 30], fov: 40, ease: easeInOut, path: [add3(A, [1.2, 2.6, 14]), [1.1, 6.5, 68]] },
    { f: 2666, pos: [0.92, 9.1, 95.2], look: [0.3, 6.6, 30], fov: 40, ease: (t) => t },
  ], f);
  const L = LP.golden;
  const id = idle(f, 3);
  const actors = [{ id: "jadhav", kind: "front", outfit: JADHAV_O, outfitKey: "o", pos: [A[0], A[2]], opts: { expr: f < 2480 ? "calm" : "soft", armR: "shoulder", blink: blinkAt(f, 3), seed: 3, light: -2.5, tilt: q(id.tilt * 0.6, 0.5), headTilt: q(id.head * 0.6 + (f > 2470 && f < 2500 ? -4 : 0), 1), look: q(f > 2470 && f < 2500 ? -0.5 : 0, 0.5) } }];
  [[VIL_1, 1.0, 44, 7], [KID, -0.6, 49, 13], [VIL_2, 0.8, 54, 9]].forEach(([o, x, z0, seed], i) => {
    const z = z0 + 1.2 * (f - 2405) / 30;
    actors.push({ id: "pw" + i, kind: "side", outfit: o, pos: [x, z], dir: [0, 1], opts: { mode: "walk", phase: walkPhase(z - z0 + i * 0.4), expr: "calm", seed, light: -2.4 } });
  });
  const fx = [];
  for (let i = 0; i < 7; i++) {
    const s = lin(2520 + i * 2, 2666, f);
    if (s > 0) fx.push({ id: "fb" + i, kind: "bird", pos: [(i - 3) * 2.2 + Math.sin(i * 1.7) * 2, 8 + s * 22 + (i % 3) * 1.5, 24 + s * 60], size: 1.5, t: q(((f * 0.1 + i * 0.17) % 1), 0.125) });
  }
  const pull = smoother(lin(2500, 2650, f));
  return { cam, L, actors, fx, p, world: { short: true }, kicks: [], dof: { focus: dist(cam.pos, add3(A, [0, 1.5, 0])), cInf: 12 * (1 - pull) }, shadow: { c: lerp3(A, [0, 0, 36], pull), r: lerp(10, 80, pull) } };
});

export const SHOTLIST = SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b }));
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];

export const frameState = (f) => {
  const s = shotAt(f), r = s.fn(f);
  const cam = { ...r.cam, pos: [...r.cam.pos], look: [...r.cam.look] };
  // creeping push on every frame (no static holds) and impact kicks
  const [kx, ky] = kick(f, r.kicks || []);
  if (kx || ky) {
    const d = dist(cam.pos, cam.look), R = camRight(cam), U = camUp(cam);
    cam.look = add3(cam.look, [R[0] * kx * d + U[0] * ky * d, R[1] * kx * d + U[1] * ky * d, R[2] * kx * d + U[2] * ky * d]);
  }
  const world = { progress: r.p ?? 0, slab: null, plug: null, short: false, ...(r.world || {}) };
  return { shot: s.id, cam, light: r.L, actors: r.actors || [], fx: r.fx || [], world, flash: r.flash || 0, vign: r.vign ?? 0.18, dof: r.dof, shadow: r.shadow };
};
