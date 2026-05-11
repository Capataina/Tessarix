import { useCallback, useRef, useState, type ReactNode } from "react";
import { useLLMJson } from "../../lib/llm/hooks";
import { extractLessonContext } from "../../lib/llm/dom";
import {
  buildTieredHintsMessages,
  TIERED_HINTS_SCHEMA,
  type TieredHintsResponse,
} from "../../lib/llm/prompts";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./GoalDrivenWrapper.css";

interface GoalDrivenWrapperProps {
  /** The goal statement shown to the reader. */
  goal: string;
  /**
   * Predicate over the child widget's state. Returns true when the goal is met.
   * The state shape depends on the widget being wrapped.
   */
  check: (state: Record<string, number>) => boolean;
  /**
   * Optional static fallback hint. Used only when LLM hints are explicitly
   * disabled. By default the wrapper generates 3 tiered hints via the LLM,
   * using lesson context auto-extracted from the rendered DOM.
   */
  hint?: string;
  /** Disable LLM tiered hints and fall back to the static `hint` prop. */
  disableLlmHints?: boolean;
  /**
   * Function that takes a callback (called with the widget's current state)
   * and returns the wrapped widget.
   *
   * Example:
   *   <GoalDrivenWrapper
   *     goal="Set k so..."
   *     check={s => s.k > 0.8}
   *     render={onChange => <FunctionGrapher onParamsChange={onChange} ... />}
   *   />
   */
  render: (onStateChange: (state: Record<string, number>) => void) => ReactNode;
  /** Optional question index for visual cohesion with MCQ. */
  index?: number;
}

export function GoalDrivenWrapper({
  goal,
  check,
  hint,
  disableLlmHints,
  render,
  index,
}: GoalDrivenWrapperProps) {
  const [solved, setSolved] = useState(false);
  const [showStaticHint, setShowStaticHint] = useState(false);
  const [revealedLevels, setRevealedLevels] = useState(0); // 0 = none, 1/2/3 = hint level shown
  const [widgetState, setWidgetState] = useState<Record<string, number>>({});

  const {
    data: hintsData,
    loading: hintsLoading,
    error: hintsError,
    run: requestHints,
  } = useLLMJson<TieredHintsResponse>();

  const requestedRef = useRef(false);

  const handleStateChange = useCallback(
    (state: Record<string, number>) => {
      setWidgetState(state);
      const nowSolved = check(state);
      if (!solved && nowSolved) {
        setSolved(true);
        emitTelemetry({
          kind: "goal_solved",
          data: { index, goal, final_state: state },
        });
      } else if (solved && !nowSolved) {
        setSolved(false);
      }
    },
    [check, solved, index, goal],
  );

  // LLM-mode: when the reader first asks for a hint, fetch all 3 levels.
  // Lesson context is auto-extracted from the rendered DOM at call time.
  // The static `hint` prop, when provided, is passed as the AUTHORITATIVE
  // solution that the LLM must align its three progressive hints toward —
  // this anchors small models that might otherwise pick the wrong parameter
  // from ambiguous lesson context.
  const requestLLMHints = useCallback(async () => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    const currentStateSummary = Object.entries(widgetState)
      .map(([k, v]) => `${k} = ${typeof v === "number" ? v.toFixed(3) : v}`)
      .join(", ") || "(no parameters changed yet)";
    const lessonContext = extractLessonContext();
    const messages = buildTieredHintsMessages({
      sectionContext: lessonContext,
      goal,
      currentState: currentStateSummary,
      solutionHint: hint,
    });
    try {
      await requestHints(messages, TIERED_HINTS_SCHEMA, {
        temperature: 0.3,
        maxTokens: 500,
        telemetryFeature: "tiered_hints",
      });
    } catch {
      // Error state surfaced via hintsError; UI shows fallback.
      requestedRef.current = false;
    }
  }, [widgetState, goal, hint, requestHints]);

  // Bump the revealed level. Lazy-fetches on first click.
  const handleUnlockNext = useCallback(async () => {
    if (revealedLevels === 0 && !hintsData) {
      await requestLLMHints();
    }
    setRevealedLevels((n) => {
      const next = Math.min(3, n + 1);
      if (next > n) {
        emitTelemetry({
          kind: "hint_unlock",
          data: { index, goal, level: next as 1 | 2 | 3 },
        });
      }
      return next;
    });
  }, [revealedLevels, hintsData, requestLLMHints, index, goal]);

  // The hints actually shown — slice of all 3 by revealed count.
  const visibleHints =
    hintsData?.hints?.slice(0, revealedLevels) ?? [];

  // LLM mode is the default. Static `hint` prop is fallback when disabled.
  const llmMode = !disableLlmHints;

  return (
    <div
      className={`gdw ${solved ? "gdw--solved" : ""} ${index !== undefined ? "gdw--with-index" : ""}`}
    >
      <header className="gdw__header">
        {index !== undefined && (
          <span className="gdw__index">Q{String(index).padStart(2, "0")}</span>
        )}
        <div className="gdw__goal">
          <span className="gdw__goal-label">
            <span className="gdw__goal-icon" aria-hidden>◆</span> Goal
          </span>
          <span className="gdw__goal-text">{goal}</span>
        </div>
        <div
          className={`gdw__status ${solved ? "gdw__status--solved" : ""}`}
          aria-live="polite"
        >
          {solved ? "✓ Goal met" : "Try the controls"}
        </div>
      </header>

      <div className="gdw__widget">{render(handleStateChange)}</div>

      {/* LLM-driven tiered hints */}
      {llmMode && (
        <div className="gdw__hint-wrapper">
          {visibleHints.length > 0 && (
            <ol className="gdw__hints">
              {visibleHints.map((h) => (
                <li key={h.level} className={`gdw__hint gdw__hint--level-${h.level}`}>
                  <span className="gdw__hint-level">
                    Hint {h.level} of 3
                  </span>
                  <p>{h.text}</p>
                </li>
              ))}
            </ol>
          )}

          {hintsError && (
            <div className="gdw__hint-error">
              Couldn't generate a hint right now ({hintsError}). Try the controls anyway.
            </div>
          )}

          {revealedLevels < 3 && !hintsError && (
            <button
              type="button"
              className="gdw__hint-btn"
              onClick={handleUnlockNext}
              disabled={hintsLoading}
            >
              {hintsLoading
                ? "Thinking..."
                : revealedLevels === 0
                ? "Stuck? Show a hint"
                : revealedLevels === 1
                ? "Show next hint"
                : "Show final hint"}
            </button>
          )}

          {revealedLevels === 3 && !solved && (
            <div className="gdw__hint-foot">
              That's all the hints. Try the controls.
            </div>
          )}
        </div>
      )}

      {/* Static fallback (only when llmContext not provided) */}
      {!llmMode && hint && (
        <div className="gdw__hint-wrapper">
          {!showStaticHint ? (
            <button
              type="button"
              className="gdw__hint-btn"
              onClick={() => setShowStaticHint(true)}
            >
              Stuck? Show a hint
            </button>
          ) : (
            <div className="gdw__hint gdw__hint--static">
              <span className="gdw__hint-level">Hint</span>
              <p>{hint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
