import { useCallback, useState, type ReactNode } from "react";
import { IconButton, Tooltip, Drawer } from "../../ui";
import { RichText } from "../../RichText";
import { extractLessonContext } from "../../../lib/llm/dom";
import { generateWidgetMiniLesson } from "../../../lib/llm/miniLesson";
import { linkConceptsToHtml } from "../../../lib/graph";
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

type MiniStatus = "idle" | "loading" | "done" | "error";

/**
 * The universal widget container. Every interactive widget sits inside one of
 * these, which gives the app three things for free:
 *
 *  - **Coherent chrome** — one hairline terminal-pane frame + mono label, so no
 *    widget styles its own outer box (consistency by construction).
 *  - **Containment** — the frame is the canonical overflow boundary; combined
 *    with styles/containment.css, widget content cannot escape its column. This
 *    is the structural fix for the "escaping box" / leaking-donut class of bug.
 *  - **The fullscreen mini-lesson** — an expand control opens a draggable bottom
 *    drawer where the LLM explains the widget (background + how-to-read), with
 *    cross-lesson links woven in by the deterministic linker. Distinct from the
 *    live state caption (<WidgetExplainer>).
 *
 * The `data-widget` / `data-teaches` / `data-controls` attributes are the test
 * harness's discovery hooks (context/plans/testing-framework.md): the harness
 * reads them to enumerate widgets and drive their declared interactions, and
 * probes the frame's bounding box for overflow.
 */
export function WidgetFrame({ descriptor, stateSummary, children }: WidgetFrameProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<MiniStatus>("idle");

  const onExpand = useCallback(() => {
    setOpen(true);
    emitTelemetry({
      kind: "click",
      data: { widget: descriptor.name, target_role: "widget_fullscreen" },
    });
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    const lessonContext = extractLessonContext();
    generateWidgetMiniLesson({
      widgetName: descriptor.name,
      widgetDescription: descriptor.description,
      howToRead: descriptor.howToRead,
      teaches: descriptor.teaches,
      lessonContext,
      stateSummary,
    })
      .then((text) => {
        // Generation is separated from linking: the model wrote plain prose;
        // we inject the cross-lesson links deterministically here.
        setContent(linkConceptsToHtml(text));
        setStatus("done");
      })
      .catch((e: unknown) => {
        setContent(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
  }, [descriptor, stateSummary, status]);

  return (
    <figure
      className="widget-frame"
      data-widget={descriptor.name}
      data-teaches={descriptor.teaches?.join(",") || undefined}
      data-controls={descriptor.controls ? JSON.stringify(descriptor.controls) : undefined}
    >
      <figcaption className="widget-frame__head">
        <span className="widget-frame__label">{descriptor.name}</span>
        <Tooltip content="Open as a full mini-lesson">
          <IconButton
            aria-label={`Expand ${descriptor.name} into a mini-lesson`}
            className="widget-frame__expand"
            onClick={onExpand}
          >
            ⤢
          </IconButton>
        </Tooltip>
      </figcaption>

      <div className="widget-frame__body">{children}</div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={`${descriptor.name} — mini-lesson`}
      >
        {status === "loading" && (
          <p className="widget-frame__mini-status">Generating a mini-lesson…</p>
        )}
        {status === "done" && (
          <div className="widget-frame__mini">
            <RichText html={content} />
          </div>
        )}
        {status === "error" && (
          <p className="widget-frame__mini-status">
            Couldn't generate the mini-lesson ({content}). Make sure the local
            model (Ollama) is running.
          </p>
        )}
      </Drawer>
    </figure>
  );
}
