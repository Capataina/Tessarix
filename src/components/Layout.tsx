import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LessonTOC } from "./LessonTOC";
import { ReadingProgress } from "./ReadingProgress";
import { TierControl } from "./TierControl";
import { SettingsButton } from "./SettingsPanel";
import { AskAboutLesson } from "./chatbot/AskAboutLesson";
import { emit as emitTelemetry } from "../lib/telemetry";

interface LayoutProps {
  children: ReactNode;
  lessonTitle?: string;
  lessonTag?: string;
  activePillar?: "teach" | "quiz" | "interview";
}

/**
 * App shell with three persistent columns: TOC | Lesson | Chat. Each sidebar
 * can be collapsed to a thin strip (38px) via its own toggle. The chat is
 * always reachable (no overlay/modal) so the reader can scroll and chat at
 * the same time.
 *
 * Wires global telemetry: scroll position (throttled to 1Hz), tier persistence
 * is handled by TierContext, and per-component events flow through `emit()`.
 */
export function Layout({
  children,
  lessonTitle,
  lessonTag,
  activePillar = "teach",
}: LayoutProps) {
  const [tocOpen, setTocOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTickRef = useRef<number | null>(null);

  const toggleToc = useCallback(() => {
    setTocOpen((o) => {
      const next = !o;
      emitTelemetry({
        kind: "panel_toggle",
        data: { panel: "toc", open: next },
      });
      return next;
    });
  }, []);

  const toggleChat = useCallback(() => {
    setChatOpen((o) => {
      const next = !o;
      emitTelemetry({
        kind: "panel_toggle",
        data: { panel: "chat", open: next },
      });
      return next;
    });
  }, []);

  // Throttled scroll telemetry — 1 event/sec while scrolling, plus a final
  // event after scroll stops.
  useEffect(() => {
    let lastEmit = 0;
    const onScroll = () => {
      lastScrollY.current = window.scrollY;
      const now = Date.now();
      if (now - lastEmit < 1000) return;
      lastEmit = now;

      // Find which heading is currently in view
      const headings = Array.from(
        document.querySelectorAll<HTMLHeadingElement>(
          ".lesson h2[id], .lesson h3[id]",
        ),
      );
      const viewportMid = window.innerHeight / 2;
      let active: string | undefined;
      for (const h of headings) {
        const r = h.getBoundingClientRect();
        if (r.top < viewportMid && r.top > -window.innerHeight) {
          active = h.id;
        }
      }

      emitTelemetry({
        kind: "scroll",
        data: {
          y: Math.round(window.scrollY),
          doc_height: Math.round(document.documentElement.scrollHeight),
          active_heading: active,
        },
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTickRef.current !== null) {
        window.cancelAnimationFrame(scrollTickRef.current);
      }
    };
  }, []);

  return (
    <div
      className="app-shell"
      data-toc-open={tocOpen ? "true" : "false"}
      data-chat-open={chatOpen ? "true" : "false"}
    >
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <span className="app-topbar__brand-mark" aria-hidden />
          <span className="app-topbar__brand-text">Tessarix</span>
        </div>

        {lessonTitle && (
          <div className="app-topbar__lesson">
            {lessonTag && (
              <span className="app-topbar__lesson-tag">{lessonTag}</span>
            )}
            <span>{lessonTitle}</span>
          </div>
        )}

        <div className="app-topbar__right">
          <TierControl />
          <SettingsButton />
          <nav className="app-topbar__pillars" aria-label="Lesson view">
            <button
              className={`app-topbar__pillar ${activePillar === "teach" ? "app-topbar__pillar--active" : ""}`}
            >
              Teach
            </button>
            <button className="app-topbar__pillar" disabled>
              Quiz
            </button>
            <button className="app-topbar__pillar" disabled>
              Interview
            </button>
          </nav>
        </div>
      </header>

      <ReadingProgress />

      <main className="app-main" ref={mainRef}>
        <aside className="app-sidebar app-sidebar--left">
          <button
            type="button"
            className="app-sidebar__toggle app-sidebar__toggle--left"
            onClick={toggleToc}
            aria-pressed={tocOpen}
            aria-label={tocOpen ? "Hide table of contents" : "Show table of contents"}
            title={tocOpen ? "Hide table of contents" : "Show table of contents"}
          >
            {tocOpen ? "‹" : "›"}
          </button>
          <div className="app-sidebar__content">
            <LessonTOC />
          </div>
        </aside>

        <article className="lesson">{children}</article>

        <aside className="app-sidebar app-sidebar--right">
          <button
            type="button"
            className="app-sidebar__toggle app-sidebar__toggle--right"
            onClick={toggleChat}
            aria-pressed={chatOpen}
            aria-label={chatOpen ? "Hide chat" : "Show chat"}
            title={chatOpen ? "Hide chat" : "Show chat"}
          >
            {chatOpen ? "›" : "‹"}
          </button>
          <div className="app-sidebar__content">
            <AskAboutLesson />
          </div>
        </aside>
      </main>
    </div>
  );
}
