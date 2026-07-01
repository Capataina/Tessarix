/**
 * "Explain here" — select text in a lesson, right-click → Explain here, and a
 * bottom drawer streams a grounded explanation of the selection in the context
 * of its passage + the lesson, which you can then chat over with follow-ups.
 *
 * One instance is mounted per lesson (in Layout). It owns a global contextmenu
 * listener (intercepted only for a real selection inside `.lesson`), the custom
 * menu, and the drawer. Reuses the same vaul Drawer as the widget mini-lesson,
 * the high-priority LLM path, and the generation-then-linking formatter.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "./ui";
import { RichText } from "./RichText";
import { useLLMStream } from "../lib/llm/hooks";
import { extractLessonContext } from "../lib/llm/dom";
import { buildExplainMessages, buildExplainFollowupMessages } from "../lib/llm/explain";
import { renderMiniLessonHtml } from "../lib/llm/format";
import type { ChatMessage } from "../lib/llm/types";
import "./ExplainHere.css";

function currentSlug(): string | undefined {
  const raw = (window.location.hash || "").replace(/^#\/?/, "");
  return raw.startsWith("lesson/") ? raw.slice("lesson/".length).split("?")[0] : undefined;
}

interface Capture {
  selection: string;
  passage: string;
}
interface Menu {
  x: number;
  y: number;
  capture: Capture;
}
type Turn = { role: "user" | "assistant"; content: string };

export function ExplainHere() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null); // drawer open ⇔ non-null

  // Intercept right-click only when there's a real text selection inside a lesson.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (text.length < 2) return;
      const node = sel?.anchorNode ?? null;
      const el = (node && node.nodeType === 1 ? node : node?.parentElement) as HTMLElement | null;
      if (!el?.closest(".lesson")) return;
      e.preventDefault();
      const block = el.closest("p, li, h1, h2, h3, h4, td, blockquote");
      const passage = block?.textContent?.trim() || text;
      setMenu({ x: e.clientX, y: e.clientY, capture: { selection: text, passage } });
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  // Dismiss the menu on any outside interaction.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);

  const openDrawer = useCallback(() => {
    setMenu((m) => {
      if (m) setCapture(m.capture);
      return null;
    });
  }, []);

  return (
    <>
      {menu &&
        createPortal(
          <div
            className="explain-menu"
            style={{ left: menu.x, top: menu.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" className="explain-menu__item" onClick={openDrawer}>
              ✦ Explain here
            </button>
          </div>,
          document.body,
        )}
      {capture && <ExplainDrawer capture={capture} onClose={() => setCapture(null)} />}
    </>
  );
}

function ExplainDrawer({ capture, onClose }: { capture: Capture; onClose: () => void }) {
  const { text: explanation, isStreaming: explaining, stream: streamExplain } = useLLMStream();
  const {
    text: answer,
    isStreaming: answering,
    stream: streamAnswer,
    reset: resetAnswer,
  } = useLLMStream();
  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const startedRef = useRef(false);
  const slug = currentSlug();

  // Fire the initial explanation once, when the drawer opens.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const lessonContext = extractLessonContext();
    void streamExplain(
      buildExplainMessages({ selection: capture.selection, passage: capture.passage, lessonContext }),
      { temperature: 0.3, maxTokens: 500, telemetryFeature: "explain_here", priority: "high" },
    );
  }, [capture, streamExplain]);

  // Commit a finished follow-up answer onto the thread.
  useEffect(() => {
    if (!answering && answer.length > 0) {
      setThread((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.content === answer) return prev;
        return [...prev, { role: "assistant", content: answer }];
      });
      resetAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answering]);

  const ask = useCallback(() => {
    const q = input.trim();
    if (!q || answering || explaining) return;
    setInput("");
    setThread((prev) => [...prev, { role: "user", content: q }]);
    const lessonContext = extractLessonContext();
    const history: ChatMessage[] = thread.map((t) => ({ role: t.role, content: t.content }));
    void streamAnswer(
      buildExplainFollowupMessages({
        selection: capture.selection,
        lessonContext,
        explanation,
        history,
        question: q,
      }),
      { temperature: 0.3, maxTokens: 400, telemetryFeature: "explain_here", priority: "high" },
    );
  }, [input, answering, explaining, thread, capture, explanation, streamAnswer]);

  // Markdown → HTML; concept links injected once the stream settles (not mid-stream).
  const explanationHtml = useMemo(
    () => (explanation ? renderMiniLessonHtml(explanation, explaining ? {} : { link: true, excludeSlug: slug }) : ""),
    [explanation, explaining, slug],
  );

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title="Explain here">
      <div className="explain">
        <blockquote className="explain__selection">{capture.selection}</blockquote>

        <div className="explain__answer">
          {explanation ? (
            <RichText html={explanationHtml} />
          ) : (
            <span className="explain__thinking">Reading the passage…</span>
          )}
          {explaining && <span className="explain__caret" />}
        </div>

        {thread.map((t, i) => (
          <div key={i} className={`explain__turn explain__turn--${t.role}`}>
            {t.role === "user" ? (
              t.content
            ) : (
              <RichText html={renderMiniLessonHtml(t.content, { link: true, excludeSlug: slug })} />
            )}
          </div>
        ))}

        {answering && answer.length > 0 && (
          <div className="explain__turn explain__turn--assistant">
            <RichText text={answer} />
            <span className="explain__caret" />
          </div>
        )}

        <div className="explain__ask">
          <textarea
            className="explain__input"
            value={input}
            placeholder="Ask a follow-up…"
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
          <button
            type="button"
            className="explain__send"
            onClick={ask}
            disabled={!input.trim() || answering || explaining}
          >
            Ask
          </button>
        </div>
      </div>
    </Drawer>
  );
}
