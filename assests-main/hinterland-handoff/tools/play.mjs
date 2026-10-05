// Headless playtest: node play.mjs <outPrefix> [script...]
// env TOUCH=1 / TOUCH=portrait emulates a phone. script steps: "wait:ms" "shot:name" "click:Text" "hold:KeyW,KeyA:ms" "eval:js" "clear"
import puppeteer from "puppeteer-core";
const [, , prefix = "shot", ...steps] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", protocolTimeout: 900000,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=1280,720", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
// TOUCH=1 (landscape phone) or TOUCH=portrait: coarse pointer, touch events, mobile viewport
if (process.env.TOUCH) await page.setViewport(process.env.TOUCH === "portrait" ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto("http://localhost:5179/", { waitUntil: "load" });
const state = async () => page.evaluate(() => {
  const h = window.__hl; if (!h) return "no __hl";
  const c = h.live.car, s = h.store.getState();
  return `phase=${s.phase} pos=(${c.x.toFixed(1)},${c.y.toFixed(2)},${c.z.toFixed(1)}) yaw=${c.yaw.toFixed(2)} speed=${c.speed.toFixed(2)} air=${c.air} still=${c.still.toFixed(1)} found=${s.found.join("|")} obj=${s.objMode} card=${s.card?.name ?? "-"}`;
});
const fps = async () => page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
for (const step of steps) {
  const [cmd, ...rest] = step.split(":");
  const arg = rest.join(":");
  if (cmd === "wait") await new Promise((r) => setTimeout(r, +arg));
  else if (cmd === "shot") { await page.screenshot({ path: `${prefix}-${arg}.png` }); console.log("shot", arg, await state()); }
  else if (cmd === "click") {
    const ok = await page.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t)); if (b) { b.click(); return true; } return false; }, arg);
    console.log("click", arg, ok);
  } else if (cmd === "hold") {
    const [keys, ms] = arg.split(":");
    const ks = keys.split(",");
    for (const k of ks) await page.keyboard.down(k);
    const end = Date.now() + +ms;
    while (Date.now() < end) { await new Promise((r) => setTimeout(r, Math.min(1000, end - Date.now()))); console.log("  ", await state()); }
    for (const k of ks) await page.keyboard.up(k);
  } else if (cmd === "drive") {
    // drive:x,z;x,z;...:timeoutMs[:throttle]  autopilot through waypoints via the touch channel
    const [wps, ms, thr = "1"] = arg.split(":");
    const pts = wps.split(";").map((p) => p.split(",").map(Number));
    await page.evaluate((pts, thr) => {
      const h = window.__hl; window.__ap = { i: 0, done: false, maxAir: 0, slowT: 0, maxSlow: 0, minUp: 1 };
      let last = performance.now();
      const loop = () => {
        const ap = window.__ap; if (ap.done) { h.touch.steer = 0; h.touch.throttle = 0; return; }
        const now = performance.now(), dt = (now - last) / 1000; last = now;
        const c = h.live.car, [tx, tz] = pts[ap.i];
        const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
        if (d < 7) { ap.i++; if (ap.i >= pts.length) { ap.done = true; } requestAnimationFrame(loop); return; }
        const want = Math.atan2(-dx, -dz); let e = want - c.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
        h.touch.steer = Math.max(-1, Math.min(1, e * 2.5));
        h.touch.throttle = Math.abs(e) > 1.2 ? 0.5 : thr;
        if (ap.rev > 0) { ap.rev -= dt; h.touch.throttle = -1; h.touch.steer = -h.touch.steer; ap.slowT = 0; }
        else { if (Math.abs(c.speed) < 1.5) ap.slowT += dt; else ap.slowT = 0; ap.maxSlow = Math.max(ap.maxSlow, ap.slowT); }
        if (ap.slowT > 2) { ap.rev = 1.3; ap.reversals = (ap.reversals || 0) + 1; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }, pts, +thr);
    const end = Date.now() + +ms;
    while (Date.now() < end) {
      await new Promise((r) => setTimeout(r, 2000));
      const ap = await page.evaluate(() => window.__ap);
      console.log("  wp", ap.i, await state());
      if (ap.done) break;
    }
    const ap = await page.evaluate(() => { window.__ap.done = true; return window.__ap; });
    console.log("drive end: reached", ap.i, "/", pts.length, "longest slow stretch", ap.maxSlow.toFixed(1), "s, reversals", ap.reversals || 0);
  } else if (cmd === "press") { await page.keyboard.press(arg); }
  else if (cmd === "circle") {
    // circle:speed:steer:ms  hold a speed with the throttle, constant steer; log crates + tilt
    const [v, steer, ms] = arg.split(":").map(Number);
    const r = await page.evaluate((v, steer, ms) => new Promise((res) => {
      const h = window.__hl, t0 = performance.now(); let maxLat = 0, minUp = 1;
      const f = () => {
        const c = h.live.car; h.touch.steer = steer; h.touch.throttle = Math.abs(c.speed) < v ? 1 : 0;
        maxLat = Math.max(maxLat, Math.abs(h.live.latAccel));
        if (performance.now() - t0 < ms) requestAnimationFrame(f); else { h.touch.steer = 0; h.touch.throttle = 0; res({ maxLat: maxLat.toFixed(2), crates: (h.store.getState().crates || []).join(','), speed: c.speed.toFixed(1), fade: h.store.getState().fade }); }
      };
      f();
    }), v, steer, ms);
    console.log('circle', arg, JSON.stringify(r));
  }
  else if (cmd === "trail") {
    // trail:toProgress:vmax:ms  follow the Kettle trail (pure pursuit) with a speed cap; reports crates + progress
    const [toP, vmax, ms] = arg.split(":").map(Number);
    const r = await page.evaluate((toP, vmax, ms) => new Promise((res) => {
      window.__revs = 0; const h = window.__hl, T = h.trail, L = T[T.length - 1].s, t0 = performance.now(); let stuck = 0, last = performance.now(), recoveries = 0, wasFade = false;
      const f = () => {
        const now = performance.now(), dt = (now - last) / 1000; last = now;
        const c = h.live.car, s = h.store.getState();
        if (s.fade && !wasFade) recoveries++; wasFade = s.fade;
        // nearest trail point, then aim 9 m ahead along it
        let bi = 0, bd = 1e9; for (let i = 0; i < T.length; i++) { const d = (T[i].x - c.x) ** 2 + (T[i].z - c.z) ** 2; if (d < bd) { bd = d; bi = i; } }
        // look ahead by distance along the trail, shorter in tight bends; back up if stuck
        const ahead = Math.abs(T[Math.min(T.length - 1, bi + 4)].dx * T[bi].dz - T[Math.min(T.length - 1, bi + 4)].dz * T[bi].dx) > 0.3 ? 2 : 4;
        const tgt = T[Math.min(T.length - 1, bi + ahead)];
        const want = Math.atan2(-(tgt.x - c.x), -(tgt.z - c.z)); let e = want - c.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
        h.touch.steer = Math.max(-1, Math.min(1, e * 2.2));
        const v = vmax * (Math.abs(e) > 0.5 ? 0.6 : 1);
        h.touch.throttle = c.speed < v ? 1 : c.speed > v + 1 ? -0.3 : 0;
        if (window.__rev > 0) { window.__rev -= dt; h.touch.throttle = -1; h.touch.steer = -h.touch.steer; }
        else if (stuck > 2.2) { window.__rev = 1.4; stuck = 0; window.__revs = (window.__revs || 0) + 1; }
        if (window.__rev > 0) { window.__rev -= dt; h.touch.throttle = -1; h.touch.steer = -h.touch.steer; }
        else if (stuck > 2.2) { window.__rev = 1.4; stuck = 0; window.__revs = (window.__revs || 0) + 1; }
        if (Math.abs(c.speed) < 0.3 && !s.fade && s.phase === 'play' && !s.cutscene) stuck += dt; else stuck = 0;
        const prog = T[bi].s / L;
        if (prog >= toP || now - t0 > ms || (window.__revs || 0) > 6 || s.phase !== 'play') {
          h.touch.steer = 0; h.touch.throttle = 0;
          res({ prog: prog.toFixed(3), storeProg: s.progress.toFixed(3), crates: (s.crates || []).join(','), stuck: stuck.toFixed(1), recoveries, phase: s.phase, secs: ((now - t0) / 1000).toFixed(0), tod: h.live.env.tod.toFixed(2) });
        } else requestAnimationFrame(f);
      };
      f();
    }), toP, vmax, ms);
    console.log('trail', arg, JSON.stringify(r));
  }
  else if (cmd === "reload") { await page.reload({ waitUntil: "load" }); }
  else if (cmd === "clickSel") { const ok = await page.evaluate((q) => { const e = document.querySelector(q); if (e) { e.dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; } return false; }, arg); console.log("clickSel", arg, ok); }
  else if (cmd === "eval") console.log("eval", await page.evaluate(arg));
  else if (cmd === "fps") console.log("fps", await fps());
  else if (cmd === "state") console.log(await state());
}
console.log("--- console errors/warnings ---\n" + (logs.slice(0, 30).join("\n") || "(none)"));
await browser.close();
