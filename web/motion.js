// Motion helpers: easing, camera key interpolation, idle life, blinks, kicks. All pure functions of the frame.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lin = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const back = (t, s = 1.70158) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s); };
export const spring = (t, k = 9, z = 0.32) => 1 - Math.exp(-z * k * t) * Math.cos(k * t);
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** Catmull-Rom through pts at t in 0..1 (uniform) */
export const catmull = (pts, t) => {
  const n = pts.length - 1, x = clamp(t) * n, i = Math.min(n - 1, Math.floor(x)), u = x - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
};
/** camera keys: [{f, pos, look, fov, roll, ease}] ; glides between consecutive keys with the key's ease */
export const camKeys = (keys, f) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const e = (b.ease || smoother)(lin(a.f, b.f, f));
      return { pos: b.path ? catmull([a.pos, ...b.path, b.pos], e) : lerp3(a.pos, b.pos, e), look: lerp3(a.look, b.look, e), fov: lerp(a.fov, b.fov, e), roll: lerp(a.roll || 0, b.roll || 0, e) };
    }
  }
  return keys[keys.length - 1];
};
/** impact flip-shake: sign flips every frame, decays over n frames */
export const kick = (f, list, n = 7) => {
  let x = 0, y = 0;
  for (const k of list) { const d = f - k.f; if (d >= 0 && d < n) { const a = (k.a ?? 0.06) * (1 - d / n) * (d % 2 ? -1 : 1); x += a; y += a * 0.6; } }
  return [x, y];
};
const hash = (k) => { const x = Math.sin(k * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
/** blink 0..1 (4 frames) at seeded intervals of 15-70 frames */
export const blinkAt = (f, seed) => {
  let t = Math.floor(hash(seed) * 30);
  for (let i = 0; i < 200 && t <= f + 4; i++) {
    const d = f - t;
    if (d >= 0 && d < 4) return d === 0 || d === 3 ? 0.5 : 1;
    t += 15 + Math.floor(hash(seed * 7 + i) * 55);
  }
  return 0;
};
/** breathing / sway for a standing card */
export const idle = (f, seed) => ({ bob: 0.012 * Math.sin(f * 0.19 + seed), tilt: 1.4 * Math.sin(f * 0.071 + seed * 1.3), head: 1.8 * Math.sin(f * 0.053 + seed * 2.1) });
/** quantise for card keys */
export const q = (x, s = 0.02) => Math.round(x / s) * s;
