import { useCallback, useEffect, useRef, useState } from "react";
import { useLLMStream } from "../../lib/llm/hooks";
import { extractLessonContext } from "../../lib/llm/dom";
import {
  buildAnswerThreadCorrection,
  buildAnswerThreadFollowup,
  buildAnswerThreadTurn1,
} from "../../lib/llm/prompts";
import type { ChatMessage } from "../../lib/llm/types";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./AnswerThread.css";

interface AnswerThreadProps {
  /** The question text the student answered. */
  question: string;
  /** Full option list (id + display label). */
  options: { id: string; label: string }[];
  /** Id of the correct option. */
  correctId: string;
  /** Id of the option the student picked (may equal correctId). */
  pickedId: string;
  /** Called when the student dismisses the thread. */
  onClose?: () => void;
}

type Phase =
  | "loading-turn-1"
  | "waiting-reasoning"
  | "loading-turn-3"
  | "idle"
  | "loading-followup"
  | "closed";

interface ThreadEntry {
  role: "assistant" | "user";
  content: string;
}

const FOLLOWUP_CAP = 3;

/**
 * AI-driven walk-through that fires on every assessment reveal — whether the
 * student picked correctly or wrong. Behaviour differs slightly between the
 * two cases:
 *
 * - **Correct**: Turn 1 affirms + explains why. No reasoning textarea required;
 *   reader goes straight to optional follow-ups.
 * - **Wrong**: Turn 1 explains misconception + asks "what were you thinking";
 *   reader types reasoning → Turn 3 tailored correction → follow-ups.
 *
 * The Turn 1 prompt adapts based on `correctId === pickedId`. The rest of the
 * machinery (history threading, streaming display) is shared.
 */
export function AnswerThread({
  question,
  options,
  correctId,
  pickedId,
  onClose,
}: AnswerThreadProps) {
  const [entries, setEntries] = useState<ThreadEntry[]>([]);
  const isCorrect = pickedId === correctId;
  // For correct picks, Turn 1 is followed directly by "idle" (follow-ups only).
  // For wrong picks, Turn 1 is followed by "waiting-reasoning" (textarea).
  const [phase, setPhase] = useState<Phase>("loading-turn-1");
  const [input, setInput] = useState("");
  const [followupCount, setFollowupCount] = useState(0);

  const {
    text: streamText,
    isStreaming,
    error,
    stream,
    reset: resetStream,
  } = useLLMStream();

  const startedRef = useRef(false);
  const consumedRef = useRef<string>("");
  // Snapshot the lesson context once when the thread opens so follow-up turns
  // see the same content even if the user changes tier mid-conversation.
  const lessonContextRef = useRef<string>("");

  const pickedLabel = options.find((o) => o.id === pickedId)?.label ?? pickedId;
  const correctLabel =
    options.find((o) => o.id === correctId)?.label ?? correctId;

  // Auto-fire Turn 1 on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    consumedRef.current = "";
    lessonContextRef.current = extractLessonContext();
    emitTelemetry({
      kind: "thread_open",
      data: { widget: "mc", question, is_correct: isCorrect },
    });
    const messages = buildAnswerThreadTurn1({
      sectionContext: lessonContextRef.current,
      question,
      options,
      correctId,
      pickedId,
    });
    void stream(messages, {
      temperature: 0.3,
      maxTokens: 260,
      telemetryFeature: "answer_thread",
      telemetryTurn: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the active stream finishes, push it into the thread and advance phase.
  useEffect(() => {
    if (!isStreaming && streamText && streamText !== consumedRef.current) {
      const completed = streamText;
      consumedRef.current = completed;
      setEntries((e) => [...e, { role: "assistant", content: completed }]);
      setPhase((p) => {
        if (p === "loading-turn-1") {
          // Correct picks skip the reasoning step entirely.
          return isCorrect ? "idle" : "waiting-reasoning";
        }
        if (p === "loading-turn-3") return "idle";
        if (p === "loading-followup") return "idle";
        return p;
      });
    }
  }, [isStreaming, streamText, isCorrect]);

  const handleSubmitReasoning = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || phase !== "waiting-reasoning") return;

    const newEntries: ThreadEntry[] = [
      ...entries,
      { role: "user", content: trimmed },
    ];
    setEntries(newEntries);
    setInput("");
    setPhase("loading-turn-3");

    const history: ChatMessage[] = entries.map((e) => ({
      role: e.role,
      content: e.content,
    }));

    consumedRef.current = "";
    resetStream();

    emitTelemetry({
      kind: "thread_user_reasoning",
      data: { question, reasoning_length: trimmed.length },
    });

    const messages = buildAnswerThreadCorrection({
      sectionContext: lessonContextRef.current,
      question,
      correctLabel,
      pickedLabel,
      studentReasoning: trimmed,
      history,
    });
    void stream(messages, {
      temperature: 0.3,
      maxTokens: 300,
      telemetryFeature: "answer_thread",
      telemetryTurn: 3,
    });
  }, [
    input,
    entries,
    isStreaming,
    phase,
    question,
    correctLabel,
    pickedLabel,
    resetStream,
    stream,
  ]);

  const handleSubmitFollowup = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || phase !== "idle") return;
    if (followupCount >= FOLLOWUP_CAP) return;

    const newEntries: ThreadEntry[] = [
      ...entries,
      { role: "user", content: trimmed },
    ];
    setEntries(newEntries);
    setInput("");
    setPhase("loading-followup");
    setFollowupCount((n) => n + 1);

    consumedRef.current = "";
    resetStream();

    emitTelemetry({
      kind: "thread_followup",
      data: {
        question,
        followup_length: trimmed.length,
        followup_index: followupCount,
      },
    });

    const history: ChatMessage[] = newEntries.map((e) => ({
      role: e.role,
      content: e.content,
    }));
    const messages = buildAnswerThreadFollowup(
      history,
      trimmed,
      lessonContextRef.current,
    );
    void stream(messages, {
      temperature: 0.3,
      maxTokens: 280,
      telemetryFeature: "answer_thread",
      telemetryTurn: 4 + followupCount,
    });
  }, [
    input,
    entries,
    isStreaming,
    phase,
    followupCount,
    question,
    resetStream,
    stream,
  ]);

  const handleClose = useCallback(() => {
    emitTelemetry({
      kind: "thread_close",
      data: {
        question,
        turn_count: entries.filter((e) => e.role === "assistant").length,
        followups_used: followupCount,
      },
    });
    setPhase("closed");
    onClose?.();
  }, [onClose, question, entries, followupCount]);

  if (phase === "closed") return null;

  const showStudentInput = phase === "waiting-reasoning";
  const showFollowupInput = phase === "idle" && followupCount < FOLLOWUP_CAP;
  const showStreaming =
    (phase === "loading-turn-1" ||
      phase === "loading-turn-3" ||
      phase === "loading-followup") &&
    (isStreaming || streamText);

  return (
    <section className="wat" aria-label="AI walk-through">
      <header className="wat__header">
        <span className="wat__icon" aria-hidden>
          ✦
        </span>
        <span className="wat__label">
          {isCorrect ? "Why this is right" : "Walk through this with me"}
        </span>
      </header>

      <ol className="wat__entries">
        {entries.map((entry, i) => (
          <li key={i} className={`wat__entry wat__entry--${entry.role}`}>
            <span className="wat__entry-role">
              {entry.role === "assistant" ? "Instructor" : "You"}
            </span>
            <div className="wat__entry-body">{entry.content}</div>
          </li>
        ))}

        {showStreaming && (
          <li className="wat__entry wat__entry--assistant wat__entry--streaming">
            <span className="wat__entry-role">Instructor</span>
            <div className="wat__entry-body">
              {streamText}
              <span className="wat__cursor" aria-hidden />
            </div>
          </li>
        )}

        {error && (
          <li className="wat__entry wat__entry--error">
            <span className="wat__entry-role">Error</span>
            <div className="wat__entry-body">{error}</div>
          </li>
        )}
      </ol>

      {showStudentInput && (
        <div className="wat__input-row">
          <textarea
            className="wat__textarea"
            placeholder="What were you thinking when you picked that?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitReasoning();
              }
            }}
            rows={3}
          />
          <div className="wat__actions">
            <button
              type="button"
              className="wat__btn wat__btn--primary"
              onClick={handleSubmitReasoning}
              disabled={!input.trim()}
            >
              Send
            </button>
            <button
              type="button"
              className="wat__btn wat__btn--ghost"
              onClick={handleClose}
            >
              Skip
            </button>
          </div>
          <div className="wat__hint">Enter to send, Shift+Enter for newline</div>
        </div>
      )}

      {showFollowupInput && (
        <div className="wat__input-row">
          <textarea
            className="wat__textarea"
            placeholder="Any follow-up questions?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitFollowup();
              }
            }}
            rows={2}
          />
          <div className="wat__actions">
            <button
              type="button"
              className="wat__btn wat__btn--primary"
              onClick={handleSubmitFollowup}
              disabled={!input.trim()}
            >
              Ask
            </button>
            <button
              type="button"
              className="wat__btn wat__btn--ghost"
              onClick={handleClose}
            >
              {isCorrect ? "Done" : "Got it"}
            </button>
          </div>
          <div className="wat__hint">
            {FOLLOWUP_CAP - followupCount} follow-up
            {FOLLOWUP_CAP - followupCount === 1 ? "" : "s"} remaining — Enter to send
          </div>
        </div>
      )}

      {phase === "idle" && followupCount >= FOLLOWUP_CAP && (
        <div className="wat__actions">
          <button
            type="button"
            className="wat__btn wat__btn--ghost"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}
