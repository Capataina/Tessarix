/**
 * Non-React wrappers around the Tauri IPC commands. Use these in places
 * where hook-based access is awkward (e.g. one-shot calls inside event handlers
 * that don't need component state). React components should prefer the hooks
 * in `./hooks.ts` instead.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage, ChatOptions } from "./types";

/** True when running inside the Tauri webview (IPC available). */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** The local-LLM model + endpoint used by the browser fallback (mirrors the
 *  Rust host's Ollama config; see context/notes/llm-integrations.md). */
const OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const OLLAMA_MODEL = "qwen3:4b-instruct-2507-q4_K_M";

/**
 * Non-streaming completion. In the Tauri app this routes through the Rust host's
 * IPC command; when run outside Tauri (the Vite dev/preview build, Playwright,
 * or a future web build) it falls back to a direct fetch against the local
 * Ollama OpenAI-compatible endpoint. This keeps interactive LLM features —
 * including the widget mini-lesson — testable in a plain browser and unblocks
 * the web build path noted in the README.
 */
export async function llmComplete(
  messages: ChatMessage[],
  opts?: ChatOptions,
): Promise<string> {
  if (inTauri()) {
    return invoke<string>("llm_chat_complete", {
      messages,
      temperature: opts?.temperature,
      topP: opts?.topP,
      maxTokens: opts?.maxTokens,
    });
  }
  // Browser fallback — talk to Ollama directly.
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.3,
      top_p: opts?.topP ?? 0.9,
      max_tokens: opts?.maxTokens ?? 512,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function llmJson<T = unknown>(
  messages: ChatMessage[],
  schema: object,
  opts?: ChatOptions,
): Promise<T> {
  return invoke<T>("llm_chat_json", {
    messages,
    schema,
    temperature: opts?.temperature,
    topP: opts?.topP,
    maxTokens: opts?.maxTokens,
  });
}
