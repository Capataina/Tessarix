import { useCallback, useMemo, useState, type ReactNode } from "react";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./GoalChain.css";

export interface GoalChainStep {
  /** Goal statement shown to the reader for this step. */
  goal: string;
  /**
   * Predicate over the widget's current state. Returns true when the goal is
   * met. The state shape is whatever the wrapped widget reports through its
   * `onStateChange` callback.
   */
  check: (state: Record<string, number>) => boolean;
  /**
   * Optional explanation revealed when the step is solved. Used to anchor what
   * the reader just demonstrated; the in-widget WidgetExplainer handles the
   * live commentary while they explore.
   */
  explanation?: string;
}

interface GoalChainProps {
  /** Ordered sequence of steps. */
  steps: GoalChainStep[];
  /**
   * Widget render prop. Receives a callback to wire onto the widget's
   * `onStateChange` so the chain can evaluate step predicates.
   *
   * Example:
   *   render={onChange => <MetricComparison onStateChange={onChange} />}
   */
  render: (onStateChange: (state: Record<string, number>) => void) => ReactNode;
  /** Optional index for visual cohesion with other assessment widgets. */
  index?: number;
  /** Optional title shown above the step list. */
  title?: string;
}

export function GoalChain({ steps, render, index, title }: GoalChainProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [solvedIndices, setSolvedIndices] = useState<number[]>([]);
  const [latestState, setLatestState] = useState<Record<string, number>>({});

  const handleStateChange = useCallback(
    (state: Record<string, number>) => {
      setLatestState(state);
      const step = steps[activeIdx];
      if (!step) return;
      if (step.check(state) && !solvedIndices.includes(activeIdx)) {
        const next = [...solvedIndices, activeIdx];
        setSolvedIndices(next);
        emitTelemetry({
          kind: "goal_solved",
          data: {
            index,
            goal: step.goal,
            final_state: state,
          },
        });
      }
    },
    [steps, activeIdx, solvedIndices, index],
  );

  const handleAdvance = useCallback(() => {
    if (activeIdx < steps.length - 1) {
      setActiveIdx((i) => i + 1);
    }
  }, [activeIdx, steps.length]);

  const handleRetry = useCallback(() => {
    setSolvedIndices((prev) => prev.filter((i) => i !== activeIdx));
  }, [activeIdx]);

  const activeStep = steps[activeIdx];
  const activeSolved = solvedIndices.includes(activeIdx);
  const isLast = activeIdx === steps.length - 1;
  const allSolved = solvedIndices.length === steps.length;

  const progressDots = useMemo(
    () =>
      steps.map((_, i) => {
        const solved = solvedIndices.includes(i);
        const active = i === activeIdx;
        return {
          i,
          state: solved ? "solved" : active ? "active" : "locked",
        };
      }),
    [steps, activeIdx, solvedIndices],
  );

  return (
    <div
      className={`goal-chain ${index !== undefined ? "goal-chain--with-index" : ""}`}
    >
      <header className="goal-chain__header">
        {index !== undefined && (
          <span className="goal-chain__index">
            Q{String(index).padStart(2, "0")}
          </span>
        )}
        <div className="goal-chain__header-text">
          {title ? <div className="goal-chain__title">{title}</div> : null}
          <div className="goal-chain__progress" aria-label="Step progress">
            {progressDots.map((d) => (
              <span
                key={d.i}
                className={`goal-chain__dot goal-chain__dot--${d.state}`}
                aria-label={`Step ${d.i + 1} ${d.state}`}
              />
            ))}
            <span className="goal-chain__progress-text">
              Step {activeIdx + 1} of {steps.length}
            </span>
          </div>
        </div>
      </header>

      <div className="goal-chain__widget">{render(handleStateChange)}</div>

      <section className="goal-chain__step">
        <div className="goal-chain__step-head">
          <span className="goal-chain__step-label">
            <span className="goal-chain__step-icon" aria-hidden>
              ◆
            </span>{" "}
            Goal {activeIdx + 1}
          </span>
          <span
            className={`goal-chain__step-status ${
              activeSolved ? "goal-chain__step-status--solved" : ""
            }`}
            aria-live="polite"
          >
            {activeSolved ? "✓ Solved" : "Try the controls"}
          </span>
        </div>
        <p className="goal-chain__step-goal">{activeStep.goal}</p>

        {activeSolved && activeStep.explanation && (
          <p className="goal-chain__step-explanation">
            {activeStep.explanation}
          </p>
        )}

        {activeSolved && !isLast && (
          <button
            type="button"
            className="goal-chain__advance"
            onClick={handleAdvance}
          >
            Next goal →
          </button>
        )}

        {activeSolved && (
          <button
            type="button"
            className="goal-chain__retry"
            onClick={handleRetry}
          >
            Try this goal again
          </button>
        )}
      </section>

      {/* Locked future steps shown as previews so the reader sees the arc */}
      {steps
        .slice(activeIdx + 1)
        .filter(() => !allSolved)
        .map((s, offset) => (
          <div
            key={activeIdx + 1 + offset}
            className="goal-chain__step goal-chain__step--locked"
          >
            <div className="goal-chain__step-head">
              <span className="goal-chain__step-label">
                <span className="goal-chain__step-icon" aria-hidden>
                  ◇
                </span>{" "}
                Goal {activeIdx + 2 + offset}
              </span>
              <span className="goal-chain__step-status">Locked</span>
            </div>
            <p className="goal-chain__step-goal">{s.goal}</p>
          </div>
        ))}

      {allSolved && (
        <div className="goal-chain__complete" role="status">
          <span className="goal-chain__complete-icon" aria-hidden>
            ✓
          </span>{" "}
          All {steps.length} goals cleared. {latestState ? null : null}
        </div>
      )}
    </div>
  );
}
