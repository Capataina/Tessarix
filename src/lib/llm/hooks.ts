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
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const stream = useCallback(
    async (messages: ChatMessage[], opts?: ChatOptions): Promise<void> => {
      setText("");
      setError(null);
      setIsStreaming(true);
      abortRef.current = { aborted: false };

      const tStart = performance.now();
      if (opts?.telemetryFeature) {
        emitTelemetry({
          kind: "llm_request",
          data: {
            feature: opts.telemetryFeature,
            turn: opts.telemetryTurn,
            prompt_length: totalPromptLength(messages),
          },
        });
      }

      let accumulated = "";
      const channel = new Channel<StreamEvent>();
      channel.onmessage = (msg) => {
        if (abortRef.current.aborted) return;
        if (msg.event === "token") {
          accumulated += msg.data.content;
          setText((prev) => prev + msg.data.content);
        } else if (msg.event === "done") {
          setIsStreaming(false);
          if (opts?.telemetryFeature) {
            emitTelemetry({
              kind: "llm_response",
              data: {
                feature: opts.telemetryFeature,
                turn: opts.telemetryTurn,
                response_length: accumulated.length,
                duration_ms: Math.round(performance.now() - tStart),
                streamed: true,
              },
            });
          }
        } else if (msg.event === "error") {
          setError(msg.data.message);
          setIsStreaming(false);
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
        if (!abortRef.current.aborted) {
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
        setIsStreaming(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current.aborted = true;
    setText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
    abortRef.current.aborted = true;
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
          emitTelemetry({
            kind: "llm_response",
            data: {
              feature: opts.telemetryFeature,
              turn: opts.telemetryTurn,
              response_length: JSON.stringify(result).length,
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
