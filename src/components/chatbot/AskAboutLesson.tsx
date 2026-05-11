import { useCallback, useEffect, useRef, useState } from "react";
import { useLLMStream } from "../../lib/llm/hooks";
import { buildChatbotMessages } from "../../lib/llm/prompts";
import type { ChatMessage } from "../../lib/llm/types";
import { extractLessonContext } from "../../lib/llm/dom";
import { emit as emitTelemetry } from "../../lib/telemetry";
import "./AskAboutLesson.css";

interface ChatEntry {
  role: "assistant" | "user";
  content: string;
}

/**
 * Persistent chat panel — lives inline in the right sidebar of the main grid.
 * Always rendered when the sidebar is open; reader can scroll the lesson and
 * chat at the same time. Conversation persists per page load.
 *
 * Context is auto-extracted from the rendered lesson DOM at send time via
 * `extractLessonContext()`. No props needed from callers.
 */
export function AskAboutLesson() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const {
    text: streamText,
    isStreaming,
    error,
    stream,
    reset: resetStream,
  } = useLLMStream();

  const consumedRef = useRef<string>("");
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Commit completed streams into history, then clear the stream buffer so the
  // "streaming ghost" card disappears.
  useEffect(() => {
    if (!isStreaming && streamText && streamText !== consumedRef.current) {
      const completed = streamText;
      consumedRef.current = completed;
      setEntries((e) => [...e, { role: "assistant", content: completed }]);
      resetStream();
    }
  }, [isStreaming, streamText, resetStream]);

  // Auto-scroll to latest message.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, streamText]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userEntry: ChatEntry = { role: "user", content: trimmed };
    const newEntries = [...entries, userEntry];
    setEntries(newEntries);
    setInput("");

    emitTelemetry({
      kind: "chat_message",
      data: {
        user_message_length: trimmed.length,
        history_size: newEntries.length,
      },
    });

    const history: ChatMessage[] = newEntries
      .slice(0, -1)
      .map((e) => ({ role: e.role, content: e.content }));

    const lessonContext = extractLessonContext();
    const messages = buildChatbotMessages({
      sectionContext: lessonContext,
      question: trimmed,
      history,
    });

    consumedRef.current = "";
    void stream(messages, {
      temperature: 0.4,
      maxTokens: 350,
      telemetryFeature: "chatbot",
    });
  }, [input, entries, isStreaming, stream]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    emitTelemetry({
      kind: "chat_clear",
      data: { previous_message_count: entries.length },
    });
    setEntries([]);
    setInput("");
    consumedRef.current = "";
    resetStream();
  }, [resetStream, entries.length]);

  const showStreaming = (isStreaming || streamText) && streamText.length > 0;
  const empty = entries.length === 0 && !showStreaming;

  return (
    <section className="ask-panel" aria-label="Ask about this lesson">
      <header className="ask-panel__header">
        <div className="ask-panel__title">
          <span className="ask-panel__icon" aria-hidden>◆</span>
          <span>Ask about this lesson</span>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            className="ask-panel__icon-btn"
            onClick={handleClear}
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            ⟲
          </button>
        )}
      </header>

      <div className="ask-panel__body">
        {empty && (
          <div className="ask-panel__empty">
            <p className="ask-panel__empty-title">Ask anything about the current lesson.</p>
            <p className="ask-panel__empty-sub">
              The model is grounded in the lesson content. Out-of-scope questions
              will get a "this isn't in the lesson" reply.
            </p>
            <p className="ask-panel__empty-sub ask-panel__empty-hint">
              Running locally on llama3.2:3b — responses take a few seconds.
            </p>
          </div>
        )}

        {entries.map((entry, i) => (
          <article
            key={i}
            className={`ask-panel__msg ask-panel__msg--${entry.role}`}
          >
            <header className="ask-panel__msg-role">
              {entry.role === "assistant" ? "Tessarix" : "You"}
            </header>
            <div className="ask-panel__msg-body">{entry.content}</div>
          </article>
        ))}

        {showStreaming && (
          <article className="ask-panel__msg ask-panel__msg--assistant ask-panel__msg--streaming">
            <header className="ask-panel__msg-role">Tessarix</header>
            <div className="ask-panel__msg-body">
              {streamText}
              <span className="ask-panel__cursor" aria-hidden />
            </div>
          </article>
        )}

        {!showStreaming && isStreaming && (
          <article className="ask-panel__msg ask-panel__msg--assistant ask-panel__msg--streaming">
            <header className="ask-panel__msg-role">Tessarix</header>
            <div className="ask-panel__msg-body ask-panel__msg-body--thinking">
              Thinking
              <span className="ask-panel__dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>
          </article>
        )}

        {error && (
          <article className="ask-panel__msg ask-panel__msg--error">
            <header className="ask-panel__msg-role">Error</header>
            <div className="ask-panel__msg-body">{error}</div>
          </article>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      <footer className="ask-panel__footer">
        <textarea
          ref={textareaRef}
          className="ask-panel__textarea"
          placeholder="Ask about the lesson..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isStreaming}
          rows={2}
        />
        <div className="ask-panel__footer-row">
          <span className="ask-panel__hint">Enter to send · Shift+Enter for newline</span>
          <button
            type="button"
            className="ask-panel__send"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
          >
            Send
          </button>
        </div>
      </footer>
    </section>
  );
}
