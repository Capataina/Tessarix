import { Suspense, useCallback, useEffect, useState } from "react";
import { MDXProvider } from "@mdx-js/react";
import { Layout } from "./components/Layout";
import { Catalog } from "./components/Catalog";
import { mdxComponents } from "./components/MDXComponents";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TierProvider } from "./state/TierContext";
import { SettingsProvider } from "./state/SettingsContext";
import { initTelemetry, emit as emitTelemetry } from "./lib/telemetry";
import { prewarmLLM } from "./lib/llm/prewarm";
import { findLesson, type LessonFrontmatter } from "./lessons/registry";
import "./App.css";

type Route =
  | { kind: "catalog" }
  | { kind: "lesson"; slug: string };

function parseHash(): Route {
  const raw = (window.location.hash || "").replace(/^#\/?/, "");
  if (raw.startsWith("lesson/")) {
    const slug = raw.slice("lesson/".length);
    if (slug) return { kind: "lesson", slug };
  }
  return { kind: "catalog" };
}

function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [fm, setFm] = useState<LessonFrontmatter | null>(null);

  useEffect(() => {
    initTelemetry();
    void prewarmLLM();
  }, []);

  // ─── Global focus / idle / heartbeat instrumentation ─────────────────
  // Reports window-level focus changes, idle intervals (no input/move for
  // > IDLE_THRESHOLD_MS), and a periodic session_heartbeat with cumulative
  // active/idle time. Provides the time-axis spine for any later analysis
  // of how attention is distributed across lesson sections and widgets.
  useEffect(() => {
    const IDLE_THRESHOLD_MS = 30_000;
    const HEARTBEAT_INTERVAL_MS = 30_000;
    let lastInputAt = performance.now();
    let lastBeatAt = performance.now();
    let activeMsTotal = 0;
    let idleMsTotal = 0;
    let isIdle = false;
    let isFocused = !document.hidden;

    const markInput = () => {
      const now = performance.now();
      if (isIdle) {
        const idleMs = Math.round(now - lastInputAt);
        idleMsTotal += idleMs;
        emitTelemetry({ kind: "idle_end", data: { idle_ms: idleMs } });
        isIdle = false;
      } else if (isFocused) {
        activeMsTotal += Math.round(now - lastInputAt);
      }
      lastInputAt = now;
    };

    const inputEvents = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    for (const ev of inputEvents) {
      window.addEventListener(ev, markInput, { passive: true });
    }

    const onFocus = () => {
      isFocused = true;
      lastInputAt = performance.now();
      emitTelemetry({ kind: "focus_change", data: { active: true } });
    };
    const onBlur = () => {
      isFocused = false;
      emitTelemetry({ kind: "focus_change", data: { active: false } });
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
      else onFocus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    const idleCheck = window.setInterval(() => {
      const now = performance.now();
      if (!isIdle && isFocused && now - lastInputAt > IDLE_THRESHOLD_MS) {
        isIdle = true;
        emitTelemetry({
          kind: "idle_start",
          data: { active_ms_total: Math.round(activeMsTotal) },
        });
      }
    }, 5_000);

    const heartbeat = window.setInterval(() => {
      const now = performance.now();
      const sinceLast = Math.round(now - lastBeatAt);
      lastBeatAt = now;
      emitTelemetry({
        kind: "session_heartbeat",
        data: {
          active_ms_total: Math.round(activeMsTotal),
          idle_ms_total: Math.round(idleMsTotal),
          events_emitted_total: 0,
          flushes_total: 0,
        },
      });
      void sinceLast;
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      for (const ev of inputEvents) window.removeEventListener(ev, markInput);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(idleCheck);
      window.clearInterval(heartbeat);
    };
  }, []);

  // Sync from hash → state and the reverse.
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Emit route-level lifecycle: a `route_change` on every transition, plus
  // `lesson_open` / `lesson_close` pairs that bracket the time a lesson is
  // mounted. `lesson_close` runs in the cleanup of the previous route, so
  // it carries dwell time accurately.
  useEffect(() => {
    const target =
      route.kind === "lesson" ? `#/lesson/${route.slug}` : "#/catalog";
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }, [route]);

  useEffect(() => {
    const previousLabel = (window as unknown as { __tessarixPrevRoute?: string }).__tessarixPrevRoute ?? "(init)";
    const currentLabel = route.kind === "lesson" ? `lesson/${route.slug}` : "catalog";
    emitTelemetry({
      kind: "route_change",
      data: { from: previousLabel, to: currentLabel },
    });
    (window as unknown as { __tessarixPrevRoute?: string }).__tessarixPrevRoute = currentLabel;
  }, [route]);

  // Resolve frontmatter for the active lesson.
  useEffect(() => {
    if (route.kind !== "lesson") {
      setFm(null);
      return;
    }
    const entry = findLesson(route.slug);
    if (!entry) {
      setFm(null);
      return;
    }
    let cancelled = false;
    entry.frontmatter.then((f) => {
      if (!cancelled) setFm(f);
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  // lesson_open / lesson_close lifecycle — emit when a lesson route is mounted
  // (after frontmatter resolves) and on cleanup with dwell time.
  useEffect(() => {
    if (route.kind !== "lesson" || !fm) return;
    const mountedAt = performance.now();
    const slug = route.slug;
    const prevRoute = (window as unknown as { __tessarixPrevRoute?: string }).__tessarixPrevRoute;
    emitTelemetry({
      kind: "lesson_open",
      data: {
        slug,
        title: fm.title,
        tier_initial: "standard",
        widgets_declared: fm.widgets_used ?? [],
        prerequisites_declared: fm.prerequisites,
        from_route: prevRoute,
      },
    });
    return () => {
      const dwellMs = Math.round(performance.now() - mountedAt);
      const denom = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const maxScrollPct = Math.max(
        0,
        Math.min(1, window.scrollY / denom),
      );
      emitTelemetry({
        kind: "lesson_close",
        data: {
          slug,
          dwell_ms: dwellMs,
          active_ms: dwellMs, // refined later when idle tracking lands
          max_scroll_pct: Number(maxScrollPct.toFixed(4)),
          headings_visited: [],
          widgets_engaged: [],
        },
      });
    };
  }, [route, fm]);

  const handleSelect = useCallback((slug: string) => {
    setRoute({ kind: "lesson", slug });
  }, []);

  const handleHome = useCallback(() => {
    setRoute({ kind: "catalog" });
  }, []);

  if (route.kind === "catalog") {
    return (
      <ErrorBoundary>
        <SettingsProvider>
          <TierProvider defaultTier="standard">
            <Layout
              lessonTitle="Library"
              lessonTag="Catalog"
              activePillar="teach"
              hideSidebars
            >
              <Catalog onSelect={handleSelect} />
            </Layout>
          </TierProvider>
        </SettingsProvider>
      </ErrorBoundary>
    );
  }

  const entry = findLesson(route.slug);
  if (!entry) {
    // Unknown slug → bounce to catalog.
    return (
      <ErrorBoundary>
        <SettingsProvider>
          <TierProvider defaultTier="standard">
            <Layout
              lessonTitle="Lesson not found"
              lessonTag="404"
              onBrandClick={handleHome}
              hideSidebars
            >
              <Catalog onSelect={handleSelect} />
            </Layout>
          </TierProvider>
        </SettingsProvider>
      </ErrorBoundary>
    );
  }

  const LessonComponent = entry.Component;

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <TierProvider defaultTier="standard">
          <MDXProvider components={mdxComponents}>
            <Layout
              lessonTitle={fm?.title ?? "Loading…"}
              lessonTag={fm?.tag ?? "Lesson"}
              activePillar="teach"
              onBrandClick={handleHome}
            >
              <Suspense fallback={<div className="lesson-loading">Loading…</div>}>
                <LessonComponent />
              </Suspense>
            </Layout>
          </MDXProvider>
        </TierProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
