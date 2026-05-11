import { useState, type ReactNode } from "react";
import { AnswerThread } from "./AnswerThread";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./ClickableHotspot.css";

interface Hotspot {
  id: string;
  label: string;
  /** True if this is the correct target. */
  correct: boolean;
}

interface ClickableHotspotProps {
  question: string;
  hotspots: Hotspot[];
  index?: number;
  /** Optional context block above the question. */
  context?: ReactNode;
  /**
   * Disable the auto-opening AI walk-through thread for this question.
   * The thread is enabled by default and runs on every click (correct or wrong),
   * grounded in lesson context auto-extracted from the rendered DOM.
   */
  disableLlmThread?: boolean;
}

/**
 * Diagnostic spatial reasoning probe. Presents a row of hotspots; the reader
 * clicks the one they think is correct. Right answer turns green; wrong
 * answer turns red. An AI walk-through opens below on every click, grounded
 * in the surrounding lesson content.
 */
export function ClickableHotspot({
  question,
  hotspots,
  index,
  context,
  disableLlmThread,
}: ClickableHotspotProps) {
  const [clicked, setClicked] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);

  const handleClick = (id: string) => {
    if (clicked) return;
    setClicked(id);
    const hit = hotspots.find((h) => h.id === id);
    const label = hit?.label ?? id;
    emitTelemetry({
      kind: "answer_select",
      data: { widget: "hotspot", index, question, picked_id: id, picked_label: label },
    });
    const correctHotspotId = hotspots.find((h) => h.correct)?.id ?? "";
    emitTelemetry({
      kind: "answer_reveal",
      data: {
        widget: "hotspot",
        index,
        question,
        picked_id: id,
        correct_id: correctHotspotId,
        is_correct: hit?.correct ?? false,
      },
    });
    if (!disableLlmThread) {
      setThreadOpen(true);
    }
  };

  const handleReset = () => {
    emitTelemetry({
      kind: "answer_reset",
      data: { widget: "hotspot", index, question },
    });
    setClicked(null);
    setThreadOpen(false);
  };

  const isCorrect = clicked
    ? hotspots.find((h) => h.id === clicked)?.correct
    : false;

  // Map hotspots into the option shape AnswerThread expects.
  const correctHotspot = hotspots.find((h) => h.correct);
  const threadOptions = hotspots.map((h) => ({ id: h.id, label: h.label }));
  const threadCorrectId = correctHotspot?.id ?? hotspots[0]?.id ?? "";

  return (
    <div className="hotspot">
      <header className="hotspot__header">
        {index !== undefined && (
          <span className="hotspot__index">Q{String(index).padStart(2, "0")}</span>
        )}
        <span className="hotspot__label">
          <span className="hotspot__label-icon" aria-hidden>◈</span> Pick
        </span>
      </header>

      <div className="hotspot__question">{question}</div>

      {context && <div className="hotspot__context">{context}</div>}

      <div className="hotspot__grid">
        {hotspots.map((h) => {
          const isClicked = clicked === h.id;
          let cls = "hotspot__option";
          if (clicked) {
            if (h.correct) cls += " hotspot__option--correct-shown";
            if (isClicked && !h.correct) cls += " hotspot__option--wrong";
            if (isClicked && h.correct) cls += " hotspot__option--correct";
            if (!isClicked && !h.correct) cls += " hotspot__option--faded";
          }
          return (
            <button
              key={h.id}
              type="button"
              className={cls}
              onClick={() => handleClick(h.id)}
              disabled={clicked !== null}
            >
              {h.label}
            </button>
          );
        })}
      </div>

      {clicked && (
        <div className="hotspot__actions">
          <button
            type="button"
            className="hotspot__retry"
            onClick={handleReset}
          >
            {isCorrect ? "Reset" : "Try again"}
          </button>
        </div>
      )}

      {threadOpen && clicked && (
        <AnswerThread
          question={question}
          options={threadOptions}
          correctId={threadCorrectId}
          pickedId={clicked}
          onClose={() => setThreadOpen(false)}
        />
      )}
    </div>
  );
}
