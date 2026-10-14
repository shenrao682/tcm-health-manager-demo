// Mux narration into a recorded walkthrough using Chromium's MediaRecorder (no external ffmpeg needed).
// usage: node composite.js <zh|en> <recdir> <out.webm>
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const [lang, recDir, outFile] = process.argv.slice(2);
const root = __dirname;
const mime = { ".html": "text/html", ".webm": "video/webm", ".wav": "audio/wav", ".json": "application/json", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const stat = fs.statSync(p); const ext = path.extname(p);
  const range = req.headers.range;
  if (range) { // byte ranges for <video>
    const [s, e] = range.replace("bytes=", "").split("-"); const start = +s, end = e ? +e : stat.size - 1;
    res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Type": mime[ext] || "application/octet-stream" });
    return fs.createReadStream(p, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Length": stat.size, "Content-Type": mime[ext] || "application/octet-stream", "Accept-Ranges": "bytes" });
  fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r)); const port = server.address().port;
  const tl = JSON.parse(fs.readFileSync(path.join(recDir, "timeline.json"), "utf8"));
  const relRec = path.relative(root, recDir);
  const clips = {}; for (const c of tl.caps) clips[c.id] = `/tts/${lang}_${c.id}.wav`;
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--disable-features=AudioServiceOutOfProcess"] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const out = fs.createWriteStream(outFile);
  await page.exposeFunction("saveChunk", (b64) => { out.write(Buffer.from(b64, "base64")); });
  let total = 0; await page.exposeFunction("saveDone", (n) => { total = n; });
  page.on("console", (m) => { if (m.type() === "error") console.error("page:", m.text()); });
  await page.goto(`http://127.0.0.1:${port}/compositor.html`);
  const res = await page.evaluate((cfg) => run(cfg), { video: `/${relRec}/${tl.video}`, timeline: tl.caps, clips, lang });
  await new Promise((r) => out.end(r));
  await browser.close(); server.close();
  console.log(JSON.stringify({ lang, outFile, ...res, written: total }));
})().catch((e) => { console.error(e); process.exit(1); });
