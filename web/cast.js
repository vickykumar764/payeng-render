
// ===================== cast for "The Man Who Moved a Mountain" (appended to toonbase.js) =====================
// Rural Bihar 1960-82: dhoti + kurta/vest, gamchha pagri, saris with a head pallu, bare feet, beards that grey.
// Same Pen / bean-head construction as the base; new: lower garments, pagri/pallu, beard, arm-pose library, a
// two-handed sledgehammer in side view, water pot. Design space 600 x 1000 per body, soles at y = 975.

FACE.sad = { eye: ["lid", "lid"], brow: [-4, 4], mouth: "frown" };
FACE.stubborn = { eye: ["lid", "lid"], brow: [6, -2], mouth: "dash" };
FACE.strain = { eye: ["squeeze", "squeeze"], brow: [5, -2], mouth: "teeth" };
FACE.soft = { eye: ["happy", "happy"], brow: [-3, 3], mouth: "smile" };
FACE.squint = { eye: ["slit", "slit"], brow: [3, -1], mouth: "dash" };
FACE.mock = { eye: ["happy", "happy"], brow: [-3, -3], mouth: "smileWide" };
FACE.worried = { eye: ["small", "small"], brow: [-4, 3], mouth: "wave" };
FACE.calm = { eye: ["lid", "lid"], brow: [-1, 1], mouth: "smile" };

const GAM_W = "#f4ead8";
/** red gamchha band with two thin cream stripes (check cloth) */
const checkBand = (p, a, b, w, col) => {
  p.band([a, b], col, w, 0.9 * w / 7);
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  for (const s of [-0.22, 0.22]) p.stroke([[a[0] + nx * w * s, a[1] + ny * w * s], [b[0] + nx * w * s, b[1] + ny * w * s]], w * 0.09, GAM_W);
};

/** pagri: wrapped cloth on the crown, two wrap lines, small knot tail on one side */
const pagriOn = (p, o, hp, H, cx, hc, light, side, facing) => {
  const HH = 2 * H.b, u = (2 * H.a) / 100, crown = hc - H.b, cut = crown + 0.36 * HH, ow = 0.85 * 5 * u;
  const keep = (x, y) => y < cut;
  const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.1, hc + (y - hc) * 1.1 - 6 * u]);
  if (arc.length < 3) return;
  const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
  for (let i = 1; i < 8; i++) arc.push([x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8 + 3 * u * Math.sin((i / 8) * Math.PI)]);
  const col = o.pagri;
  p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
  // wrap folds
  for (const k of [0.32, 0.62]) {
    const y = crown + k * 0.36 * HH * 1.05 - 6 * u, w = H.a * (0.8 + 0.25 * k);
    p.arc(cx + (side ? 4 * u : 0), y + 10 * u, w, 12 * u, 195, 345, 2.4 * u, shade(col, 0.62));
    p.arc(cx + (side ? 4 * u : 0), y + 7 * u, w * 0.95, 11 * u, 200, 340, 1.4 * u, GAM_W);
  }
  p.poly(arc, null, ow);
  // knot + tail
  const s = side ? -1 : (facing || 1) * -1;
  const kx = cx + s * H.a * 0.98, ky = cut - 14 * u;
  p.ell(kx, ky, 10 * u, 8 * u, shade(col, 0.9), ow * 0.8);
  p.poly([[kx + s * 4 * u, ky + 4 * u], [kx + s * 22 * u, ky + 30 * u], [kx + s * 8 * u, ky + 34 * u]], shade(col, 0.85), ow * 0.7);
};

/** pallu: the sari end over the head (drawn behind the head) + its border over the crown (drawn after the head) */
const palluBehind = (p, o, H, cx, hc, light, thick, ow, side) => {
  const bb = side ? blobPts(cx - 14 * (H.a / 50), hc + 0.06 * 2 * H.b, { ...H, a: H.a * 1.1, b: H.b * 1.16, asym: 0, egg: 0.2, seed: H.seed + 3 })
    : blobPts(cx, hc + 0.1 * 2 * H.b, { ...H, a: H.a * 1.18, b: H.b * 1.26, asym: 0, egg: 0.25, seed: H.seed + 3 });
  p.shadedFill(bb, o.sari, mul(o.sari, SH_CLOTH), light, H.a * 1.2);
  p.inkRing(bb, ow * 0.85, thick);
};
const palluFront = (p, o, hp, H, cx, hc, light, side) => {
  const HH = 2 * H.b, u = (2 * H.a) / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  // hair parting under the cloth
  p.clip(hp, () => {
    p.ell(cx + (side ? 8 * u : 0), crown + 0.1 * HH, H.a * 0.9, 0.2 * HH, o.hairCol || "#241a18", 0);
    if (!side) p.stroke([[cx, crown + 0.04 * HH], [cx, crown + 0.2 * HH]], 3.2 * u, "#d0302c");
  });
  const cut = crown + 0.14 * HH;
  const keep = (x, y) => y < cut;
  const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * 1.12, hc + (y - hc) * 1.12]);
  if (arc.length > 2) {
    p.shadedFill(arc, o.sari, mul(o.sari, SH_CLOTH), light, H.a);
    p.poly(arc, null, ow);
    p.arc(cx + (side ? 6 * u : 0), cut + 2 * u, H.a * 1.0, 9 * u, 190, 350, 5 * u, o.border);
  }
  if (!side) p.dot(cx, hc - 0.36 * H.b, 3.2 * u, "#d0302c"); // bindi
};

/** beard on the lower jaw (below the mouth line), mouth + moustache are drawn over it */
const beardOn = (p, o, hp, H, cx, hc, side, facing) => {
  if (!o.beard) return;
  const u = (2 * H.a) / 100, k = o.beardSize ?? 1;
  p.clip(hp, () => {
    if (side) {
      p.ell(cx + 0.18 * H.a, hc + (0.92 - 0.06 * k) * H.b, 0.86 * H.a, (0.38 + 0.08 * k) * H.b, o.beard, 0);
      p.ell(cx - 0.42 * H.a, hc + 0.3 * H.b, 0.16 * H.a, 0.34 * H.b, o.beard, 0); // sideburn
    } else {
      p.ell(cx + 5 * u * facing, hc + (0.95 - 0.05 * k) * H.b, 0.9 * H.a, (0.4 + 0.1 * k) * H.b, o.beard, 0);
      for (const s of [-1, 1]) p.ell(cx + s * 0.86 * H.a, hc + 0.3 * H.b, 0.16 * H.a, 0.4 * H.b, o.beard, 0); // sideburns
    }
  });
  if (k > 1.2) { // full beard hangs below the jaw
    const by = hc + H.b * 0.88, bx = cx + (side ? 0.3 * H.a : 5 * u * facing), w = side ? 0.5 * H.a : 0.62 * H.a;
    p.ell(bx, by + 4 * u, w * 0.8, 30 * u * (k - 1) + 10 * u, o.beard, 2.6 * u, 0, 180);
  }
};

const potDraw = (p, x, y, r, col = "#b4532f") => { // round clay matka sitting on (x, y) bottom-centre
  p.ell(x, y - r, r, r * 0.92, col, 0.13 * r);
  p.ell(x, y - r * 1.92, r * 0.42, r * 0.16, shade(col, 0.8), 0.1 * r);
  p.arc(x, y - r * 0.95, r * 0.9, r * 0.35, 20, 160, 0.08 * r, shade(col, 0.7));
};

/** sledgehammer: handle from the grip g along angle ang (deg, canvas), head across the far end */
const hammerDraw = (p, g, ang, L, u) => {
  const a = rad(ang), e = [g[0] + Math.cos(a) * L, g[1] + Math.sin(a) * L], b = [g[0] - Math.cos(a) * 14 * u, g[1] - Math.sin(a) * 14 * u];
  p.band([b, e], "#8a5a34", 6 * u, 1.6 * u, "round");
  const hw = 26 * u, hh = 15 * u, c = Math.cos(a), s = Math.sin(a);
  const R = (dx, dy) => [e[0] + dx * c - dy * s, e[1] + dx * s + dy * c];
  p.poly([R(-hh, -hw), R(hh, -hw), R(hh * 0.85, hw), R(-hh * 0.85, hw)], "#6f767e", 2.6 * u);
  p.stroke([R(-hh * 0.6, -hw * 0.7), R(-hh * 0.6, hw * 0.6)], 2.2 * u, "#9aa2aa");
  return e;
};

// ---------------- front view ----------------
export const bodyFrontX = (p, o, opts) => {
  const { expr = "neutral", look = 0, blink = false, light = DEF_LIGHT, facing = 0, seed = 1, mode = "stand",
    tilt = 0, headTilt = 0, armL = "hang", armR = "hang", hammer = null, swirl = -1, bob = 0, pot = false } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const sole = 975;
  const torsoBot = mode === "sit" ? sole - 0.22 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const skinLeg = mix(skin, INK, 0.1), cloth = o.dhoti || o.pants || o.sari;
  const foot = (x, y, side) => { p.ell(x + side * 5 * u, y - 3 * u, 11 * u, 5 * u, o.barefoot ? skin : o.boots || INK, 2.4 * u); };
  p.rot = null;
  // ---- legs / lower garment ----
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h = [300 + side * 15 * u, hipY], k = [300 + side * 46 * u, hipY + 0.12 * HH], f = [300 + side * 20 * u, sole - 8 * u];
      p.line([h, k], cloth, 13 * u);
      p.stroke([k, f], 5.6 * u, skinLeg);
      foot(f[0], f[1] + 4 * u, -side);
    }
    if (o.dhoti) p.ell(300, hipY + 0.03 * HH, 40 * u, 16 * u, o.dhoti, ow * 0.8);
  } else if (o.sari && !o.dhoti) {
    for (const side of [-1, 1]) foot(300 + side * 14 * u, sole - 2 * u, side);
    const D = { a: 0.5 * W * 0.92, b: 0.5 * ((sole - 0.06 * HH) - (chin + 0.2 * HH)), nTop: 2.0, nBot: 3.2, egg: 0.32, asym: 0.02 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.06 * HH - D.b, D);
    p.gradFill(dp, o.sari, mul(o.sari, SH_CLOTH), light);
    p.clip(dp, () => p.band([[150, sole - 0.12 * HH], [450, sole - 0.12 * HH]], o.border, 0.07 * HH, 1.2 * u));
    p.inkRing(dp, ow, thick);
    // pleats
    for (const dx of [-6, 0, 6]) p.stroke([[300 + dx * u, hipY + 0.2 * HH], [300 + dx * 1.6 * u, sole - 0.12 * HH]], 1.6 * u, mul(o.sari, [0.7, 0.7, 0.75]));
  } else {
    const hem = hipY + (o.shorts ? 0.3 : 0.7) * (sole - hipY);
    for (const side of [-1, 1]) {
      const fx = 300 + side * 20 * u, fy = sole - 4 * u;
      p.stroke([[300 + side * 15 * u, hem - 10 * u], [fx, fy]], 5.6 * u, skinLeg);
      foot(fx, fy + 3 * u, side);
    }
    const lowCol = o.dhoti || o.shorts;
    if (lowCol) {
      const pts = [[300 - 34 * u, hipY - 0.05 * HH], [300 + 34 * u, hipY - 0.05 * HH], [300 + 44 * u, hem], [300 + 10 * u, hem + 6 * u], [300, hem - 14 * u], [300 - 10 * u, hem + 6 * u], [300 - 44 * u, hem]];
      p.gradFill(pts, lowCol, mul(lowCol, SH_CLOTH), light);
      p.poly(pts, null, ow * 0.85);
      p.stroke([[300 + 4 * u, hipY + 0.05 * HH], [300 + 2 * u, hem - 16 * u]], 1.8 * u, mul(lowCol, [0.7, 0.7, 0.75]));
      if (o.dhoti) p.stroke([[300 - 22 * u, hipY + 0.2 * HH], [300 - 28 * u, hem - 4 * u]], 1.4 * u, mul(lowCol, [0.75, 0.75, 0.8]));
    }
  }
  // ---- upper body ----
  p.rot = tilt ? [rad(tilt), 300, hipY] : null;
  const long = o.kurta ? 0.22 * HH : 0;
  const T = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot + long - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot + long - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side) => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const pose = (name, side) => {
    const S = sh(side), X = (k) => tcx + side * k;
    switch (name) {
      case "hip": return { pts: [S, [X(1.25 * T.a + 12 * u), S[1] + 0.34 * HH], [X(0.92 * T.a), torsoBot - 0.28 * HH]], front: true };
      case "belly": return { pts: [S, [X(1.12 * T.a + 6 * u), S[1] + 0.42 * HH], [X(0.22 * T.a), torsoBot - 0.36 * HH]], front: true };
      case "point": return { pts: [S, [X(1.15 * T.a + 24 * u), S[1] - 0.04 * HH], [X(1.15 * T.a + 56 * u), S[1] - 0.16 * HH]], front: false, finger: true };
      case "temple": return { pts: [S, [X(1.3 * T.a + 16 * u), S[1] + 0.02 * HH], [300 + side * (H.a + 2 * u), hc - 0.08 * HH]], front: true, finger: true };
      case "up": return { pts: [S, [X(1.1 * T.a + 12 * u), S[1] - 0.3 * HH], [X(1.02 * T.a + 18 * u), S[1] - 0.76 * HH]], front: false };
      case "pot": return { pts: [S, [X(1.3 * T.a + 18 * u), S[1] - 0.3 * HH], [300 + side * 0.34 * HH, crown - 0.3 * HH]], front: false, late: true };
      case "shoulder": return { pts: [S, [X(1.22 * T.a + 12 * u), S[1] + 0.34 * HH], [X(0.8 * T.a), S[1] + 0.02 * HH]], front: true };
      case "chin": return { pts: [S, [X(1.15 * T.a + 6 * u), S[1] + 0.36 * HH], [300 + side * 0.35 * H.a, chin + 0.02 * HH]], front: true };
      case "knee": return { pts: [S, [X(1.1 * T.a + 8 * u), S[1] + 0.34 * HH], [X(1.3 * T.a + 10 * u), torsoBot + 0.02 * HH]], front: false };
      default: { // hang
        const ex = tcx + side * (1.12 * T.a + 4 * u);
        return { pts: [S, [ex, S[1] + 0.48 * HH], [ex + side * 3 * u, chin + 1.04 * HH]], front: false };
      }
    }
  };
  const arms = [pose(armL, -1), pose(armR, 1)];
  const armCol = o.sleeve === false ? skin : mix(o.top, INK, 0.38);
  const drawArm = (a) => {
    p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol);
    if (o.sleeve === false || o.short) p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]).slice(4), 5.2 * u, skin);
    p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u, INK);
    p.dot(a.pts[2][0], a.pts[2][1], 3.6 * u, skin);
    if (a.finger) { const [hx, hy] = a.pts[2], [ex, ey] = a.pts[1], d = Math.hypot(hx - ex, hy - ey) || 1; p.stroke([[hx, hy], [hx + ((hx - ex) / d) * 13 * u, hy + ((hy - ey) / d) * 13 * u]], 3 * u, INK); }
  };
  for (const a of arms) if (!a.front && !a.late) drawArm(a);
  p.gradFill(tp, o.top, mul(o.top, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.kurta) { p.stroke([[tcx + 2 * u * facing, chin + 0.04 * HH], [tcx + 2 * u * facing, chin + 0.38 * HH]], 1.8 * u, mul(o.top, [0.7, 0.7, 0.75])); for (let i = 0; i < 3; i++) p.dot(tcx + 2 * u * facing, chin + 0.12 * HH + i * 0.09 * HH, 1.8 * u, shade(o.top, 0.6)); }
    if (o.sari) { // blouse + pallu across the chest from the right hip over the left shoulder
      p.band([[tcx + 1.1 * T.a, torsoBot - 0.1 * HH], [tcx - 0.9 * T.a, chin - 0.02 * HH]], o.sari, 0.42 * HH, 1.6 * u);
      p.band([[tcx + 1.1 * T.a + 0.21 * HH * 0.6, torsoBot - 0.1 * HH + 0.21 * HH * 0.8], [tcx - 0.9 * T.a + 0.21 * HH * 0.6, chin - 0.02 * HH + 0.21 * HH * 0.8]], o.border, 0.05 * HH, 1 * u);
    }
    if (o.gamchha) checkBand(p, [tcx - 0.62 * T.a, chin - 0.04 * HH], [tcx - 0.42 * T.a, torsoBot + long - 0.04 * HH], 0.17 * HH, o.gamchha);
  });
  p.inkRing(tp, ow, thick);
  if (o.gamchha) p.poly([[tcx - 0.62 * T.a - 0.09 * HH, chin - 0.06 * HH], [tcx - 0.62 * T.a + 0.09 * HH, chin - 0.06 * HH], [tcx - 0.62 * T.a + 0.06 * HH, chin + 0.06 * HH], [tcx - 0.62 * T.a - 0.1 * HH, chin + 0.05 * HH]], o.gamchha, 1.4 * u);
  for (const a of arms) if (a.front) drawArm(a);
  // props in the right hand
  if (armR === "shoulder" && hammer === "shoulder") {
    const [hx, hy] = arms[1].pts[2];
    hammerDraw(p, [hx, hy], -78, 0.9 * HH, u);
    p.dot(hx, hy, 5.5 * u, INK); p.dot(hx, hy, 3.6 * u, skin);
  }
  // ---- head ----
  const Ah = tilt + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(tilt), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  if (o.sari) palluBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (o.hairWhite) p.clip(hp, () => { for (const s of [-1, 1]) p.ell(300 + s * 0.9 * H.a, hc - 0.1 * H.b, 0.22 * H.a, 0.4 * H.b, o.hairWhite, 0); });
  if (o.hair) { p.clip(hp, () => p.ell(300, crown + 0.1 * HH, H.a * 1.08, 0.3 * HH, o.hair, 0)); p.arc(300, crown + 0.1 * HH, H.a * 1.0, 0.3 * HH, 20, 160, 2 * u, mix(o.hair, INK, 0.5)); }
  beardOn(p, o, hp, H, 300, hc, false, facing);
  faceFront(p, 300, hc, W, expr, facing, look, lid, false, skin, o.moustache, false);
  if (o.pagri) pagriOn(p, o, hp, H, 300, hc, light, false, facing);
  if (o.sari) palluFront(p, o, hp, H, 300, hc, light, false);
  if (pot) potDraw(p, 300 + 6 * u, crown + 0.06 * HH, 0.36 * HH);
  p.rot = tilt ? [rad(tilt), 300, hipY] : null;
  for (const a of arms) if (a.late) drawArm(a);
  // madman swirl next to the temple finger
  if (swirl >= 0 && armR === "temple") {
    const [hx, hy] = arms[1].pts[2], s = [];
    for (let t = 0; t < 26; t++) { const a = t * 0.55 + swirl * Math.PI * 2, r = (4 + t * 0.9) * u; s.push([hx + 22 * u + Math.cos(a) * r, hy - 30 * u + Math.sin(a) * r * 0.8]); }
    p.stroke(s, 2.6 * u, INK);
  }
  p.rot = null;
};

// ---------------- side view (facing screen-right) ----------------
/** modes: walk (planted feet, cycloid swing), stand, hammer (two-handed sledge: k 0 raised .. 1 struck), fallen */
export const bodySideX = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "walk", blink = false, k = 0, stride = 1, light = DEF_LIGHT, seed = 1, lean0 = 0, pot = false, look = 0.6 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const legs = [];
  let hipY = ankY - legLen * 0.995, lean = lean0, nearFwd = 0;
  if (mode === "walk") {
    const S = 370 * stride * 0.85, liftH = 26;
    const st = (ph) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5;
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.03 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]]) legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(30 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean += 3 + 2 * Math.cos(2 * two * phase);
    nearFwd = nL.x / (S / 2);
  } else if (mode === "hammer") {
    hipY = ankY - 0.9 * legLen;
    legs.push({ ank: [300 - 0.42 * legLen, ankY], pitch: 0, near: false }, { ank: [300 + 0.36 * legLen, ankY], pitch: 0, near: true });
    lean += -6 + 22 * k;
  } else {
    legs.push({ ank: [300 - 6 * u, ankY], pitch: 0, near: false }, { ank: [300 + 6 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip = [300, hipY];
  p.rot = null;
  const skinLeg = mix(skin, INK, 0.1), skinFar = mix(skin, INK, 0.3);
  const knees = legs.map((L) => ik(hip, L.ank, l1, l2));
  const footS = (L, near) => {
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    const a = [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], b = [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u];
    p.stroke([a, b], 7.5 * u + 3, INK); p.stroke([a, b], 7.5 * u, near ? skin : skinFar);
  };
  if (o.sari && !o.dhoti) {
    legs.forEach((L) => footS(L, L.near));
    const xs = legs.map((L) => L.ank[0]), front = Math.max(300 + 30 * u, Math.max(...xs) + 4 * u), back = Math.min(300 - 30 * u, Math.min(...xs) - 4 * u);
    const pts = [[300 - 26 * u, hipY - 0.12 * HH], [300 + 28 * u, hipY - 0.12 * HH], [front + 4 * u, ankY - 10 * u], [back - 4 * u, ankY - 10 * u]];
    p.gradFill(pts, o.sari, mul(o.sari, SH_CLOTH), light);
    p.clip(pts, () => p.band([[back - 20 * u, ankY - 18 * u], [front + 20 * u, ankY - 18 * u]], o.border, 0.06 * HH, 1 * u));
    p.poly(pts, null, ow * 0.85);
    p.stroke([[300 + 4 * u, hipY], [(front + back) / 2 + 6 * u, ankY - 14 * u]], 1.6 * u, mul(o.sari, [0.7, 0.7, 0.75]));
  } else {
    legs.forEach((L, i) => {
      const kn = knees[i], hp0 = [300 + (L.near ? 0 : -5 * u), hipY];
      p.stroke([kn, L.ank], 5.4 * u, L.near ? skinLeg : skinFar);
      if (o.dhoti) p.line([hp0, kn, lerp2(kn, L.ank, 0.18)], L.near ? o.dhoti : mul(o.dhoti, [0.8, 0.8, 0.86]), 13 * u);
      else p.stroke([hp0, kn], 5.8 * u, mix(o.pants || "#555", INK, 0.5));
      footS(L, L.near);
    });
    if (o.dhoti) p.poly([[300 + 6 * u, hipY - 0.04 * HH], [300 + 20 * u, hipY - 0.02 * HH], [300 + 16 * u, hipY + 0.42 * HH], [300 + 4 * u, hipY + 0.4 * HH]], mul(o.dhoti, [0.92, 0.92, 0.95]), 1.8 * u);
  }
  // ---- upper body ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const long = o.kurta ? 0.2 * HH : 0;
  const T = { a: 0.31 * W, b: 0.5 * (torsoBot + long - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot + long - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.top, INK, 0.38), farArm = mix(o.top, INK, 0.6);
  const S = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang) => {
    const e = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const hand = (q, col) => { p.dot(q[0], q[1], 5.5 * u, INK); p.dot(q[0], q[1], 3.6 * u, col); };
  let near = null, far = null, grip = null, hAng = 0;
  if (mode === "hammer") {
    // grip arcs from above/behind the head (k 0) to in front of the chest (k 1); the handle swings with it
    const kk = clamp(k, 0, 1), a0 = rad(-120), a1 = rad(28), ga = a0 + (a1 - a0) * kk;
    const R0 = 0.62 * HH;
    grip = [S[0] + 0.12 * HH + Math.cos(ga) * R0, S[1] - 0.05 * HH + Math.sin(ga) * R0];
    hAng = -128 + 160 * kk;
    const el = (dx, dy) => [(S[0] + grip[0]) / 2 + dx * u, (S[1] + grip[1]) / 2 + dy * u];
    far = [S, el(-10, 14), [grip[0] - 4 * u, grip[1] + 6 * u]];
    near = [S, el(10, 16), grip];
  } else if (pot) {
    far = [S, [S[0] - 22 * u, S[1] - 0.32 * HH], [300 - 30 * u, crown - 0.08 * HH]];
    near = swingArm(rad(-25) * nearFwd);
  } else {
    near = swingArm(rad(-28) * nearFwd);
    far = mode === "walk" ? swingArm(rad(28) * nearFwd) : null;
  }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); hand(far[2], skinFar); }
  if (mode === "hammer" && k < 0.5) hammerDraw(p, grip, hAng, 0.95 * HH, u); // raised: behind the body
  p.gradFill(tp, o.top, mul(o.top, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.sari) p.band([[tcx + 0.8 * T.a, torsoBot - 0.05 * HH], [tcx - 0.6 * T.a, chin - 0.05 * HH]], o.sari, 0.4 * HH, 1.4 * u);
    if (o.gamchha) checkBand(p, [tcx + 0.4 * T.a, chin - 0.04 * HH], [tcx + 0.55 * T.a, torsoBot + long - 0.06 * HH], 0.15 * HH, o.gamchha);
  });
  p.inkRing(tp, ow, thick);
  if (mode === "hammer" && k >= 0.5) hammerDraw(p, grip, hAng, 0.95 * HH, u);
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); hand(near[2], skin);
  // ---- head ----
  const hx = 300 + 4 * u;
  if (o.sari) palluBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (o.hairWhite) p.clip(hp, () => p.ell(hx - 0.75 * H.a, hc - 0.05 * H.b, 0.3 * H.a, 0.45 * H.b, o.hairWhite, 0));
  if (o.hair) p.clip(hp, () => p.ell(hx - 10 * u, crown + 0.12 * HH, H.a * 1.1, 0.32 * HH, o.hair, 0));
  beardOn(p, o, hp, H, hx, hc, true, 1);
  faceSide(p, hx, hc, W, expr, lid, false, skin, o.moustache, false);
  if (o.pagri) pagriOn(p, o, hp, H, hx, hc, light, true, 1);
  if (o.sari) palluFront(p, o, hp, H, hx, hc, light, true);
  if (pot) { potDraw(p, hx + 4 * u, crown + 0.05 * HH, 0.34 * HH); hand(far[2], skinFar); }
  p.rot = null;
  return { grip, hammerHead: mode === "hammer" ? [grip[0] + Math.cos(rad(hAng)) * 0.95 * HH, grip[1] + Math.sin(rad(hAng)) * 0.95 * HH] : null };
};

// ---------------- props / fx ----------------
/** clay pot shards on a 400 x 200 canvas */
export const fxShards = (p, seed = 1) => {
  const col = "#b4532f";
  const r = (k) => rnd(seed, k);
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 55 + r(i) * 20, y = 140 + r(i + 9) * 30, s = 22 + r(i + 3) * 20, a = r(i + 5) * 6;
    const pts = [[0, -s], [s * 0.9, -s * 0.2], [s * 0.4, s * 0.7], [-s * 0.7, s * 0.4]].map(([px, py]) => [x + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py * Math.cos(a)]);
    p.poly(pts, i % 2 ? col : shade(col, 0.8), 6);
  }
  p.ell(200, 175, 150, 18, "rgba(80,140,200,0.55)", 0); // spilt water
};
export const fxPot = (p) => potDraw(p, 150, 280, 110);
export const fxHammerProp = (p) => hammerDraw(p, [60, 150], -8, 330, 3.2);
/** small debris chips flying from a hit, on a 400 x 400 canvas; t 0..1 */
export const fxChips = (p, t, seed = 1) => {
  for (let i = 0; i < 9; i++) {
    const a = rad(-170 + 160 * rnd(seed, i)), v = 120 + 160 * rnd(seed, i + 20), x = 200 + Math.cos(a) * v * t, y = 220 + Math.sin(a) * v * t + 300 * t * t, s = 9 + 9 * rnd(seed, i + 40);
    p.poly([[x - s, y], [x, y - s * 0.8], [x + s, y + s * 0.2], [x - s * 0.2, y + s]], i % 2 ? "#a58c72" : "#7d6957", 4);
  }
};
/** lantern glow dot for the clinic (soft) on 256 x 256 */
export const fxGlow = (p) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,240,190,1)"); gr.addColorStop(0.25, "rgba(255,200,110,0.8)"); gr.addColorStop(1, "rgba(255,160,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
/** flying bird (V stroke) on a 200 x 100 canvas, flap 0..1 */
export const fxBird = (p, flap) => {
  const y = 50 + 18 * Math.sin(flap * Math.PI * 2);
  p.stroke([[20, y], [70, 52], [100, 64], [130, 52], [180, y]], 9, "#2a2230");
};
/** smoke puff column (chulha) on a 300 x 600 canvas, t phase */
export const fxSmoke = (p, t) => {
  for (let i = 0; i < 5; i++) {
    const s = ((t + i / 5) % 1), y = 560 - s * 520, x = 150 + Math.sin(s * 5 + i) * 30 * s, r = 26 + 60 * s;
    p.ell(x, y, r, r * 0.85, `rgba(232,228,236,${(0.75 * (1 - s)).toFixed(3)})`, 0);
  }
};
