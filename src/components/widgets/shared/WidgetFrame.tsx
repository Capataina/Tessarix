import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { IconButton, Tooltip, Drawer } from "../../ui";
import { extractLessonContext } from "../../../lib/llm/dom";
import { useLLMStream } from "../../../lib/llm/hooks";
import { buildWidgetMiniLessonMessages } from "../../../lib/llm/miniLesson";
import { renderMiniLessonHtml } from "../../../lib/llm/format";
import { emit as emitTelemetry } from "../../../lib/telemetry";
import type { WidgetDescriptor } from "../../../lib/widgets/descriptor";
import "./WidgetFrame.css";

interface WidgetFrameProps {
  descriptor: WidgetDescriptor;
  /** Optional current-state summary, fed to the mini-lesson for grounding. */
  stateSummary?: string;
  /** The widget's own content (visualisation + its <WidgetExplainer>). */
  children: ReactNode;
}

/** Current lesson slug from the hash, so the mini-lesson doesn't self-link. */
function currentSlug(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return /#\/lesson\/([^?]+)/.exec(window.location.hash)?.[1];
}

/**
 * The universal widget container. Every interactive widget sits inside one,
 * which gives the app coherent terminal-pane chrome, a hard containment boundary
 * (overflow:hidden — content can't escape the page), the `data-widget` /
 * `data-controls` test-discovery hooks, and the fullscreen mini-lesson.
 *
 * The mini-lesson (the `⤢` control → a draggable bottom drawer) is an *isolated
 * environment*: it renders a fresh, fully-interactive copy of the widget itself
 * alongside a streamed LLM explanation, so the reader can actually work the
 * widget while reading about it. The explanation streams token-by-token; once
 * complete, the deterministic concept-linker injects cross-lesson links into it
 * (generation separated from linking).
 */
export function WidgetFrame({ descriptor, stateSummary, children }: WidgetFrameProps) {
  const [open, setOpen] = useState(false);
  const startedRef = useRef(false);
  const { text, isStreaming, error, stream } = useLLMStream();

  const onExpand = useCallback(() => {
    setOpen(true);
    emitTelemetry({
      kind: "click",
      data: { widget: descriptor.name, target_role: "widget_fullscreen" },
    });
    if (startedRef.current) return;
    startedRef.current = true;
    const messages = buildWidgetMiniLessonMessages({
      widgetName: descriptor.name,
      widgetDescription: descriptor.description,
      howToRead: descriptor.howToRead,
      teaches: descriptor.teaches,
      lessonContext: extractLessonContext(),
      stateSummary,
    });
    void stream(messages, {
      temperature: 0.3,
      maxTokens: 700,
      telemetryFeature: "widget_mini_lesson",
    });
  }, [descriptor, stateSummary, stream]);

  // Render markdown → structured HTML on every token (so paragraphs/bold/lists
  // appear live). Concept links are injected only once the stream finishes —
  // linking mid-stream would thrash and could link a half-typed term.
  const miniHtml = useMemo(() => {
    if (!text) return null;
    return renderMiniLessonHtml(
      text,
      isStreaming ? {} : { link: true, excludeSlug: currentSlug() },
    );
  }, [text, isStreaming]);

  return (
    <figure
      className="widget-frame"
      data-widget={descriptor.name}
      data-teaches={descriptor.teaches?.join(",") || undefined}
      data-controls={descriptor.controls ? JSON.stringify(descriptor.controls) : undefined}
    >
      <figcaption className="widget-frame__head">
        <span className="widget-frame__label">{descriptor.name}</span>
        <Tooltip content="Open as an isolated mini-lesson">
          <IconButton
            aria-label={`Expand ${descriptor.name} into a mini-lesson`}
            className="widget-frame__expand"
            onClick={onExpand}
          >
            ⤢
          </IconButton>
        </Tooltip>
      </figcaption>

      {/* When expanded the widget MOVES into the drawer (a single live instance,
          not a duplicate) — rendering the same element in two slots steals the
          original's fiber and freezes its animation. The drawer overlay hides
          this empty frame while open. */}
      <div className="widget-frame__body">{open ? null : children}</div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={`${descriptor.name} — mini-lesson`}
      >
        <div className="widget-frame__mini-layout">
          {/* The interactive widget, moved here while expanded. data-vaul-no-drag
              stops the drawer's sheet-drag gesture from eating slider/canvas drags. */}
          <div className="widget-frame__mini-widget" data-vaul-no-drag>
            {open ? children : null}
          </div>

          {/* The streamed, markdown-formatted, then concept-linked explanation. */}
          <div className="widget-frame__mini">
            {error ? (
              <p className="widget-frame__mini-status">
                Couldn't generate the mini-lesson ({error}). Make sure the local
                model (Ollama) is running.
              </p>
            ) : miniHtml ? (
              <>
                <div dangerouslySetInnerHTML={{ __html: miniHtml }} />
                {isStreaming && <span className="widget-frame__caret" />}
              </>
            ) : (
              <p className="widget-frame__mini-status">Generating a mini-lesson…</p>
            )}
          </div>
        </div>
      </Drawer>
    </figure>
  );
}
