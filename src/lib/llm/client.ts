/**
 * Non-React wrappers around the Tauri IPC commands. Use these in places
 * where hook-based access is awkward (e.g. one-shot calls inside event handlers
 * that don't need component state). React components should prefer the hooks
 * in `./hooks.ts` instead.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage, ChatOptions } from "./types";

export async function llmComplete(
  messages: ChatMessage[],
  opts?: ChatOptions,
): Promise<string> {
  return invoke<string>("llm_chat_complete", {
    messages,
    temperature: opts?.temperature,
    topP: opts?.topP,
    maxTokens: opts?.maxTokens,
  });
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
