import { useState } from "react";
import { AnswerThread } from "./AnswerThread";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./MultipleChoice.css";

export interface MultipleChoiceOption {
  id: string;
  label: string;
}

interface MultipleChoiceProps {
  question: string;
  options: MultipleChoiceOption[];
  correctId: string;
  /** Question number shown as a small chip. */
  index?: number;
  /**
   * Disable the auto-opening AI walk-through thread for this question.
   * The thread is enabled by default and runs on every reveal (correct or wrong),
   * grounded in lesson context auto-extracted from the rendered DOM.
   */
  disableLlmThread?: boolean;
}

export function MultipleChoice({
  question,
  options,
  correctId,
  index,
  disableLlmThread,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  const handleSelect = (id: string) => {
    if (revealed) return;
    setSelected(id);
    const label = options.find((o) => o.id === id)?.label ?? id;
    emitTelemetry({
      kind: "answer_select",
      data: { widget: "mc", index, question, picked_id: id, picked_label: label },
    });
  };

  const handleReveal = () => {
    if (selected !== null) {
      setRevealed(true);
      emitTelemetry({
        kind: "answer_reveal",
        data: {
          widget: "mc",
          index,
          question,
          picked_id: selected,
          correct_id: correctId,
          is_correct: selected === correctId,
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
      data: { widget: "mc", index, question },
    });
    setSelected(null);
    setRevealed(false);
    setThreadOpen(false);
  };

  return (
    <div className="mc">
      {typeof index === "number" && (
        <div className="mc__index">Q{String(index).padStart(2, "0")}</div>
      )}
      <div className="mc__question">{question}</div>

      <div className="mc__options" role="radiogroup">
        {options.map((opt, i) => {
          const isSelected = selected === opt.id;
          const isCorrect = opt.id === correctId;
          // Letter marker by position — A, B, C, D, ... — independent of
          // the option's internal `id`. Semantic IDs (e.g. "wrong-arch")
          // should never bleed into the visible UI.
          const letter = String.fromCharCode(65 + i);
          let state = "";
          if (revealed) {
            if (isCorrect) state = "mc__option--correct";
            else if (isSelected) state = "mc__option--wrong";
          } else if (isSelected) {
            state = "mc__option--selected";
          }
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`mc__option ${state}`}
              onClick={() => handleSelect(opt.id)}
              disabled={revealed}
            >
              <span className="mc__option-marker">
                {revealed && isCorrect ? "✓" : revealed && isSelected ? "✗" : letter}
              </span>
              <span className="mc__option-label">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mc__actions">
        {!revealed && (
          <button
            type="button"
            className="mc__btn mc__btn--primary"
            onClick={handleReveal}
            disabled={selected === null}
          >
            Check answer
          </button>
        )}
        {revealed && (
          <button type="button" className="mc__btn" onClick={handleReset}>
            Try again
          </button>
        )}
      </div>

      {threadOpen && selected && (
        <AnswerThread
          question={question}
          options={options}
          correctId={correctId}
          pickedId={selected}
          onClose={() => setThreadOpen(false)}
        />
      )}
    </div>
  );
}
