// Playwright frame renderer.
//   node render.mjs frames "0-1253"        -> frames/f0000.jpg ...  (RESUME=1 skips existing files)
//   node render.mjs stills/a "5,40,90"     -> stills/a/f0005.jpg ...
//   node render.mjs page charsheet.html out.png   -> screenshot of a test page (waits for window.done)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "web");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const [, , outArg, spec, extra] = process.argv;
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("[page]", m.text()); });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

if (outArg === "page") {
  await page.setViewportSize({ width: 2400, height: 2200 });
  await page.goto(`http://127.0.0.1:${port}/${spec}`);
  await page.waitForFunction("window.done === true", null, { timeout: 120000 });
  await page.locator("canvas").first().screenshot({ path: extra });
  console.log("wrote", extra);
} else {
  const parse = (s) => s.split(",").flatMap((t) => { const m = t.match(/^(\d+)-(\d+)$/); if (!m) return [Number(t)]; const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(i); return a; });
  const frames = parse(spec);
  fs.mkdirSync(outArg, { recursive: true });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction("window.ready === true", null, { timeout: 300000 });
  const t0 = Date.now();
  let n = 0;
  for (const f of frames) {
    const file = path.join(outArg, `f${String(f).padStart(4, "0")}.jpg`);
    if (process.env.RESUME && fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
    const url = await page.evaluate((f) => window.renderFrame(f), f);
    fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
    n++;
    if (n % 10 === 0 || frames.length < 40) console.log(`frame ${f} done (${n} rendered, ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame)`);
  }
  console.log(`DONE ${n} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close();
server.close();
