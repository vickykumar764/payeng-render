// Painted canvas textures, flat colour with dark seams (storybook look). All deterministic (seeded).
export const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const tint = (c, k) => { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0"); return `#${f(r)}${f(g)}${f(b)}`; };
export const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")}`; };

/** wrap-around blob: draws at the 9 tiled offsets so the texture tiles seamlessly */
const wrapDraw = (g, W, H, fn) => { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
const blob = (g, x, y, r, rnd, n = 9, sq = 1) => {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r * (0.7 + 0.5 * rnd());
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * sq;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
};

/** granite / sandstone rock: big tone patches, strata, cracks, lichen */
export const rockTex = (seed = 1, S = 1024) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  const tones = ["#a58c72", "#97806a", "#b39a7c", "#8b7462", "#a9917a", "#9c8670"];
  g.fillStyle = "#a28a71"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 150, col = tones[(r() * tones.length) | 0];
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 10, 0.55); g.fillStyle = col; g.fill(); });
  }
  // darker lower-edge seams of the patches (flat-with-dark-seams)
  g.globalAlpha = 0.55;
  for (let i = 0; i < 26; i++) {
    const y = r() * S, x0 = r() * S, len = 120 + r() * 360;
    wrapDraw(g, S, S, () => {
      g.beginPath(); g.moveTo(x0, y);
      for (let t = 1; t <= 8; t++) g.lineTo(x0 + (len * t) / 8, y + (r() - 0.5) * 22);
      g.strokeStyle = "#5e4c40"; g.lineWidth = 3 + r() * 4; g.lineCap = "round"; g.stroke();
    });
  }
  g.globalAlpha = 1;
  // cracks
  for (let i = 0; i < 34; i++) {
    let x = r() * S, y = r() * S, a = r() * Math.PI * 2;
    const pts = [[x, y]];
    for (let t = 0; t < 7; t++) { a += (r() - 0.5) * 1.2; x += Math.cos(a) * (12 + r() * 26); y += Math.sin(a) * (12 + r() * 26); pts.push([x, y]); }
    wrapDraw(g, S, S, () => {
      g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.strokeStyle = "#3e3029"; g.lineWidth = 2.2 + r() * 2.5; g.lineJoin = "round"; g.stroke();
    });
  }
  // light chips + lichen
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rr = 2 + r() * 7;
    g.fillStyle = r() < 0.7 ? "#c4ad8e" : r() < 0.5 ? "#8f9a62" : "#d1c08a";
    g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
  }
  return c;
};

/** sun-baked dirt with pebbles and foot tracks */
export const dirtTex = (seed = 2, S = 1024, base = "#c79c6a") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 120;
    const col = r() < 0.5 ? tint(base, 0.92 + r() * 0.05) : tint(base, 1.04 + r() * 0.05);
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 9, 0.7); g.fillStyle = col; g.fill(); });
  }
  for (let i = 0; i < 520; i++) {
    const x = r() * S, y = r() * S, rr = 1.5 + r() * 5;
    g.fillStyle = r() < 0.5 ? tint(base, 0.7) : tint(base, 1.18);
    g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 0.5;
  for (let i = 0; i < 30; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI;
    g.strokeStyle = tint(base, 0.78); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke();
  }
  g.globalAlpha = 1;
  return c;
};

/** dry grass / field ground: yellow-green with tufts and dirt patches */
export const grassTex = (seed = 3, S = 1024, base = "#a7a75a") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 80; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 140;
    const col = [tint(base, 0.9), tint(base, 1.07), "#b8a868", "#8f9a4e"][(r() * 4) | 0];
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 10, 0.75); g.fillStyle = col; g.fill(); });
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, h = 8 + r() * 14;
    g.strokeStyle = r() < 0.6 ? tint(base, 0.72) : tint(base, 1.2); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - h); g.stroke();
  }
  return c;
};

/** mud-plaster wall: ochre wash, darker plinth band, cracks, a few handprint daubs */
export const mudTex = (seed = 4, S = 512, base = "#c98f5a") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, rad = 20 + r() * 80;
    const col = r() < 0.5 ? tint(base, 0.94) : tint(base, 1.05);
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 9, 0.8); g.fillStyle = col; g.fill(); });
  }
  for (let i = 0; i < 14; i++) {
    let x = r() * S, y = r() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let t = 0; t < 4; t++) { x += (r() - 0.5) * 30; y += 8 + r() * 18; g.lineTo(x, y); }
    g.strokeStyle = tint(base, 0.6); g.lineWidth = 2; g.stroke();
  }
  return c;
};

/** khapra clay tiles: rows of half-round terracotta tiles */
export const tileTex = (seed = 5, S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = "#8f4a2e"; g.fillRect(0, 0, S, S);
  const rows = 8, cols = 10, rh = S / rows, cw = S / cols;
  for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
    const x = i * cw + (j % 2 ? cw / 2 : 0), y = j * rh, col = ["#b4613d", "#a95a38", "#bd6c45", "#9e5034"][(r() * 4) | 0];
    g.fillStyle = col;
    g.beginPath(); g.ellipse(x, y + rh * 0.55, cw * 0.46, rh * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#5e2c1c"; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y + rh * 0.55, cw * 0.46, rh * 0.62, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  }
  return c;
};

/** thatch: dense straw strokes with darker bands */
export const thatchTex = (seed = 6, S = 512) => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = "#c9a35a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = r() * S, y = r() * S, l = 16 + r() * 30;
    g.strokeStyle = ["#d8b56c", "#b48d48", "#e3c27c", "#9f7a3c"][(r() * 4) | 0]; g.lineWidth = 2 + r() * 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke();
  }
  for (let j = 0; j < 6; j++) { g.fillStyle = "rgba(90,60,30,0.25)"; g.fillRect(0, j * (S / 6) + S / 12, S, 6); }
  return c;
};

/** wood planks */
export const woodTex = (seed = 7, S = 512, base = "#9a6a40") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  const n = 6, w = S / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = tint(base, 0.9 + r() * 0.2); g.fillRect(i * w, 0, w, S);
    for (let k = 0; k < 10; k++) { g.strokeStyle = tint(base, 0.78); g.lineWidth = 2; const x = i * w + r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, S * 0.3, x - 8, S * 0.6, x + 4, S); g.stroke(); }
    g.fillStyle = "#3a2618"; g.fillRect(i * w, 0, 4, S);
  }
  return c;
};

/** foliage: dark-seamed leaf clumps for trees */
export const leafTex = (seed = 8, S = 512, base = "#5f8a3a") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    const x = r() * S, y = r() * S, rad = 16 + r() * 40;
    const col = [tint(base, 0.82), tint(base, 1.12), tint(base, 0.95), tint(base, 1.25)][(r() * 4) | 0];
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 8, 0.8); g.fillStyle = col; g.fill(); g.strokeStyle = tint(base, 0.6); g.lineWidth = 2; g.stroke(); });
  }
  return c;
};

/** plain flat colour texture with faint mottling (cloth, painted surfaces) */
export const flatTex = (seed = 9, S = 256, base = "#e8e0cc") => {
  const c = cv(S, S), g = c.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    const x = r() * S, y = r() * S, rad = 10 + r() * 40;
    wrapDraw(g, S, S, () => { blob(g, x, y, rad, r, 8, 0.8); g.fillStyle = r() < 0.5 ? tint(base, 0.96) : tint(base, 1.03); g.fill(); });
  }
  return c;
};

/** painted clouds billboard (600x300), soft white with a lilac belly */
export const cloudCanvas = (seed = 1) => {
  const c = cv(600, 300), g = c.getContext("2d"), r = rng(seed);
  const blobs = [];
  for (let i = 0; i < 7; i++) blobs.push([110 + i * 60 + (r() - 0.5) * 30, 175 - Math.sin((i / 6) * Math.PI) * (50 + r() * 40), 55 + r() * 45]);
  g.fillStyle = "#e9e3f2";
  for (const [x, y, rad] of blobs) { g.beginPath(); g.ellipse(x, y + 14, rad, rad * 0.8, 0, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.ellipse(300, 222, 250, 40, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff";
  for (const [x, y, rad] of blobs) { g.beginPath(); g.ellipse(x, y, rad * 0.94, rad * 0.74, 0, 0, Math.PI * 2); g.fill(); }
  return c;
};
