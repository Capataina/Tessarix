/**
 * Typed event schema. Every emit() call lands in one of these shapes. Keep the
 * data discriminator small and well-bounded — the goal is JSONL that's easy to
 * grep, not arbitrary blobs.
 */

export type TelemetryEvent =
  // Session lifecycle
  | { kind: "session_start"; data: { lesson_slug?: string; user_agent: string; viewport: { w: number; h: number } } }
  | { kind: "session_end"; data: { reason: "unload" | "manual" } }

  // Navigation / structural
  | { kind: "tier_change"; data: { from: string; to: string } }
  | { kind: "panel_toggle"; data: { panel: "toc" | "chat"; open: boolean } }
  | { kind: "toc_jump"; data: { heading_id: string; heading_text: string; level: number } }
  | { kind: "scroll"; data: { y: number; doc_height: number; active_heading?: string } }

  // Assessments
  | { kind: "answer_select"; data: { widget: "mc" | "ptv" | "hotspot"; index?: number; question: string; picked_id: string; picked_label: string } }
  | { kind: "answer_reveal"; data: { widget: "mc" | "ptv" | "hotspot"; index?: number; question: string; picked_id: string; correct_id: string; is_correct: boolean } }
  | { kind: "answer_reset"; data: { widget: "mc" | "ptv" | "hotspot"; index?: number; question: string } }
  | { kind: "goal_state"; data: { index?: number; goal: string; state: Record<string, number>; solved: boolean } }
  | { kind: "goal_solved"; data: { index?: number; goal: string; final_state: Record<string, number> } }
  | { kind: "hint_unlock"; data: { index?: number; goal: string; level: 1 | 2 | 3 } }

  // LLM
  | { kind: "llm_request"; data: { feature: "answer_thread" | "chatbot" | "tiered_hints"; turn?: number; prompt_length: number; model?: string } }
  | { kind: "llm_response"; data: { feature: "answer_thread" | "chatbot" | "tiered_hints"; turn?: number; response_length: number; duration_ms: number; streamed: boolean } }
  | { kind: "llm_error"; data: { feature: "answer_thread" | "chatbot" | "tiered_hints"; turn?: number; message: string; duration_ms: number } }

  // Answer thread (per-turn lifecycle inside the AI walk-through)
  | { kind: "thread_open"; data: { widget: "mc" | "ptv" | "hotspot"; question: string; is_correct: boolean } }
  | { kind: "thread_user_reasoning"; data: { question: string; reasoning_length: number } }
  | { kind: "thread_followup"; data: { question: string; followup_length: number; followup_index: number } }
  | { kind: "thread_close"; data: { question: string; turn_count: number; followups_used: number } }

  // Chatbot
  | { kind: "chat_open"; data: Record<string, never> }
  | { kind: "chat_close"; data: { message_count: number } }
  | { kind: "chat_message"; data: { user_message_length: number; history_size: number } }
  | { kind: "chat_clear"; data: { previous_message_count: number } }

  // Generic click / interaction fallback
  | { kind: "click"; data: { target_role?: string; target_label?: string; widget?: string } }

  // Errors — `source` discriminates origin so you can filter later
  // (e.g. only window.error + unhandled_rejection vs console.warn noise).
  | {
      kind: "error";
      data: {
        source:
          | "window.error"
          | "unhandled_rejection"
          | "console.error"
          | "console.warn"
          | "error_boundary"
          | string;
        message: string;
        stack?: string;
        component_stack?: string;
      };
    };

export type TelemetryEventEnvelope = {
  session_id: string;
  timestamp: string; // ISO 8601
  seq: number;
} & TelemetryEvent;
