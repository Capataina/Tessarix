/**
 * Tessarix self-audit harness — the browser-driven layers of the testing
 * framework (context/plans/testing-framework.md). Generic by construction: it
 * reads the lesson slugs from the registry and the widgets from the DOM
 * (`[data-widget]`, emitted by <WidgetFrame>), so a new lesson or widget is
 * audited with zero harness change.
 *
 * Layers, in order:
 *   - structural probes  — deterministic DOM/computed-style checks: page + widget
 *                          overflow (the leaking-donut class), invisible / low-
 *                          contrast text, NaN/undefined/Infinity in readouts
 *   - render coverage    — every lesson rendered; console + page errors collected
 *   - adaptive interaction — discover controls (range inputs + buttons) per widget,
 *                          drive them (sweep sliders, click buttons), re-probe
 *   - vision gallery     — a full-page + per-widget screenshot set for the agent
 *                          to review for design issues probes can't judge
 *
 * Self-contained: spawns `vite preview`, runs, writes e2e/output/{findings.json,
 * findings.md, screens/}, tears the server down. Probes beat screenshots for
 * structure (the Performance-Profiler lesson); vision is the agent's pass over
 * the gallery afterwards.
 *
 * Run: pnpm build && pnpm test:e2e
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 4189;
const BASE = `http://localhost:${PORT}`;
const OUT = "e2e/output";
const SCREENS = `${OUT}/screens`;

// ── discover routes from the registry (generic by construction) ──────────────
const registry = readFileSync("src/lessons/registry.ts", "utf8");
const slugs = [...registry.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const routes = ["catalog", ...slugs.map((s) => `lesson/${s}`)];

// ── in-page probe (serialised into the browser) ──────────────────────────────
function probe() {
  const out = [];
  const cls = (el) => (typeof el.className === "string" ? el.className : "");
  const docEl = document.scrollingElement || document.documentElement;
  if (docEl.scrollWidth - docEl.clientWidth > 4) {
    out.push({
      type: "page-overflow",
      severity: "high",
      detail: `page scrollWidth ${docEl.scrollWidth} > clientWidth ${docEl.clientWidth} (horizontal leak)`,
    });
  }
  const vw = window.innerWidth;
  document.querySelectorAll("[data-widget]").forEach((w) => {
    const wr = w.getBoundingClientRect();
    let worst = wr.right;
    w.querySelectorAll("*").forEach((c) => {
      const cr = c.getBoundingClientRect();
      if (cr.width > 0 && cr.right > wr.right + 1) worst = Math.max(worst, cr.right);
    });
    if (worst > wr.right + 1) {
      out.push({
        type: "widget-overflow",
        severity: "high",
        widget: w.getAttribute("data-widget"),
        detail: `content right ${Math.round(worst)}px exceeds frame right ${Math.round(wr.right)}px`,
      });
    }
    if (wr.right > vw + 1) {
      out.push({
        type: "widget-offscreen",
        severity: "high",
        widget: w.getAttribute("data-widget"),
        detail: `frame right ${Math.round(wr.right)}px exceeds viewport ${vw}px`,
      });
    }
  });
  const textEls = document.querySelectorAll(".lesson *, [data-widget] *, .graphnav *");
  textEls.forEach((el) => {
    const direct = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    if (!direct) return;
    const cs = getComputedStyle(el);
    const clipText =
      cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text";
    if ((cs.color === "rgba(0, 0, 0, 0)" || cs.color === "transparent") && !clipText) {
      out.push({
        type: "invisible-text",
        severity: "high",
        detail: `${el.tagName}.${cls(el)} has transparent text`,
        sample: el.textContent.trim().slice(0, 48),
      });
    } else if (cs.color === cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
      out.push({
        type: "low-contrast-text",
        severity: "medium",
        detail: `${el.tagName}.${cls(el)} text colour == background ${cs.color}`,
        sample: el.textContent.trim().slice(0, 48),
      });
    }
    const t = el.textContent;
    const bad = t.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    if (bad) {
      out.push({
        type: "bad-number",
        severity: "high",
        detail: `${el.tagName}.${cls(el)} shows "${bad[0]}"`,
        sample: t.trim().slice(0, 60),
      });
    }
  });
  return out;
}

function benignConsole(msg) {
  // The browser fallback can't reach Tauri IPC / Ollama; those failures are
  // environmental, not app bugs.
  return /11434|LLM HTTP|Failed to fetch|ERR_CONNECTION|net::ERR|favicon|__TAURI/i.test(
    msg,
  );
}

const sanitize = (s) => s.replace(/[^a-z0-9._-]/gi, "_");

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error("vite preview did not come up");
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SCREENS, { recursive: true });

  const server = spawn(
    "pnpm",
    ["preview", "--port", String(PORT), "--strictPort"],
    { stdio: "ignore" },
  );
  const report = { startedAt: new Date().toISOString(), routes: [] };
  let browser;
  try {
    await waitForServer(BASE);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    for (const route of routes) {
      const consoleErrors = [];
      const onConsole = (m) => {
        if (m.type() === "error" && !benignConsole(m.text())) consoleErrors.push(m.text());
      };
      const onPageErr = (e) => {
        if (!benignConsole(e.message)) consoleErrors.push(`pageerror: ${e.message}`);
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageErr);

      await page.goto(`${BASE}/#/${route}`, { waitUntil: "load" });
      await page
        .waitForSelector(".lesson, [data-widget], .graphnav", { timeout: 8000 })
        .catch(() => {});
      await sleep(900); // let widgets mount + the boot cascade settle

      const before = await page.evaluate(probe);
      const shot = `${sanitize(route)}.png`;
      await page.screenshot({ path: `${SCREENS}/${shot}`, fullPage: true });

      // per-widget screenshots
      const widgets = await page.$$("[data-widget]");
      const widgetShots = [];
      for (let i = 0; i < widgets.length; i++) {
        const name = (await widgets[i].getAttribute("data-widget")) || `w${i}`;
        const wfile = `${sanitize(route)}__${i}_${sanitize(name)}.png`;
        try {
          await widgets[i].screenshot({ path: `${SCREENS}/${wfile}` });
          widgetShots.push({ name, file: wfile });
        } catch {
          /* element not screenshottable */
        }
      }

      // adaptive interaction — drive discovered controls
      let interactions = 0;
      for (const w of widgets) {
        const ranges = await w.$$('input[type="range"]');
        for (const r of ranges) {
          for (const frac of [0, 0.5, 1]) {
            await r
              .evaluate((el, f) => {
                const min = parseFloat(el.min) || 0;
                const max = parseFloat(el.max) || 100;
                el.value = String(min + (max - min) * f);
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }, frac)
              .catch(() => {});
            interactions++;
            await sleep(50);
          }
        }
        const buttons = (await w.$$("button")).slice(0, 4);
        for (const b of buttons) {
          await b.click({ timeout: 400, force: true }).catch(() => {});
          interactions++;
          await sleep(40);
        }
      }
      await page.keyboard.press("Escape").catch(() => {}); // close any drawer opened by a click
      await sleep(200);

      const after = await page.evaluate(probe);
      // findings introduced by interaction (not present before)
      const beforeKeys = new Set(before.map((f) => JSON.stringify(f)));
      const interactionFindings = after
        .filter((f) => !beforeKeys.has(JSON.stringify(f)))
        .map((f) => ({ ...f, phase: "after-interaction" }));

      page.off("console", onConsole);
      page.off("pageerror", onPageErr);

      report.routes.push({
        route,
        widgetCount: widgets.length,
        interactions,
        structural: before,
        interactionFindings,
        consoleErrors,
        screenshot: shot,
        widgetShots,
      });
      const n = before.length + interactionFindings.length + consoleErrors.length;
      console.log(
        `  ${route.padEnd(38)} widgets:${String(widgets.length).padStart(2)} interactions:${String(interactions).padStart(3)} findings:${n}`,
      );
    }
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }

  // ── write the report ───────────────────────────────────────────────────────
  writeFileSync(`${OUT}/findings.json`, JSON.stringify(report, null, 2));
  const lines = ["# Self-audit findings", "", `Generated ${report.startedAt}`, ""];
  let total = 0;
  for (const r of report.routes) {
    const all = [...r.structural, ...r.interactionFindings];
    total += all.length + r.consoleErrors.length;
    if (all.length === 0 && r.consoleErrors.length === 0) {
      lines.push(`## ${r.route} — clean (${r.widgetCount} widgets, ${r.interactions} interactions)`);
      lines.push("");
      continue;
    }
    lines.push(`## ${r.route} — ${all.length + r.consoleErrors.length} findings (${r.widgetCount} widgets)`);
    for (const f of all) {
      lines.push(`- **[${f.severity}] ${f.type}**${f.widget ? ` (${f.widget})` : ""}${f.phase ? ` [${f.phase}]` : ""} — ${f.detail}${f.sample ? `  · "${f.sample}"` : ""}`);
    }
    for (const c of r.consoleErrors) lines.push(`- **[high] console-error** — ${c}`);
    lines.push("");
  }
  lines.unshift(`**${total} findings across ${report.routes.length} routes.**`, "");
  writeFileSync(`${OUT}/findings.md`, lines.join("\n"));
  console.log(`\n${total} findings → ${OUT}/findings.md ; gallery → ${SCREENS}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
