// Engine: toon world + ink + grade + lens blur, canvas-drawn character cards. Exposes window.renderFrame(f).
import * as THREE from "three";
import * as T from "./toon.js";
import * as P from "./paint.js";
import { ridgeH, terrainH, groundAt, chanEnd, W0, CH, fbm } from "./terrain.js";
import { frameState, TOTAL, VILLAGE, ROAD, LANE, CLINIC, SHORT, WATER } from "./story.js";

const W = 1080, H = 1920, PX = W / 1080;
const NOINK = 1;
const canvas = document.createElement("canvas");
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
camera.layers.enableAll();
scene.fog = new THREE.Fog(0xb8d0ec, 80, 900);

// ---------- toon materials ----------
const grad = (() => { const d = new Uint8Array([0, 0, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const ctex = (c, rep = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
/** triplanar toon: world-space projected texture (scale = metres per tile) */
const triToon = (tex, scale, color = 0xffffff, extra = {}) => {
  const m = toon({ color, ...extra });
  m.customProgramCacheKey = () => "tri";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tTri = { value: tex };
    sh.uniforms.triS = { value: 1 / scale };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTP; varying vec3 vTN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tTri; uniform float triS; varying vec3 vTP; varying vec3 vTN;")
      .replace("#include <map_fragment>", `{
        vec3 bw = pow(abs(vTN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tc = texture2D(tTri, vTP.zy * triS).rgb * bw.x + texture2D(tTri, vTP.xz * triS).rgb * bw.y + texture2D(tTri, vTP.xy * triS).rgb * bw.z;
        vec3 ta = textureLod(tTri, vec2(0.5), 12.0).rgb;
        tc = mix(tc, ta, smoothstep(70.0, 320.0, distance(vTP, cameraPosition)) * 0.85);
        diffuseColor.rgb *= tc; }`);
  };
  return m;
};

const TEX = {
  rock: ctex(P.rockTex(11)), rock2: ctex(P.rockTex(23)), grass: ctex(P.grassTex(3)), dirt: ctex(P.dirtTex(2)),
  mud: ctex(P.mudTex(4)), mud2: ctex(P.mudTex(14, 512, "#d8a874")), mudW: ctex(P.mudTex(24, 512, "#e9dcc4")), tile: ctex(P.tileTex(5)), thatch: ctex(P.thatchTex(6)),
  wood: ctex(P.woodTex(7)), leaf: ctex(P.leafTex(8)), leaf2: ctex(P.leafTex(18, 512, "#4f7a34")), palm: ctex(P.leafTex(28, 512, "#5e8c3c")),
};
const MAT = {
  rock: triToon(TEX.rock, 9), boulder: triToon(TEX.rock2, 4),
  grass: triToon(TEX.grass, 14), dirt: triToon(TEX.dirt, 8), lane: triToon(TEX.dirt, 6, 0xf2e6d6),
  mud: triToon(TEX.mud, 4), mud2: triToon(TEX.mud2, 4), mudW: triToon(TEX.mudW, 4),
  tile: toon({ map: TEX.tile }), thatch: toon({ map: TEX.thatch }), wood: triToon(TEX.wood, 2),
  leaf: triToon(TEX.leaf, 3), leaf2: triToon(TEX.leaf2, 3), palm: toon({ color: 0x5f9a3e }), trunk: triToon(TEX.wood, 1.5, 0x9a8070),
  door: toon({ color: 0x3a2618 }), dark: toon({ color: 0x2a1f1a }), hay: triToon(TEX.thatch, 2.5),
  white: triToon(TEX.mudW, 3, 0xffffff), hill: toon({ color: 0x8c8fa8 }), hill2: toon({ color: 0x9a9db4 }),
  mustard: triToon(ctex(P.grassTex(41, 512, "#d9b93c")), 10), paddy: triToon(ctex(P.grassTex(42, 512, "#7fa84a")), 10),
  sand: triToon(TEX.mud2, 4), water: toon({ color: 0x3f7fd0 }),
  deer: toon({ color: 0xc9a06a }), eleph: toon({ color: 0x8a8f96 }), tiger: toon({ color: 0xd07f2e }), tigerDark: toon({ color: 0x2a1f1a }),
  bamboo: toon({ color: 0x4a8c3f }), // shared by every bamboo trunk (was one material instance per tree)
};
const world = []; // meshes that get inked
const addW = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.layers.set(0); scene.add(mesh); world.push(mesh); return mesh; };

// ---------- world ----------
// ground: Brahmaputra sand (greens as the forest grows; see renderFrame).
// Displaced with the dune field so it is NOT a flat mirror for the sun — a flat plane blows the
// green tint out to yellow; dune normals break the light up and let the tint read.
let groundMesh;
{
  const g = new THREE.PlaneGeometry(2400, 2400, 200, 200); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, Math.max(0, terrainH(x, z, 0)) - 0.1);
  }
  g.computeVertexNormals();
  groundMesh = new THREE.Mesh(g, MAT.sand);
  addW(groundMesh, false, true);
}
// ridge heightfield: fine columns near the cut, coarse far away
const xs = [], zs = [];
{ let x = -620; while (x < 330) { xs.push(x); const a = Math.abs(x); x += a < 7 ? 0.25 : a < 22 ? 0.7 : a < 70 ? 2 : 5; } xs.push(330); }
{ let z = -62; while (z < 62) { zs.push(z); const a = Math.abs(z); z += a < 30 ? 0.45 : 1.6; } zs.push(62); }
const NX = xs.length, NZ = zs.length;
const ridgeGeo = new THREE.BufferGeometry();
const rPos = new Float32Array(NX * NZ * 3), rBase = new Float32Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; rPos[k * 3] = xs[i]; rPos[k * 3 + 2] = zs[j]; rBase[k] = ridgeH(xs[i], zs[j]); }
{
  const idx = [];
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, b, b, c, d); }
  ridgeGeo.setIndex(idx);
  ridgeGeo.setAttribute("position", new THREE.BufferAttribute(rPos, 3));
}
let ridgeP = -1;
const setProgress = (p) => {
  // sandbar terrain is STATIC: forest growth is setForest, not the ridge — build the heights once
  if (ridgeP >= 0) return;
  ridgeP = 0;
  for (let k = 0; k < NX * NZ; k++) rPos[k * 3 + 1] = terrainH(rPos[k * 3], rPos[k * 3 + 2], 0, rBase[k]);
  ridgeGeo.attributes.position.needsUpdate = true;
  ridgeGeo.computeVertexNormals();
  ridgeGeo.computeBoundingSphere();
};
setProgress(0);
const ridge = addW(new THREE.Mesh(ridgeGeo, MAT.rock), true, true);

const rnd = P.rng(77);
// boulders on the ridge (kept out of the cut corridor)
{
  const geo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 120; i++) {
    const x = -260 + rnd() * 500, z = (rnd() - 0.5) * 70;
    if (Math.abs(x) < 12) continue;
    const h = ridgeH(x, z) - 0.35;
    if (h < 0.3) { if (rnd() < 0.7 || Math.abs(z) > 30) continue; }
    const m = new THREE.Mesh(geo, MAT.boulder), s = 0.6 + rnd() * rnd() * 3.2;
    m.scale.set(s * (0.8 + rnd() * 0.6), s * (0.5 + rnd() * 0.4), s * (0.8 + rnd() * 0.6));
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.position.set(x, Math.max(0, h) + s * 0.15, z);
    addW(m);
  }
}
// scrub on the ridge + plains
const blobTree = (x, z, s, mat = MAT.leaf, trunkH = 0) => {
  const y0 = groundAt(x, z, 0);
  const g = new THREE.Group();
  if (trunkH) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, trunkH, 7), MAT.trunk); t.position.y = trunkH / 2; g.add(t); }
  const n = trunkH ? 5 : 2 + ((rnd() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.55 + rnd() * 0.35), 1), mat);
    b.position.set((rnd() - 0.5) * s * 1.2, trunkH + s * (0.3 + rnd() * 0.5), (rnd() - 0.5) * s * 1.2);
    b.scale.y = 0.75; g.add(b);
  }
  g.position.set(x, y0, z);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  scene.add(g);
  return g;
};
for (let i = 0; i < 50; i++) {
  const x = -300 + rnd() * 560, z = (rnd() - 0.5) * 60;
  if (Math.abs(x) < 10 && Math.abs(z) < 30) continue;
  if (Math.abs(x) < 30 && z > 15 && z < 52) continue; // planting clearing + animal meadow
  if (x > -8 && x < 10 && z > -20 && z < -5) continue; // riverbank snakes
  if (x > 4 && x < 20 && z > 50 && z < 66) continue; // ceremony clearing
  if (ridgeH(x, z) < 1.5) continue;
  blobTree(x, z, 0.6 + rnd() * 0.9, rnd() < 0.5 ? MAT.leaf : MAT.leaf2);
}
// Molai forest: ~150 bamboo / broadleaf / bushes, grown by world.progress (0 = bare sand, 1 = dense forest).
// Forest trees never cast shadows (perf: one less pass over ~600 meshes) — they only receive.
const forest = [];
{
  const mkBamboo = (x, z, h) => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, h, 6), MAT.bamboo); t.position.y = h / 2; g.add(t);
    for (let i = 0; i < 2; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 4), MAT.leaf2); lf.position.set((rnd() - 0.5) * 0.7, h - 0.6 + i * 0.35, (rnd() - 0.5) * 0.7); lf.rotation.z = (rnd() - 0.5) * 1.4; g.add(lf); }
    const lf = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 4), MAT.leaf2); lf.position.set((rnd() - 0.5) * 0.5, h * 0.6, (rnd() - 0.5) * 0.5); lf.rotation.z = (rnd() - 0.5) * 1.2; g.add(lf);
    g.position.set(x, groundAt(x, z, 0), z); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; world.push(o); } }); scene.add(g); return g;
  };
  const mkBush = (x, z, s) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), MAT.leaf2); b.scale.y = 0.7; b.position.y = s * 0.5; g.add(b);
    g.position.set(x, groundAt(x, z, 0), z); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; world.push(o); } }); scene.add(g); return g;
  };
  const addTree = (g, th) => { g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); g.scale.setScalar(0.001); forest.push({ g, th }); };
  for (let i = 0; i < 80; i++) {
    let x, z;
    if (i < 55) { x = -80 + rnd() * 160; z = -10 + rnd() * 80; } // dense core
    else { x = -130 + rnd() * 260; z = -25 + rnd() * 110; } // outer ring
    if (Math.abs(x) < 8 && z > 15 && z < 45) continue; // planting spot
    if (z > 36 && z < 48 && Math.abs(x) < 28) continue; // deer meadow
    if (x > -8 && x < 10 && z > -20 && z < -5) continue; // riverbank where the snakes lie
    if (x > 4 && x < 20 && z > 50 && z < 66) continue; // forest-edge ceremony clearing (shot 10)
    const th = (i < 55 ? 0.05 + rnd() * 0.7 : 0.05 + rnd() * 0.9), kind = rnd();
    if (kind < 0.55) addTree(mkBamboo(x, z, 4.5 + rnd() * 2.5), th);
    else if (kind < 0.75) addTree(blobTree(x, z, 1.6 + rnd() * 1.6, rnd() < 0.5 ? MAT.leaf : MAT.leaf2, 2.2), th);
    else addTree(mkBush(x, z, 0.7 + rnd() * 0.9), th);
  }
  // bushes the tiger peeks from (shot 8)
  for (const [x, z] of [[16, 33], [18, 37], [12, 32]]) addTree(mkBush(x, z, 1.1 + rnd() * 0.3), 0.15);
}
const setForest = (p) => { for (const { g, th } of forest) { const t = Math.min(1, Math.max(0, (p - th) / 0.12)); g.scale.setScalar(Math.max(0.001, t * t * (3 - 2 * t))); } };
// dead snakes on the riverbank (shots 2-3)
const snakes = new THREE.Group();
{
  const mat = toon({ color: 0x4a3a28 });
  const mkSnake = (x, z, len, rot) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3((t - 0.5) * len, 0.08 + 0.05 * Math.sin(t * 9), Math.sin(t * 7) * 0.35)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.07, 6), mat);
    m.position.set(x, groundAt(x, z, 0), z); m.rotation.y = rot; m.castShadow = m.receiveShadow = true; world.push(m); snakes.add(m);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
    h.position.set(x + Math.cos(rot) * len / 2, groundAt(x, z, 0) + 0.12, z - Math.sin(rot) * len / 2); world.push(h); snakes.add(h);
  };
  mkSnake(1.5, -12, 1.6, 0.4); mkSnake(3.2, -14, 1.3, 2.2); mkSnake(-1.0, -10, 1.5, 1.1); mkSnake(4.5, -9, 1.1, 2.8);
  snakes.visible = false; scene.add(snakes);
}
// forest animals (shot 8): all face +x when rotation.y = 0
const mkDeer = () => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.45), MAT.deer); body.position.y = 0.85; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.6, 6), MAT.deer); neck.position.set(0.5, 1.25, 0); neck.rotation.z = -0.5; g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.2), MAT.deer); head.position.set(0.78, 1.5, 0); g.add(head);
  for (const s of [-1, 1]) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.45, 5), MAT.tigerDark); ant.position.set(0.68, 1.75, s * 0.08); ant.rotation.z = -0.3; g.add(ant); }
  for (const [lx, lz] of [[0.4, 0.16], [0.4, -0.16], [-0.4, 0.16], [-0.4, -0.16]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6, 5), MAT.deer); leg.position.set(lx, 0.3, lz); g.add(leg); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; world.push(o); } });
  g.visible = false; scene.add(g); return g;
};
const deerHerd = [mkDeer(), mkDeer(), mkDeer(), mkDeer()];
const elephant = (() => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), MAT.eleph); body.scale.set(1.4, 1, 0.9); body.position.y = 1.6; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), MAT.eleph); head.position.set(1.7, 1.9, 0); g.add(head);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 7), MAT.eleph); trunk.position.set(2.4, 1.3, 0); trunk.rotation.z = 0.35; g.add(trunk);
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), MAT.eleph); ear.scale.set(0.25, 1, 0.8); ear.position.set(1.5, 2.1, 0.55); g.add(ear);
  for (const [lx, lz] of [[1.1, 0.5], [1.1, -0.5], [-1.1, 0.5], [-1.1, -0.5]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.3, 7), MAT.eleph); leg.position.set(lx, 0.65, lz); g.add(leg); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; world.push(o); } });
  g.visible = false; scene.add(g); return g;
})();
const tiger = (() => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.5), MAT.tiger); body.position.y = 0.7; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), MAT.tiger); head.position.set(0.85, 0.95, 0); g.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), MAT.tigerDark); ear.position.set(0.8, 1.2, s * 0.18); g.add(ear); }
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.52), MAT.tigerDark); st.position.set(0.4 - i * 0.4, 0.7, 0); g.add(st); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; world.push(o); } });
  g.visible = false; scene.add(g); return g;
})();
// "मोलाई वन" sign board (shot 10)
const board = new THREE.Group();
{
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g2 = c.getContext("2d");
  g2.fillStyle = "#8a5a34"; g2.fillRect(0, 0, 512, 256);
  g2.strokeStyle = "#5a3a1a"; g2.lineWidth = 10; g2.strokeRect(8, 8, 496, 240);
  g2.fillStyle = "#fff3d0"; g2.font = 'bold 92px "Noto Sans Devanagari", sans-serif'; g2.textAlign = "center"; g2.textBaseline = "middle";
  g2.fillText("मोलाई वन", 256, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const bd = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.12), toon({ map: tex }));
  bd.position.y = 1.5; board.add(bd);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.6, 6), MAT.wood); post.position.set(s * 0.9, 0.8, 0); board.add(post); }
  board.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; world.push(o); } });
  board.visible = false; scene.add(board);
}
// bamboo sapling prop (shots 1, 4)
const sapling = (() => {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 6), MAT.bamboo); t.position.y = 0.45; g.add(t);
  for (let i = 0; i < 3; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), MAT.leaf2); lf.position.set((rnd() - 0.5) * 0.2, 0.8 + i * 0.12, (rnd() - 0.5) * 0.2); lf.rotation.z = (rnd() - 0.5) * 1.0; g.add(lf); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; world.push(o); } });
  g.visible = false; scene.add(g); return g;
})();
// palm (toddy palm)
const palm = (x, z, h = 9) => {
  const y0 = groundAt(x, z, 0), g = new THREE.Group();
  const lean = (rnd() - 0.5) * 0.25;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, h, 7, 4), MAT.trunk); t.position.y = h / 2; t.rotation.z = lean; g.add(t);
  const top = new THREE.Vector3(-Math.sin(lean) * h, Math.cos(lean) * h, 0);
  const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), MAT.palm); cr.position.copy(top); g.add(cr);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), MAT.palm);
    f.scale.set(1, 1, 0.18); f.position.copy(top).add(new THREE.Vector3(Math.cos(a) * 1.3, 0.2, Math.sin(a) * 1.3));
    f.rotation.set(0, -a, 0); f.rotateZ(-Math.PI / 2 - 0.35); g.add(f);
  }
  g.position.set(x, y0, z); g.rotation.y = rnd() * 6;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  scene.add(g);
};
// house: mud walls, khapra or thatch gable roof, door, window
const roofGeo = (w, d, rise, over) => {
  const hw = w / 2 + over, hd = d / 2 + over, g = new THREE.BufferGeometry();
  const v = [-hw, 0, hd, hw, 0, hd, hw, rise, 0, -hw, rise, 0, -hw, rise, 0, hw, rise, 0, hw, 0, -hd, -hw, 0, -hd];
  const uv = [0, 0, w / 2.2, 0, w / 2.2, hd / 1.6, 0, hd / 1.6, 0, hd / 1.6, w / 2.2, hd / 1.6, w / 2.2, 0, 0, 0];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); g.computeVertexNormals();
  return g;
};
const house = (x, z, w, d, hgt, rot, kind = 0) => {
  const g = new THREE.Group(), y0 = groundAt(x, z, 0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [MAT.mud, MAT.mud2, MAT.mudW][kind % 3]); wall.position.y = hgt / 2; g.add(wall);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), MAT.dirt); plinth.position.y = 0.17; g.add(plinth);
  const rise = 1.4 + 0.2 * w, over = 0.45;
  const roof = new THREE.Mesh(roofGeo(w, d, rise, over), kind % 2 ? MAT.thatch : MAT.tile); roof.position.y = hgt; roof.material.side = THREE.DoubleSide; g.add(roof);
  const gable = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise - 0.05)].map((p) => new THREE.Vector2(p.x, p.y)));
  void gable;
  const gab = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise * (d / 2) / (d / 2 + over) - 0.02)]), { depth: w - 0.02, bevelEnabled: false }), [MAT.mud, MAT.mud2, MAT.mudW][kind % 3]);
  gab.rotation.y = Math.PI / 2; gab.position.set(-w / 2 + 0.01, hgt, 0); g.add(gab);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.8, 0.08), MAT.door); door.position.set(w * 0.15, 0.95, d / 2 + 0.02); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.08), MAT.dark); win.position.set(-w * 0.25, hgt * 0.62, d / 2 + 0.02); g.add(win);
  g.position.set(x, y0, z); g.rotation.y = rot;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  scene.add(g);
  return g;
};
const haystack = (x, z, s = 1) => {
  const g = new THREE.Group(), y0 = groundAt(x, z, 0);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(1.3 * s, 1.4 * s, 1.4 * s, 10), MAT.hay); b.position.y = 0.7 * s; g.add(b);
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.45 * s, 1.6 * s, 10), MAT.hay); c.position.y = 2.2 * s; g.add(c);
  g.position.set(x, y0, z);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  scene.add(g);
};
// village
const chimneys = [];
for (const h of VILLAGE.houses) { house(h[0], h[1], h[2], h[3], h[4], h[5], h[6]); if (h[7]) chimneys.push([h[0], groundAt(h[0], h[1], 0) + h[4] + 2, h[1]]); }
for (const t of VILLAGE.palms) palm(t[0], t[1], t[2]);
for (const t of VILLAGE.trees) blobTree(t[0], t[1], t[2], MAT.leaf, t[3]);
for (const t of VILLAGE.hay) haystack(t[0], t[1], t[2]);
// fields
for (const fl of VILLAGE.fields) {
  const g = new THREE.PlaneGeometry(fl[2], fl[3]); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, fl[4] ? MAT.mustard : MAT.paddy); m.position.set(fl[0], 0.04, fl[1]); m.rotation.y = fl[5] || 0;
  addW(m, false, true);
}
// ribbons (lane, road)
const ribbon = (pts, w, mat, lift = 0.06) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
  const L = curve.getLength(), n = Math.max(8, Math.round(L / 1.5)), pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), d = curve.getTangentAt(t), nx = -d.z, nz = d.x;
    for (const s of [-1, 1]) { const x = p.x + nx * s * w / 2, z = p.z + nz * s * w / 2; pos.push(x, groundAt(x, z, 1) + lift, z); uv.push(s * 0.5, (t * L) / w); }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return addW(new THREE.Mesh(g, mat), false, true);
};
ribbon(ROAD, 8, MAT.lane, 0.08);
ribbon(LANE, 4.5, MAT.lane);
ribbon(WATER, 70, MAT.water, 0.12); // Brahmaputra, north of the sandbar
// route lines (map view): unlit dashed strip that reveals along its length
const routeLine = (pts, color, w) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
  const L = curve.getLength(), n = Math.round(L / 1.2), pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPointAt(t), d = curve.getTangentAt(t), nx = -d.z, nz = d.x;
    for (const s of [-1, 1]) { const x = p.x + nx * s * w / 2, z = p.z + nz * s * w / 2; pos.push(x, groundAt(x, z, 1) + 0.35, z); uv.push(s * 0.5, t * L); }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color(color).convertSRGBToLinear() }, reveal: { value: 0 }, alpha: { value: 1 }, dash: { value: 12 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 col; uniform float reveal; uniform float alpha; uniform float dash; varying vec2 vUv;
      void main(){ if (vUv.y > reveal) discard; if (fract(vUv.y / dash) > 0.62) discard;
        vec3 c = mix(col, vec3(0.012), step(0.36, abs(vUv.x))); gl_FragColor = vec4(c, alpha); }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.layers.set(NOINK); mesh.renderOrder = 2; scene.add(mesh);
  return { mesh, mat, L };
};
const routeLong = routeLine(ROAD, "#e8382e", 5.5), routeShort = routeLine(SHORT, "#3fd15a", 5.5);
const shortRoad = ribbon(SHORT, 3.6, MAT.lane);
// distant hills
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2 + rnd() * 0.3, r = 700 + rnd() * 350;
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), i % 2 ? MAT.hill : MAT.hill2);
  m.scale.set(120 + rnd() * 160, 40 + rnd() * 70, 80 + rnd() * 80); m.position.set(Math.cos(a) * r, -10, Math.sin(a) * r - 150);
  addW(m, false, false);
}
// clinic: whitewashed box, parapet, lantern
const clinic = new THREE.Group();
{
  const b = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5), MAT.white); b.position.y = 1.7; clinic.add(b);
  const par = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.5, 5.4), MAT.white); par.position.y = 3.6; clinic.add(par);
  const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), MAT.door); d.position.set(0, 1.05, 2.53); clinic.add(d);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0xffc56a })); w.position.set(s * 2.3, 1.9, 2.53); clinic.add(w); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); lamp.position.set(0.9, 2.4, 2.75); clinic.add(lamp);
  clinic.position.set(CLINIC[0], 0, CLINIC[1]); clinic.rotation.y = CLINIC[2];
  clinic.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; world.push(o); } });
  scene.add(clinic);
  blobTree(CLINIC[0] - 7, CLINIC[1] - 2, 2.2, MAT.leaf, 2.5);
}
// set pieces: slab (losing) and the last wall (breakthrough)
const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), MAT.boulder);
slab.scale.set(3.4, 1.6, 2.6); addW(slab); slab.visible = false;
const plug = [];
{
  const geo = new THREE.DodecahedronGeometry(1, 0);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(geo, MAT.boulder), s = 1.15 + rnd() * 0.5;
    m.scale.set(s, s * 0.9, s * 0.8); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.userData.home = [(i - 2) * 1.75 + (rnd() - 0.5) * 0.4, 0.9 + j * 1.55 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.8];
    m.userData.vel = [(i - 2) * 1.6 + (rnd() - 0.5) * 2, 4 + rnd() * 5, -(9 + rnd() * 9)];
    m.userData.spin = [(rnd() - 0.5) * 9, (rnd() - 0.5) * 9, (rnd() - 0.5) * 9];
    m.userData.rot0 = [m.rotation.x, m.rotation.y, m.rotation.z];
    addW(m); m.visible = false; plug.push(m);
  }
}

// ---------- sky + clouds ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; varying vec3 vD;
  void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), top, smoothstep(0.18, 0.85, h));
    float s = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(s, 12.0) * 0.35 + smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.7, s) * 2.0);
    gl_FragColor = vec4(c, 1.0); }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
sky.layers.set(NOINK); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
const clouds = [];
for (let i = 0; i < 10; i++) {
  const t = ctex(P.cloudCanvas(i + 3), false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  const a = (i / 10) * Math.PI * 2 + 0.3, r = 850 + (i % 3) * 120;
  m.userData.base = [Math.cos(a) * r, 160 + (i % 4) * 45, Math.sin(a) * r - 100]; m.scale.setScalar(260 + (i % 3) * 90);
  m.layers.set(NOINK); scene.add(m); clouds.push(m);
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); // perf: 2048 was ~2x the frame time in software rendering; 1024 is plenty for this toon look
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);

// ---------- cards ----------
const SC = 0.00225; // metres per design unit
const cards = new Map();
const drawFn = {
  front: (p, a) => T.bodyFrontX(p, a.outfit, a.opts),
  side: (p, a) => T.bodySideX(p, a.outfit, a.opts),
};
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; T.fxBlob(new T.Pen(c.getContext("2d")), "#7d7f96"); return ctex(c, false); })();
const multiply = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
const ndCardMat = (map, pullU) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uPull: pullU }, side: THREE.DoubleSide,
  vertexShader: "uniform float uPull; varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(mv.xyz); mv.xyz *= max(0.15, (d - uPull) / d); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform sampler2D map; varying vec2 vUv; varying float vZ; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, vZ); }",
});
const getCard = (id, DW, DH) => {
  let c = cards.get(id);
  if (c && c.DW === DW && c.DH === DH) return c;
  if (c) { scene.remove(c.mesh); scene.remove(c.blob); }
  const sc = DW > 600 ? 1.6 : 2;
  const cv = document.createElement("canvas"); cv.width = Math.round(DW * sc); cv.height = Math.round(DH * sc);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(DW * SC, DH * SC); geo.translate(0, (DH * SC) / 2 - 25 * SC, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const pullU = { value: 0.3 };
  mat.customProgramCacheKey = () => "cardpull";
  mat.onBeforeCompile = (sh) => { sh.uniforms.uPull = pullU; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uPull;").replace("#include <project_vertex>", "#include <project_vertex>\n{ float d = length(mvPosition.xyz); mvPosition.xyz *= max(0.15, (d - uPull) / d); gl_Position = projectionMatrix * mvPosition; }"); };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = "YXZ"; mesh.castShadow = true; mesh.layers.set(NOINK);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  mesh.userData.nd = ndCardMat(tex, pullU);
  const bg = new THREE.PlaneGeometry(1.1, 0.55); bg.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(bg, multiply(blobTex)); blob.layers.set(NOINK);
  scene.add(mesh); scene.add(blob);
  c = { id, DW, DH, sc, cv, g: cv.getContext("2d"), tex, mesh, blob, key: "", pullU };
  cards.set(id, c);
  return c;
};
const fxCards = new Map();
const fxDraw = {
  burst: (p, s) => T.fxBurst(p, s.t, s.col || "#fff3b0"), puff: (p, s) => T.fxPuff(p, s.t), chips: (p, s) => T.fxChips(p, s.t, s.seed || 1),
  shards: (p, s) => T.fxShards(p, s.seed || 1), pot: (p) => T.fxPot(p), bird: (p, s) => T.fxBird(p, s.t), smoke: (p, s) => T.fxSmoke(p, s.t),
  glow: (p) => T.fxGlow(p), hammer: (p) => T.fxHammerProp(p), splash: (p, s) => T.fxSplash(p, s.t),
};
const FXSIZE = { burst: [500, 500], puff: [300, 300], chips: [400, 400], shards: [400, 200], pot: [300, 300], bird: [200, 100], smoke: [300, 600], glow: [256, 256], hammer: [420, 200], splash: [400, 400] };
const getFx = (id, kind) => {
  let c = fxCards.get(id);
  if (c && c.kind === kind) return c;
  const [w, h] = FXSIZE[kind];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: kind !== "glow", blending: kind === "glow" ? THREE.AdditiveBlending : THREE.NormalBlending }));
  mesh.layers.set(NOINK); scene.add(mesh);
  c = { id, kind, cv, g: cv.getContext("2d"), tex, mesh, key: "" };
  fxCards.set(id, c);
  return c;
};

// ---------- post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtND = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtPost = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const ndWorld = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: "varying vec3 vN; varying float vZ; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying float vZ; void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n, vZ); }",
});
const FSV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const inkMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, px: { value: PX },
    inkCol: { value: new THREE.Color(0x0b0a0c) }, fogCol: { value: new THREE.Color() }, sat: { value: 1.08 }, expo: { value: 1 },
    lift: { value: new THREE.Vector3(0.02, 0.025, 0.05) }, gain: { value: new THREE.Vector3(1, 1, 1) }, vign: { value: 0.18 }, flash: { value: 0 }, inkK: { value: 1 }, dbg: { value: 0 },
  },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float px; uniform vec3 inkCol; uniform vec3 fogCol;
  uniform float sat; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float vign; uniform float flash; uniform float inkK; uniform float dbg; varying vec2 vUv;
  vec3 shoulder(vec3 x){ return mix(x, 0.78 + 0.3 * (1.0 - exp(-(x - 0.78) / 0.3)), step(0.78, x)); }
  void main(){
    vec3 c = texture2D(tColor, vUv).rgb * expo;
    vec4 nd = texture2D(tND, vUv); float zc = nd.a > 0.0 ? nd.a : 1e5; vec3 nc = nd.xyz;
    float ink = 0.0;
    if (dot(nc, nc) > 0.25 && zc < 4000.0) {
      float w = mix(5.0, 3.2, smoothstep(1.8, 4.5, log(zc))) * px;
      float bD = 99.0, bC = 99.0;
      for (int d = 0; d < 4; d++) {
        vec2 st = d == 0 ? vec2(1.0, 0.0) : d == 1 ? vec2(0.0, 1.0) : d == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
        for (int s = 1; s <= 6; s++) {
          float fs = float(s);
          float fl = fs * (d > 1 ? 1.4142 : 1.0);
          if (fl > w + 1.0) break;
          vec2 o = st * texel * fs;
          vec4 a = texture2D(tND, vUv + o), b = texture2D(tND, vUv - o);
          if (a.a <= 0.0) a.a = 1e5; if (b.a <= 0.0) b.a = 1e5;
          float k = 2.0 - zc / a.a - zc / b.a;
          if (k > 0.02) bD = min(bD, fl);
          if (dot(a.xyz, a.xyz) > 0.25 && abs(a.a - zc) < zc * 0.03 && dot(a.xyz, nc) < 0.7) bC = min(bC, fl);
          if (dot(b.xyz, b.xyz) > 0.25 && abs(b.a - zc) < zc * 0.03 && dot(b.xyz, nc) < 0.7) bC = min(bC, fl);
        }
      }
      float iD = 1.0 - smoothstep(w - 0.6, w + 0.4, bD);
      float iC = (1.0 - smoothstep(w * 0.7 - 0.6, w * 0.7 + 0.4, bC)) * 0.85;
      ink = max(iD, iC) * (1.0 - smoothstep(170.0, 560.0, zc)) * inkK;
    }
    vec3 ic = mix(inkCol, fogCol * 0.55, 0.3 * smoothstep(60.0, 400.0, zc));
    c = mix(c, ic, ink);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat);
    c = c * gain + lift * (1.0 - clamp(c, 0.0, 1.0));
    c = shoulder(c);
    vec2 q = (vUv - 0.5) * vec2(0.75, 1.0);
    c *= 1.0 - vign * smoothstep(0.25, 0.75, length(q));
    c = mix(c, vec3(1.0), flash);
    if (dbg > 0.5) c = vec3(ink, zc / 60.0, dot(nc, nc));
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const dofMat = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rtPost.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, focus: { value: 10 }, cInf: { value: 0 }, cMax: { value: 18 } },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float focus; uniform float cInf; uniform float cMax; varying vec2 vUv;
  float coc(float z){ z = z > 0.0 ? z : 1e5; return min(cMax, cInf * abs(1.0 - focus / max(z, 0.05))); }
  vec3 enc(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb;
    float cc = coc(texture2D(tND, vUv).a);
    if (cInf < 0.3 || cc < 0.6) { gl_FragColor = vec4(enc(c0), 1.0); return; }
    vec3 acc = c0; float ws = 1.0;
    for (int i = 0; i < 48; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / 48.0) * cc, a = fi * 2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
      float cq = coc(texture2D(tND, uv).a);
      float w = clamp(cq - r + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(enc(acc / ws), 1.0);
  }`,
});

// ---------- per-frame ----------
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const col = (c) => new THREE.Color(c);
const applyLight = (L, S) => {
  const d = new THREE.Vector3(Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180), Math.sin(L.el * Math.PI / 180), Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)).normalize();
  sun.color.setRGB(L.sun[0], L.sun[1], L.sun[2]); sun.intensity = Math.PI;
  hemi.color.setRGB(L.amb[0], L.amb[1], L.amb[2]); hemi.groundColor.setRGB(L.gnd[0], L.gnd[1], L.gnd[2]); hemi.intensity = Math.PI;
  const c = v3(S.shadow.c), r = S.shadow.r;
  sun.position.copy(c).addScaledVector(d, 200); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 420; sc.updateProjectionMatrix();
  skyMat.uniforms.top.value.copy(col(L.top)).convertSRGBToLinear(); skyMat.uniforms.hor.value.copy(col(L.hor)).convertSRGBToLinear(); skyMat.uniforms.mid.value.copy(col(L.mid)).convertSRGBToLinear();
  skyMat.uniforms.sunDir.value.copy(d); skyMat.uniforms.sunCol.value.setRGB(L.sun[0] * 0.6, L.sun[1] * 0.5, L.sun[2] * 0.4); skyMat.uniforms.sunSize.value = L.disc || 0;
  scene.fog.color.copy(col(L.hor)).convertSRGBToLinear(); scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
  inkMat.uniforms.fogCol.value.copy(scene.fog.color);
  inkMat.uniforms.sat.value = L.sat; inkMat.uniforms.expo.value = L.expo ?? 1;
  inkMat.uniforms.lift.value.set(L.lift[0], L.lift[1], L.lift[2]); inkMat.uniforms.gain.value.set(L.gain[0], L.gain[1], L.gain[2]);
  return d;
};

const camRightOf = () => { const r = new THREE.Vector3(); camera.matrixWorld.extractBasis(r, new THREE.Vector3(), new THREE.Vector3()); return r; };

window.renderFrame = (f) => {
  const S = frameState(f);
  setProgress(S.world.progress);
  // forest growth + ground greening follow world.progress (ridge dunes green too, or the aerials stay desert)
  setForest(S.world.progress);
  const pp = S.world.progress;
  groundMesh.material.color.setRGB(1 - 0.55 * pp, 1 - 0.35 * pp, 1 - 0.6 * pp);
  MAT.rock.color.setRGB(1 - 0.45 * pp, 1 - 0.28 * pp, 1 - 0.5 * pp);
  snakes.visible = !!S.world.snakes;
  const an = S.world.animals;
  deerHerd.forEach((d, i) => {
    d.visible = !!(an && an.deer && an.deer[i]);
    if (d.visible) { const [x, z, rot] = an.deer[i]; d.position.set(x, groundAt(x, z, 0) + Math.abs(Math.sin(f * 0.5 + i)) * 0.12, z); d.rotation.y = rot; }
  });
  elephant.visible = !!(an && an.elephant);
  if (elephant.visible) { const [x, z, rot] = an.elephant; elephant.position.set(x, groundAt(x, z, 0), z); elephant.rotation.y = rot; }
  tiger.visible = !!(an && an.tiger);
  if (tiger.visible) { const [x, z, rot] = an.tiger; tiger.position.set(x, groundAt(x, z, 0), z); tiger.rotation.y = rot; }
  board.visible = !!S.world.board;
  if (S.world.board) { const b = S.world.board; board.position.set(b.pos[0], groundAt(b.pos[0], b.pos[1], 0), b.pos[1]); board.rotation.y = b.rot || 0; }
  sapling.visible = !!S.world.sapling;
  if (S.world.sapling) { const s = S.world.sapling; sapling.position.set(s.pos[0], groundAt(s.pos[0], s.pos[1], 0), s.pos[1]); sapling.scale.setScalar(s.scale || 1); }
  shortRoad.visible = !!S.world.short;
  for (const [r, v] of [[routeLong, S.world.routeLong], [routeShort, S.world.routeShort]]) {
    r.mesh.visible = !!v && v.reveal > 0;
    if (v) { r.mat.uniforms.reveal.value = v.reveal * r.L; r.mat.uniforms.alpha.value = v.alpha ?? 1; }
  }
  // camera
  camera.position.set(...S.cam.pos); camera.up.set(0, 1, 0); camera.lookAt(...S.cam.look);
  camera.fov = S.cam.fov; camera.updateProjectionMatrix();
  if (S.cam.roll) camera.rotateZ((S.cam.roll * Math.PI) / 180);
  camera.updateMatrixWorld();
  const camR = camRightOf();
  applyLight(S.light, S);
  // set pieces
  slab.visible = !!S.world.slab;
  if (S.world.slab) { const s = S.world.slab; slab.position.set(...s.pos); slab.rotation.set(...s.rot); }
  for (const [i, m] of plug.entries()) {
    const pg = S.world.plug;
    m.visible = !!pg;
    if (!pg) continue;
    const h = m.userData.home, t = Math.max(0, pg.t), v = m.userData.vel, sp = m.userData.spin, r0 = m.userData.rot0;
    m.position.set(pg.pos[0] + h[0] + v[0] * t, Math.max(0.6, pg.pos[1] + h[1] + v[1] * t - 4.9 * t * t), pg.pos[2] + h[2] + v[2] * t);
    m.rotation.set(r0[0] + sp[0] * t, r0[1] + sp[1] * t, r0[2] + sp[2] * t);
    void i;
  }
  // cards
  const seen = new Set();
  for (const a of S.actors) {
    const DW = a.wide ? 1000 : 600, DH = a.wide ? 1150 : 1000;
    const c = getCard(a.id, DW, DH); seen.add(a.id);
    const key = a.kind + JSON.stringify(a.opts) + (a.outfitKey || "");
    if (key !== c.key) {
      c.key = key;
      c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      c.g.setTransform(c.sc, 0, 0, c.sc, 0, 0); c.g.translate((DW - 600) / 2, DH - 1000);
      drawFn[a.kind](new T.Pen(c.g), a);
      c.tex.needsUpdate = true;
    }
    const y = a.y ?? groundAt(a.pos[0], a.pos[1], S.world.progress);
    c.mesh.position.set(a.pos[0], y + (a.lift || 0), a.pos[1]);
    const s = a.scale || 1;
    let mirror = 1;
    if (a.kind === "side" && a.dir) mirror = a.dir[0] * camR.x + a.dir[1] * camR.z < 0 ? -1 : 1;
    c.mesh.scale.set(s * mirror, s, s);
    c.mesh.rotation.set(0, Math.atan2(camera.position.x - a.pos[0], camera.position.z - a.pos[1]), ((a.roll || 0) * Math.PI) / 180);
    c.mesh.material.color.setRGB(...S.light.card);
    c.pullU.value = a.pull ?? 0.3;
    c.mesh.visible = a.visible !== false;
    c.blob.visible = a.visible !== false && a.blob !== false && !a.lift;
    c.blob.position.set(a.pos[0], groundAt(a.pos[0], a.pos[1], S.world.progress) + 0.03, a.pos[1]);
    c.blob.scale.setScalar(s);
    c.blob.rotation.y = c.mesh.rotation.y;
  }
  for (const [id, c] of cards) if (!seen.has(id)) { c.mesh.visible = false; c.blob.visible = false; }
  // fx
  const seenFx = new Set();
  for (const e of (window.NOFX ? [] : S.fx)) {
    const c = getFx(e.id, e.kind); seenFx.add(e.id);
    const key = JSON.stringify([e.t, e.seed, e.col]);
    if (key !== c.key) {
      c.key = key; c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      fxDraw[e.kind](new T.Pen(c.g), e); c.tex.needsUpdate = true;
    }
    c.mesh.position.set(...e.pos);
    if (e.flat) { c.mesh.rotation.set(-Math.PI / 2, 0, e.rot || 0); }
    else { c.mesh.quaternion.copy(camera.quaternion); if (e.rot) c.mesh.rotateZ(e.rot); }
    c.mesh.scale.set(e.size * (e.mirror ? -1 : 1), e.size, e.size);
    c.mesh.material.opacity = e.alpha ?? 1;
    c.mesh.material.color.setRGB(...(e.kind === "glow" ? [1, 1, 1] : S.light.card));
    c.mesh.visible = true;
  }
  for (const [id, c] of fxCards) if (!seenFx.has(id)) c.mesh.visible = false;
  // clouds drift
  for (const [i, m] of clouds.entries()) { const b = m.userData.base; m.position.set(b[0] + f * 0.25 * (1 + (i % 3) * 0.3), b[1], b[2]); m.quaternion.copy(camera.quaternion); m.material.color.setRGB(...S.light.cloud); }
  sky.position.copy(camera.position);

  // pass 1: colour
  renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear();
  renderer.render(scene, camera);
  // pass 2: normal + depth (world inked, cards = depth only, everything else hidden)
  const hidden = [], swapped = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData.nd) { swapped.push([o, o.material]); o.material = o.userData.nd; }
    else if (world.includes(o)) { swapped.push([o, o.material]); o.material = ndWorld; }
    else { hidden.push(o); o.visible = false; }
  });
  const fog = scene.fog; scene.fog = null; renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtND); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(scene, camera);
  scene.fog = fog;
  for (const [o, m] of swapped) o.material = m;
  for (const o of hidden) o.visible = true;
  // pass 3: ink + grade
  inkMat.uniforms.dbg.value = window.INKDBG ? 1 : 0;
  inkMat.uniforms.flash.value = S.flash || 0; inkMat.uniforms.vign.value = S.vign ?? 0.18;
  fsQuad.material = inkMat; renderer.setRenderTarget(rtPost); renderer.render(fsScene, fsCam);
  // pass 4: lens blur -> screen
  dofMat.uniforms.focus.value = S.dof.focus; dofMat.uniforms.cInf.value = window.NODOF ? 0 : S.dof.cInf * PX;
  fsQuad.material = dofMat; renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
  return canvas.toDataURL("image/jpeg", 0.95);
};
window.TOTAL = TOTAL;
window.dbgND = () => { const out = []; const buf = new Float32Array(4); for (const [x, y] of [[540, 1700], [540, 1200], [540, 900], [540, 700], [300, 300], [800, 1500]]) { renderer.readRenderTargetPixels(rtND, x, y, 1, 1, buf); out.push([x, y, ...Array.from(buf).map((v) => +v.toFixed(3))]); } return JSON.stringify(out); };
window.ready = true;
