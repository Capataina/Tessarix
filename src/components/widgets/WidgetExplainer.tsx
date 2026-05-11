import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { extractLessonContext } from "../../lib/llm/dom";
import { useLLMStream } from "../../lib/llm/hooks";
import {
  buildWidgetExplainerMessages,
  buildWidgetQuestionMessages,
} from "../../lib/llm/prompts";
import type { ChatMessage } from "../../lib/llm/types";
import { emit as emitTelemetry } from "../../lib/telemetry";
import { RichText } from "../RichText";
import "./WidgetExplainer.css";

interface WidgetExplainerProps {
  /** Short widget identifier, used in prompts and telemetry. */
  widgetName: string;
  /** One-sentence "this is what this widget does" anchor for the LLM. */
  widgetDescription: string;
  /**
   * Plain-text summary of the widget's current state. Re-evaluated whenever
   * `stateKey` changes. Should describe inputs and outputs the LLM needs to
   * ground its explanation.
   */
  stateSummary: string;
  /**
   * Stable JSON-serialisable key for the current state. Used as the cache key
   * for the LLM call and as the dependency for debounced re-explaining.
   */
  stateKey: string;
  /** Debounce delay before triggering a new explanation. Default 800 ms. */
  debounceMs?: number;
}

const QUESTION_SAMPLING = {
  temperature: 0.3,
  maxTokens: 400,
};

const EXPLAINER_SAMPLING = {
  temperature: 0.2,
  maxTokens: 220,
};

type ChatTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export function WidgetExplainer({
  widgetName,
  widgetDescription,
  stateSummary,
  stateKey,
  debounceMs = 800,
}: WidgetExplainerProps) {
  const {
    text: explanation,
    isStreaming: explaining,
    error: explainError,
    stream: streamExplain,
    abort: abortExplain,
    reset: resetExplain,
  } = useLLMStream();

  // Separate stream for the "ask a question" thread so it doesn't fight the
  // running commentary stream.
  const {
    text: questionAnswer,
    isStreaming: answering,
    error: questionError,
    stream: streamQuestion,
    abort: abortQuestion,
    reset: resetQuestion,
  } = useLLMStream();

  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [thread, setThread] = useState<ChatTurn[]>([]);
  // True while we've torn down the prior explanation and are waiting for the
  // debounce timer to expire before kicking off a new stream. Drives the
  // "Waiting for the controls to settle…" placeholder so the reader sees a
  // distinct state from "nothing has happened yet".
  const [pending, setPending] = useState(false);
  const explanationKeyRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);

  // State-change handler. Two phases:
  //   (1) Immediately abort + clear any prior explanation. The reader should
  //       not see stale tokens from a previous state while they're still
  //       moving sliders.
  //   (2) Debounce the LLM call so we don't spam Ollama mid-drag. After the
  //       debounce expires (state has settled), fire a fresh stream.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (explanationKeyRef.current === stateKey) return;

    // Phase 1 — invalidate the existing explanation immediately. This is what
    // makes the UX feel responsive: the moment the reader touches a slider,
    // the stale explanation disappears.
    if (inFlightRef.current) {
      abortExplain();
    }
    resetExplain();
    inFlightRef.current = false;
    setPending(true);

    // Phase 2 — schedule a new stream once state has settled.
    debounceTimerRef.current = setTimeout(() => {
      explanationKeyRef.current = stateKey;
      const lessonContext = extractLessonContext();
      const messages = buildWidgetExplainerMessages({
        lessonContext,
        widgetName,
        widgetDescription,
        stateSummary,
      });
      inFlightRef.current = true;
      setPending(false);
      emitTelemetry({
        kind: "widget_explain_request",
        data: { widget: widgetName, state_summary: stateSummary },
      });
      void streamExplain(messages, {
        ...EXPLAINER_SAMPLING,
        telemetryFeature: "widget_explainer",
      }).finally(() => {
        inFlightRef.current = false;
      });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey, debounceMs, widgetName, widgetDescription, stateSummary]);

  const handleOpenQuestion = useCallback(() => {
    setQuestionOpen(true);
    emitTelemetry({
      kind: "widget_question_open",
      data: { widget: widgetName },
    });
  }, [widgetName]);

  const handleAsk = useCallback(async () => {
    const q = questionInput.trim();
    if (!q || answering) return;
    setQuestionInput("");
    // Append the user turn before streaming the answer.
    const nextThread: ChatTurn[] = [...thread, { role: "user", content: q }];
    setThread(nextThread);
    emitTelemetry({
      kind: "widget_question_ask",
      data: {
        widget: widgetName,
        question_length: q.length,
        turn: nextThread.filter((t) => t.role === "user").length,
      },
    });
    resetQuestion();
    const lessonContext = extractLessonContext();
    const history: ChatMessage[] = thread.map((t) => ({
      role: t.role,
      content: t.content,
    }));
    const messages = buildWidgetQuestionMessages({
      lessonContext,
      widgetName,
      widgetDescription,
      stateSummary,
      history,
      question: q,
    });
    await streamQuestion(messages, {
      ...QUESTION_SAMPLING,
      telemetryFeature: "widget_question",
    });
  }, [
    questionInput,
    thread,
    answering,
    widgetName,
    widgetDescription,
    stateSummary,
    streamQuestion,
    resetQuestion,
  ]);

  // After the stream finishes, commit the answer onto the thread so it
  // persists when the next question fires.
  useEffect(() => {
    if (!answering && questionAnswer.length > 0) {
      setThread((prev) => {
        if (
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant" &&
          prev[prev.length - 1].content === questionAnswer
        ) {
          return prev; // already committed
        }
        return [...prev, { role: "assistant", content: questionAnswer }];
      });
      resetQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answering]);

  const onTextareaKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleAsk();
    }
  };

  const handleCloseQuestion = useCallback(() => {
    setQuestionOpen(false);
    abortQuestion();
    resetQuestion();
  }, [abortQuestion, resetQuestion]);

  const explanationDisplay = useMemo(() => {
    if (explanation) return explanation;
    if (explaining) return "";
    if (pending)
      return "Waiting for the controls to settle, then generating a fresh explanation…";
    if (explainError) {
      return `Couldn't generate explanation (${explainError}). Try moving a control to retry.`;
    }
    return "Move a control to see the running explanation.";
  }, [explanation, explaining, explainError, pending]);

  // Latest streaming answer (if a stream is in flight). After commit, this
  // becomes empty and the thread renders the assistant turn instead.
  const streamingAnswerVisible = answering && questionAnswer.length > 0;

  return (
    <div className="widget-explainer">
      <div className="widget-explainer__commentary">
        <div className="widget-explainer__commentary-head">
          <span className="widget-explainer__label">Explanation</span>
          {explaining && (
            <span className="widget-explainer__streaming">streaming…</span>
          )}
        </div>
        <div className="widget-explainer__commentary-body" aria-live="polite">
          <RichText text={explanationDisplay} />
          {explaining && <span className="widget-explainer__caret" />}
        </div>
      </div>

      {!questionOpen ? (
        <button
          type="button"
          className="widget-explainer__ask-trigger"
          onClick={handleOpenQuestion}
        >
          Ask a question about this
        </button>
      ) : (
        <div className="widget-explainer__question">
          <div className="widget-explainer__question-head">
            <span className="widget-explainer__label">Ask</span>
            <button
              type="button"
              className="widget-explainer__close"
              onClick={handleCloseQuestion}
              aria-label="Close question thread"
            >
              ✕
            </button>
          </div>

          <div className="widget-explainer__thread">
            {thread.map((t, i) => (
              <div
                key={i}
                className={`widget-explainer__turn widget-explainer__turn--${t.role}`}
              >
                <RichText text={t.content} />
              </div>
            ))}
            {streamingAnswerVisible && (
              <div className="widget-explainer__turn widget-explainer__turn--assistant">
                <RichText text={questionAnswer} />
                <span className="widget-explainer__caret" />
              </div>
            )}
            {questionError && (
              <div className="widget-explainer__error">{questionError}</div>
            )}
          </div>

          <div className="widget-explainer__input-row">
            <textarea
              className="widget-explainer__input"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={onTextareaKey}
              placeholder="Ask anything about what you're seeing here…"
              rows={2}
              disabled={answering}
            />
            <button
              type="button"
              className="widget-explainer__send"
              onClick={() => void handleAsk()}
              disabled={answering || !questionInput.trim()}
            >
              {answering ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
