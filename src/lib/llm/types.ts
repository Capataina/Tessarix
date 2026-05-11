/**
 * Shared TypeScript types for the LLM client. Mirrors the Rust types in
 * `src-tauri/src/llm/types.rs` and `commands.rs`.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  /** Sampling temperature. Defaults: 0.2 for grounded tasks. */
  temperature?: number;
  /** Nucleus sampling cutoff. Default 0.9. */
  topP?: number;
  /** Hard ceiling on response length. Defaults: 350 (chat) / 800 (JSON). */
  maxTokens?: number;
  /**
   * Optional telemetry feature tag. When set, the hook auto-emits
   * llm_request / llm_response / llm_error events tagged with this feature.
   */
  telemetryFeature?: "answer_thread" | "chatbot" | "tiered_hints";
  /** Optional turn index for multi-turn flows (e.g. answer thread Turn 1 vs Turn 3). */
  telemetryTurn?: number;
}

/**
 * Streaming token events emitted by `llm_chat_stream`. Mirrors Rust's
 * `StreamEvent` enum with `serde(tag = "event", content = "data")`.
 */
export type StreamEvent =
  | { event: "token"; data: { content: string } }
  | { event: "done" }
  | { event: "error"; data: { message: string } };
