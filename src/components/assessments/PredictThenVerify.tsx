import { useState } from "react";
import { AnswerThread } from "./AnswerThread";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./PredictThenVerify.css";

interface PredictThenVerifyProps {
  /** The prompt the reader sees. */
  question: string;
  /** Two or three choices to predict between. */
  options: { id: string; label: string }[];
  /** The actual / correct answer's id. */
  truth: string;
  /** Optional index for visual continuity with other assessments. */
  index?: number;
  /**
   * Disable the auto-opening AI walk-through. Enabled by default — runs on
   * every reveal (correct or wrong prediction) grounded in the rendered lesson.
   */
  disableLlmThread?: boolean;
}

/**
 * A prediction probe: reader picks one of N options as their prediction, then
 * reveals what's actually true. After the reveal, an AI walk-through explains
 * the mechanism (and, on wrong predictions, surfaces the misconception that
 * led to the miscalibration). The point is calibrated intuition — being wrong
 * is informative.
 */
export function PredictThenVerify({
  question,
  options,
  truth,
  index,
  disableLlmThread,
}: PredictThenVerifyProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  const handlePick = (id: string) => {
    if (revealed) return;
    setPicked(id);
    const label = options.find((o) => o.id === id)?.label ?? id;
    emitTelemetry({
      kind: "answer_select",
      data: { widget: "ptv", index, question, picked_id: id, picked_label: label },
    });
  };

  const handleReveal = () => {
    if (picked) {
      setRevealed(true);
      emitTelemetry({
        kind: "answer_reveal",
        data: {
          widget: "ptv",
          index,
          question,
          picked_id: picked,
          correct_id: truth,
          is_correct: picked === truth,
        },
      });
      if (!disableLlmThread) {
        setThreadOpen(true);
      }
    }
  };

  const handleReset = () => {
    emitTelemetry({
      kind: "answer_reset",
      data: { widget: "ptv", index, question },
    });
    setPicked(null);
    setRevealed(false);
    setThreadOpen(false);
  };

  return (
    <div className="ptv">
      <header className="ptv__header">
        {index !== undefined && (
          <span className="ptv__index">Q{String(index).padStart(2, "0")}</span>
        )}
        <span className="ptv__label">
          <span className="ptv__label-icon" aria-hidden>◇</span> Predict
        </span>
      </header>

      <div className="ptv__question">{question}</div>

      <div className="ptv__options">
        {options.map((opt) => {
          const isPicked = picked === opt.id;
          const isTruth = opt.id === truth;
          let cls = "ptv__option";
          if (revealed) {
            if (isTruth) cls += " ptv__option--truth";
            else if (isPicked) cls += " ptv__option--wrong";
            else cls += " ptv__option--faded";
          } else if (isPicked) {
            cls += " ptv__option--picked";
          }
          return (
            <button
              key={opt.id}
              type="button"
              className={cls}
              onClick={() => handlePick(opt.id)}
              disabled={revealed}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="ptv__actions">
        {!revealed ? (
          <button
            type="button"
            className="ptv__btn ptv__btn--primary"
            onClick={handleReveal}
            disabled={picked === null}
          >
            Reveal the answer
          </button>
        ) : (
          <button type="button" className="ptv__btn" onClick={handleReset}>
            Predict again
          </button>
        )}
      </div>

      {threadOpen && picked && (
        <AnswerThread
          question={question}
          options={options}
          correctId={truth}
          pickedId={picked}
          onClose={() => setThreadOpen(false)}
        />
      )}
    </div>
  );
}
