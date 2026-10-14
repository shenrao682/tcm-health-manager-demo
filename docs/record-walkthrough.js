// Records a scripted walkthrough of the demo as a (silent) video and logs caption timings.
// usage: node record.js <zh|en> <path/to/index.html> <outdir>
// Output: <outdir>/*.webm and <outdir>/timeline.json  { t0Marker:"red flash", caps:[{id, at_ms}] }
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const CAPS = require("./captions.js");
const DUR = require("./tts/durations.json");

const [lang, indexPath, outDir] = process.argv.slice(2);
const W = 430, H = 900;
const T = (zh, en) => (lang === "en" ? en : zh);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const capText = (id) => CAPS.find((c) => c.id === id)[lang];
const capDur = (id) => Math.round((DUR[`${lang}_${id}`] || 2) * 1000);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2,
    recordVideo: { dir: outDir, size: { width: W, height: H } },
    locale: lang === "en" ? "en-US" : "zh-CN",
  });
  const page = await ctx.newPage();
  await page.goto("file://" + path.resolve(indexPath));
  await page.waitForSelector("#view");
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector("#view");
  await page.evaluate((l) => { S.lang = l; save(); render(); }, lang);
  await page.evaluate(() => { document.querySelector(".side").style.display = "none"; document.body.style.padding = "8px 0 0"; });
  await page.evaluate(() => {
    const c = document.createElement("div"); c.id = "cap";
    c.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;max-width:92%;background:rgba(29,36,32,.92);color:#fff;font:600 15px/1.45 'Noto Sans SC','PingFang SC',system-ui,sans-serif;padding:10px 16px;border-radius:14px;z-index:99;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .3s;opacity:0";
    document.body.appendChild(c);
    const n = document.createElement("div"); n.id = "stepno";
    n.style.cssText = "position:fixed;left:14px;top:12px;background:#2f6f5e;color:#fff;font:700 12px/1 system-ui;padding:6px 10px;border-radius:999px;z-index:99;opacity:0;transition:opacity .3s";
    document.body.appendChild(n);
    const f = document.createElement("div"); f.id = "flash";
    f.style.cssText = "position:fixed;inset:0;background:#ff0000;z-index:999;display:none";
    document.body.appendChild(f);
  });
  await wait(600);
  // calibration flash: pure red full-screen for 400 ms; t0 = moment it appears
  const t0 = await page.evaluate(() => { document.getElementById("flash").style.display = "block"; return performance.now(); });
  await wait(400);
  await page.evaluate(() => { document.getElementById("flash").style.display = "none"; });
  await wait(500);

  const timeline = [];
  let step = 0;
  const cap = async (id, minMs = 0) => {
    step++;
    const at = await page.evaluate(([t, s]) => { const c = document.getElementById("cap"); c.textContent = t; c.style.opacity = 1; const n = document.getElementById("stepno"); n.textContent = s; n.style.opacity = 1; return performance.now(); }, [capText(id), String(step).padStart(2, "0")]);
    timeline.push({ id, at_ms: Math.round(at - t0) });
    await wait(Math.max(minMs, capDur(id) + 500));
  };
  const click = async (sel, ms = 900) => { await page.click(sel); await wait(ms); };
  const type = async (sel, text, ms = 40) => { await page.click(sel); await page.type(sel, text, { delay: ms }); await wait(600); };
  const ring = async (sel, ms = 700) => {
    await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return; el.style.outline = "3px solid #d85a30"; el.style.outlineOffset = "2px"; setTimeout(() => { el.style.outline = ""; }, 900); el.scrollIntoView({ block: "center" }); }, sel);
    await wait(ms);
  };

  await cap("c01", 2200);
  await cap("c02", 2600);
  await ring('[data-act="startChat"]'); await click('[data-act="startChat"]', 1200);
  await cap("c03", 2400);
  const phrase = T("我特别怕冷,手脚老凉,一吃凉的就拉肚子", "I'm always cold, my hands and feet are freezing, and cold food gives me diarrhea");
  await type("#chatIn", phrase, lang === "en" ? 28 : 60);
  await click('[data-act="chatSend"]', 1600);
  await cap("c04", 2200);
  for (let i = 0; i < 12; i++) {
    const opts = await page.$$('[data-act="chatAns"]'); if (!opts.length) break;
    const pickIdx = [1, 0, 2, 1, 0, 1, 0, 1, 2, 0, 1, 0][i] ?? 1;
    await opts[Math.min(pickIdx, opts.length - 1)].click();
    await wait(i < 3 ? 900 : 450);
    if (i === 1) await cap("c05", 2000);
  }
  await wait(800);
  await cap("c06", 2400);
  await ring('[data-act="toReport"]'); await click('[data-act="toReport"]', 1400);

  await cap("c07", 3200);
  await page.evaluate(() => document.getElementById("view").scrollTo({ top: 420, behavior: "smooth" }));
  await cap("c08", 2800);
  await page.evaluate(() => document.getElementById("view").scrollTo({ top: 99999, behavior: "smooth" }));
  await wait(800);
  await ring('[data-act="goals"]'); await click('[data-act="goals"]', 1200);
  await cap("c09", 1600);
  await click('[data-g="sleep"]', 700); await click('[data-g="energy"]', 900);
  await ring('[data-act="genPlan"]'); await click('[data-act="genPlan"]', 1600);

  await cap("c10", 3200);
  for (const sec of ["recipe", "sleep", "move", "acu"]) {
    await click(`[data-sec="${sec}"]`, 1400);
    if (sec === "recipe") { await click('[data-act="recipe"]', 1200); await cap("c11", 2400); await click("#backBtn", 900); }
    if (sec === "move") { await click('[data-act="video"]', 1200); await cap("c12", 2400); await click('[data-act="closeSheet"]', 800); }
    if (sec === "acu") {
      await click('[data-act="acu"]', 1200);
      await cap("c13", 2400);
      await ring('[data-act="tToggle"]'); await click('[data-act="tToggle"]', 3200);
      await click('[data-act="tToggle"]', 800);
      await click("#backBtn", 900);
    }
  }

  await click('[data-tab="today"]', 1000);
  await cap("c14", 2400);
  await click('[data-act="checkin"]', 1200);
  await cap("c15", 2000);
  await click('[data-ck="sleepQ"][data-v="好"]', 600);
  await click('[data-ck="diet"][data-v="是"]', 600);
  await click('[data-ck="move"][data-v="30"]', 600);
  await click('[data-ck="mood"][data-v="4"]', 1200);
  await cap("c16", 2800);
  await click('[data-act="drip"]', 1200);
  for (let i = 0; i < 3; i++) { const b = await page.$$('[data-act="ans"]'); if (!b.length) break; await b[0].click(); await wait(700); }
  await cap("c17", 2200);
  await click('[data-act="closeSheet"]', 800);
  await click("#backBtn", 900);

  await click('[data-tab="plan"]', 900);
  await page.evaluate(() => document.getElementById("view").scrollTo({ top: 99999, behavior: "smooth" }));
  await wait(600);
  await ring('[data-act="ask"]'); await click('[data-act="ask"]', 1200);
  await cap("c18", 2200);
  await type("#askIn", T("我血压 150 该吃什么中药", "My blood pressure is 150, what herbs should I take?"), lang === "en" ? 28 : 60);
  await click('[data-act="askSend"]', 1500);
  await cap("c19", 2800);
  await click('[data-act="refRecord"]', 1400);
  await cap("c20", 2400);

  await click('[data-tab="me"]', 900);
  await click('[data-act="family"]', 1200);
  await cap("c21", 2600);
  await click('[data-id="m2"]', 1200);
  await cap("c22", 2000);
  await click('[data-tab="me"]', 800);
  await click('[data-act="settings"]', 1200);
  await ring('[data-act="elder"]'); await click('[data-act="elder"]', 1200);
  await cap("c23", 2400);
  await click('[data-act="elder"]', 800);
  const other = lang === "en" ? '[data-act="setZh"]' : '[data-act="setEn"]';
  await ring(other); await click(other, 1200);
  await cap("c24", 2600);
  await click(lang === "en" ? '[data-act="setEn"]' : '[data-act="setZh"]', 800);
  await cap("c25", 2000);
  await wait(600);

  await ctx.close(); await browser.close();
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".webm"));
  fs.writeFileSync(path.join(outDir, "timeline.json"), JSON.stringify({ lang, video: files[files.length - 1], caps: timeline }, null, 1));
  console.log(JSON.stringify({ lang, video: path.join(outDir, files[files.length - 1]), caps: timeline.length }));
})().catch((e) => { console.error(e); process.exit(1); });
