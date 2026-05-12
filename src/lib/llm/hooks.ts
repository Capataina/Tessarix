/**
 * React hooks for the three LLM call patterns.
 *
 * - `useLLM` — single-shot, non-streaming. Returns final response as string.
 * - `useLLMStream` — token-by-token streaming. Best for chatbot + wrong-answer turns.
 * - `useLLMJson` — schema-constrained structured output. Best for tiered hints.
 *
 * All three follow the same shape: { data/text, loading/isStreaming, error, run/stream }.
 *
 * Auto-telemetry: when `opts.telemetryFeature` is set, each hook emits
 * llm_request / llm_response / llm_error events with timing + length metrics.
 */

import { useCallback, useRef, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChatMessage, ChatOptions, StreamEvent } from "./types";
import { emit as emitTelemetry } from "../telemetry";

function totalPromptLength(messages: ChatMessage[]): number {
  return messages.reduce((acc, m) => acc + m.content.length, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// useLLM — single-shot non-streaming
// ─────────────────────────────────────────────────────────────────────────────

export function useLLM() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (messages: ChatMessage[], opts?: ChatOptions): Promise<string> => {
      setLoading(true);
      setError(null);
      setData(null);
      const tStart = performance.now();
      if (opts?.telemetryFeature) {
        emitTelemetry({
          kind: "llm_request",
          data: {
            feature: opts.telemetryFeature,
            turn: opts.telemetryTurn,
            prompt_length: totalPromptLength(messages),
            prompt_messages: messages,
          },
        });
      }
      try {
        const result = await invoke<string>("llm_chat_complete", {
          messages,
          temperature: opts?.temperature,
          topP: opts?.topP,
          maxTokens: opts?.maxTokens,
        });
        setData(result);
        if (opts?.telemetryFeature) {
          emitTelemetry({
            kind: "llm_response",
            data: {
              feature: opts.telemetryFeature,
              turn: opts.telemetryTurn,
              response_length: result.length,
              response_text: result,
              duration_ms: Math.round(performance.now() - tStart),
              streamed: false,
            },
          });
        }
        return result;
      } catch (e) {
        const msg = String(e);
        setError(msg);
        if (opts?.telemetryFeature) {
          emitTelemetry({
            kind: "llm_error",
            data: {
              feature: opts.telemetryFeature,
              turn: opts.telemetryTurn,
              message: msg,
              duration_ms: Math.round(performance.now() - tStart),
            },
          });
        }
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLLMStream — token-by-token
// ─────────────────────────────────────────────────────────────────────────────

export function useLLMStream() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Holds the *current* stream's abort flag. Each `stream()` invocation
  // creates a NEW local flag object and stores it here. The channel's
  // onmessage closure captures the local — so when a later stream replaces
  // `abortRef.current`, the old channel still sees its own flag as aborted
  // (the bug this fixes was: replacing the ref's value un-aborted the
  // previous stream, because the old onmessage was reading via the ref).
  const abortRef = useRef<{ aborted: boolean } | null>(null);

  const stream = useCallback(
    async (messages: ChatMessage[], opts?: ChatOptions): Promise<void> => {
      // Mark any previous stream aborted before we create a new one.
      if (abortRef.current) abortRef.current.aborted = true;
      const localAbort = { aborted: false };
      abortRef.current = localAbort;

      setText("");
      setError(null);
      setIsStreaming(true);

      const tStart = performance.now();
      if (opts?.telemetryFeature) {
        emitTelemetry({
          kind: "llm_request",
          data: {
            feature: opts.telemetryFeature,
            turn: opts.telemetryTurn,
            prompt_length: totalPromptLength(messages),
            prompt_messages: messages,
          },
        });
      }

      let accumulated = "";
      let firstTokenAt: number | null = null;
      const channel = new Channel<StreamEvent>();
      channel.onmessage = (msg) => {
        // Closes over the LOCAL flag — guaranteed isolated from any later
        // stream's flag.
        if (localAbort.aborted) return;
        if (msg.event === "token") {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          accumulated += msg.data.content;
          setText((prev) => prev + msg.data.content);
          if (opts?.telemetryFeature) {
            emitTelemetry({
              kind: "llm_stream_chunk",
              data: {
                feature: opts.telemetryFeature,
                turn: opts.telemetryTurn,
                chunk_length: msg.data.content.length,
                cumulative_length: accumulated.length,
              },
            });
          }
        } else if (msg.event === "done") {
          if (abortRef.current === localAbort) {
            setIsStreaming(false);
          }
          if (opts?.telemetryFeature) {
            emitTelemetry({
              kind: "llm_response",
              data: {
                feature: opts.telemetryFeature,
                turn: opts.telemetryTurn,
                response_length: accumulated.length,
                response_text: accumulated,
                duration_ms: Math.round(performance.now() - tStart),
                streamed: true,
                first_token_ms:
                  firstTokenAt !== null
                    ? Math.round(firstTokenAt - tStart)
                    : undefined,
                token_count_estimate: Math.max(1, Math.round(accumulated.length / 4)),
              },
            });
          }
        } else if (msg.event === "error") {
          if (abortRef.current === localAbort) {
            setError(msg.data.message);
            setIsStreaming(false);
          }
          if (opts?.telemetryFeature) {
            emitTelemetry({
              kind: "llm_error",
              data: {
                feature: opts.telemetryFeature,
                turn: opts.telemetryTurn,
                message: msg.data.message,
                duration_ms: Math.round(performance.now() - tStart),
              },
            });
          }
        }
      };

      try {
        await invoke("llm_chat_stream", {
          messages,
          onEvent: channel,
          temperature: opts?.temperature,
          topP: opts?.topP,
          maxTokens: opts?.maxTokens,
        });
      } catch (e) {
        if (!localAbort.aborted) {
          setError(String(e));
          if (opts?.telemetryFeature) {
            emitTelemetry({
              kind: "llm_error",
              data: {
                feature: opts.telemetryFeature,
                turn: opts.telemetryTurn,
                message: String(e),
                duration_ms: Math.round(performance.now() - tStart),
              },
            });
          }
        }
        if (abortRef.current === localAbort) {
          setIsStreaming(false);
        }
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.aborted = true;
    setText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
    if (abortRef.current) abortRef.current.aborted = true;
    setIsStreaming(false);
  }, []);

  return { text, isStreaming, error, stream, reset, abort };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLLMJson — schema-constrained
// ─────────────────────────────────────────────────────────────────────────────

export function useLLMJson<T = unknown>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      messages: ChatMessage[],
      schema: object,
      opts?: ChatOptions,
    ): Promise<T> => {
      setLoading(true);
      setError(null);
      const tStart = performance.now();
      if (opts?.telemetryFeature) {
        emitTelemetry({
          kind: "llm_request",
          data: {
            feature: opts.telemetryFeature,
            turn: opts.telemetryTurn,
            prompt_length: totalPromptLength(messages),
            prompt_messages: messages,
          },
        });
      }
      try {
        const result = await invoke<T>("llm_chat_json", {
          messages,
          schema,
          temperature: opts?.temperature,
          topP: opts?.topP,
          maxTokens: opts?.maxTokens,
        });
        setData(result);
        if (opts?.telemetryFeature) {
          const serialised = JSON.stringify(result);
          emitTelemetry({
            kind: "llm_response",
            data: {
              feature: opts.telemetryFeature,
              turn: opts.telemetryTurn,
              response_length: serialised.length,
              response_text: serialised,
              duration_ms: Math.round(performance.now() - tStart),
              streamed: false,
            },
          });
        }
        return result;
      } catch (e) {
        const msg = String(e);
        setError(msg);
        if (opts?.telemetryFeature) {
          emitTelemetry({
            kind: "llm_error",
            data: {
              feature: opts.telemetryFeature,
              turn: opts.telemetryTurn,
              message: msg,
              duration_ms: Math.round(performance.now() - tStart),
            },
          });
        }
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset };
}
