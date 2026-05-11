import { useEffect } from "react";
import { MDXProvider } from "@mdx-js/react";
import { Layout } from "./components/Layout";
import { mdxComponents } from "./components/MDXComponents";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TierProvider } from "./state/TierContext";
import { SettingsProvider } from "./state/SettingsContext";
import { initTelemetry } from "./lib/telemetry";
import { prewarmLLM } from "./lib/llm/prewarm";
import AfineLesson, { frontmatter } from "./lessons/afine.mdx";
import "./App.css";

interface LessonFrontmatter {
  title?: string;
  tag?: string;
  last_updated?: string;
  tags?: string[];
  widgets_used?: string[];
  prerequisites?: string[];
  estimated_time?: string;
}

function App() {
  const fm = (frontmatter ?? {}) as LessonFrontmatter;

  useEffect(() => {
    initTelemetry();
    // Pre-warm the local LLM so the first WidgetExplainer doesn't pay the
    // cold-start cost. Fire-and-forget; failure is silent because the real
    // widget calls will surface any actual outage.
    void prewarmLLM();
  }, []);

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <TierProvider defaultTier="standard">
          <MDXProvider components={mdxComponents}>
            <Layout
              lessonTitle={fm.title ?? "Untitled lesson"}
              lessonTag={fm.tag ?? "Lesson"}
              activePillar="teach"
            >
              <AfineLesson />
            </Layout>
          </MDXProvider>
        </TierProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
