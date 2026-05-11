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

  // Sync from hash → state and the reverse.
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const target =
      route.kind === "lesson" ? `#/lesson/${route.slug}` : "#/catalog";
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
    emitTelemetry({
      kind: "click",
      data: {
        widget: "router",
        target_role: "route",
        target_label: route.kind === "lesson" ? `lesson/${route.slug}` : "catalog",
      },
    });
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
