/**
 * Typed event schema. Every emit() call lands in one of these shapes. Keep the
 * data discriminator small and well-bounded — the goal is JSONL that's easy to
 * grep, not arbitrary blobs.
 *
 * Event categories (rough grouping):
 *   - Session lifecycle
 *   - App / routing / lesson lifecycle
 *   - Reading & scroll observation (passive surveillance of comprehension flow)
 *   - Tier / panel / TOC navigation
 *   - Settings
 *   - Catalog
 *   - Assessments (MultipleChoice, PredictThenVerify, hotspots)
 *   - Goal chains
 *   - Tiered hints
 *   - Widget interaction (mount / unmount / engagement / explain / question)
 *   - Answer threads
 *   - Chatbot
 *   - LLM lifecycle
 *   - Click / pointer / focus / idle
 *   - Errors / rendering failures
 *   - Performance instrumentation
 *
 * Schema discipline:
 *   - Always include enough context to reconstruct what the user was looking at
 *     (lesson slug, active heading, tier, focused widget).
 *   - Use string discriminators for sub-categories rather than free-form fields.
 *   - Numbers are durations / counts; strings are identifiers; objects are
 *     reserved for nested state snapshots.
 */

type Tier = "lite" | "standard" | "complete" | string;
type WidgetKind = "mc" | "ptv" | "hotspot";
type LLMFeature =
  | "answer_thread"
  | "chatbot"
  | "tiered_hints"
  | "widget_explainer"
  | "widget_question";

export type TelemetryEvent =
  // ─── Session lifecycle ──────────────────────────────────────────────
  | {
      kind: "session_start";
      data: {
        lesson_slug?: string;
        user_agent: string;
        viewport: { w: number; h: number };
        platform?: string;
        language?: string;
        device_pixel_ratio?: number;
        timezone_offset_min?: number;
      };
    }
  | { kind: "session_end"; data: { reason: "unload" | "manual"; active_ms?: number; total_ms?: number } }
  | {
      kind: "session_heartbeat";
      data: {
        active_ms_total: number;
        idle_ms_total: number;
        events_emitted_total: number;
        flushes_total: number;
        battery_level?: number;
      };
    }

  // ─── App / routing / lesson lifecycle ───────────────────────────────
  | { kind: "route_change"; data: { from: string; to: string } }
  | {
      kind: "lesson_open";
      data: {
        slug: string;
        title?: string;
        tier_initial: Tier;
        widgets_declared: string[];
        prerequisites_declared?: string[];
        from_route?: string;
      };
    }
  | {
      kind: "lesson_close";
      data: {
        slug: string;
        dwell_ms: number;
        active_ms: number;
        max_scroll_pct: number;
        headings_visited: string[];
        widgets_engaged: string[];
      };
    }
  | {
      kind: "lesson_complete";
      data: {
        slug: string;
        // A lesson is "completed" when every Goal/MultipleChoice/PTV in the
        // active tier has been answered/solved. Looser definitions can be
        // applied at analysis time; this event captures the strictest one.
        dwell_ms: number;
        tier_at_completion: Tier;
        score: { mc_correct: number; mc_total: number; ptv_correct: number; ptv_total: number; goals_solved: number; goals_total: number };
      };
    }
  | { kind: "lesson_load_error"; data: { slug: string; message: string } }

  // ─── Reading / scroll observation ───────────────────────────────────
  | {
      kind: "scroll";
      data: {
        y: number;
        doc_height: number;
        scroll_pct: number;
        active_heading?: string;
        active_heading_id?: string;
        active_heading_level?: number;
      };
    }
  | {
      kind: "section_enter";
      data: { heading_id: string; heading_text: string; level: number; tier?: Tier };
    }
  | {
      kind: "section_exit";
      data: { heading_id: string; heading_text: string; level: number; dwell_ms: number };
    }
  | {
      kind: "reading_heartbeat";
      data: {
        slug: string;
        active_heading_id?: string;
        active_heading_text?: string;
        scroll_pct: number;
        tier: Tier;
        active_ms_since_last: number;
        visible_widgets: string[];
      };
    }

  // ─── Tier / panel / TOC navigation ──────────────────────────────────
  | { kind: "tier_change"; data: { from: Tier; to: Tier; reason?: "user" | "default" | "url" } }
  | { kind: "panel_toggle"; data: { panel: "toc" | "chat"; open: boolean } }
  | { kind: "toc_jump"; data: { heading_id: string; heading_text: string; level: number } }
  | { kind: "topbar_back"; data: { from_slug?: string } }

  // ─── Settings ───────────────────────────────────────────────────────
  | {
      kind: "settings_open";
      data: Record<string, never>;
    }
  | {
      kind: "settings_close";
      data: { dwell_ms: number; changes_applied: number };
    }
  | {
      kind: "settings_changed";
      data: {
        key: string;
        old_value: unknown;
        new_value: unknown;
      };
    }
  | {
      kind: "settings_reset";
      data: { keys_reset: string[] };
    }

  // ─── Catalog ────────────────────────────────────────────────────────
  | { kind: "catalog_open"; data: { from?: string } }
  | { kind: "catalog_close"; data: { dwell_ms: number; selected_slug?: string } }
  | { kind: "catalog_filter"; data: { domain?: string; tag?: string } }
  | { kind: "catalog_search"; data: { query: string; result_count: number } }
  | { kind: "catalog_card_view"; data: { slug: string; index: number } }
  | { kind: "catalog_card_click"; data: { slug: string; index: number; via: "card" | "recommender" } }
  | { kind: "catalog_recommender_request"; data: { prompt_length: number } }
  | { kind: "catalog_recommender_response"; data: { suggestion_count: number; duration_ms: number } }

  // ─── Assessments ────────────────────────────────────────────────────
  | { kind: "answer_select"; data: { widget: WidgetKind; index?: number; question: string; picked_id: string; picked_label: string; tier?: Tier } }
  | { kind: "answer_reveal"; data: { widget: WidgetKind; index?: number; question: string; picked_id: string; correct_id: string; is_correct: boolean; time_to_reveal_ms?: number; tier?: Tier } }
  | { kind: "answer_reset"; data: { widget: WidgetKind; index?: number; question: string } }
  | { kind: "answer_hover_option"; data: { widget: WidgetKind; index?: number; option_id: string } }

  // ─── Goal chains ────────────────────────────────────────────────────
  | { kind: "goal_state"; data: { index?: number; goal: string; state: Record<string, number>; solved: boolean } }
  | { kind: "goal_solved"; data: { index?: number; goal: string; final_state: Record<string, number>; time_to_solve_ms?: number } }
  | { kind: "goal_step_advance"; data: { index?: number; step_index: number; total_steps: number } }

  // ─── Tiered hints ───────────────────────────────────────────────────
  | { kind: "hint_unlock"; data: { index?: number; goal: string; level: 1 | 2 | 3 } }

  // ─── Widget engagement ──────────────────────────────────────────────
  | { kind: "widget_mount"; data: { widget: string; slug?: string } }
  | { kind: "widget_unmount"; data: { widget: string; slug?: string; dwell_ms: number; interactions: number } }
  | {
      kind: "widget_interact";
      data: {
        widget: string;
        action:
          | "slider"
          | "drag"
          | "click"
          | "preset"
          | "toggle"
          | "input"
          | "reset"
          | "undo"
          | "apply"
          | string;
        detail?: Record<string, string | number | boolean>;
      };
    }
  | { kind: "widget_explain_request"; data: { widget: string; state_summary: string } }
  | { kind: "widget_explain_open"; data: { widget: string } }
  | { kind: "widget_explain_close"; data: { widget: string; dwell_ms: number } }
  | { kind: "widget_question_open"; data: { widget: string } }
  | { kind: "widget_question_close"; data: { widget: string; turn_count: number; dwell_ms: number } }
  | { kind: "widget_question_ask"; data: { widget: string; question_length: number; turn: number } }

  // ─── Answer thread (per-turn lifecycle inside the AI walk-through) ──
  | { kind: "thread_open"; data: { widget: WidgetKind; question: string; is_correct: boolean } }
  | { kind: "thread_user_reasoning"; data: { question: string; reasoning_length: number } }
  | { kind: "thread_followup"; data: { question: string; followup_length: number; followup_index: number } }
  | { kind: "thread_close"; data: { question: string; turn_count: number; followups_used: number; dwell_ms?: number } }

  // ─── Chatbot ────────────────────────────────────────────────────────
  | { kind: "chat_open"; data: Record<string, never> }
  | { kind: "chat_close"; data: { message_count: number; dwell_ms?: number } }
  | { kind: "chat_message"; data: { user_message_length: number; history_size: number } }
  | { kind: "chat_clear"; data: { previous_message_count: number } }
  | { kind: "chat_message_reaction"; data: { reaction: "up" | "down"; turn_index: number } }

  // ─── LLM lifecycle ──────────────────────────────────────────────────
  | {
      kind: "llm_request";
      data: {
        feature: LLMFeature;
        turn?: number;
        prompt_length: number;
        prompt_messages?: Array<{ role: string; content: string }>;
        model?: string;
        temperature?: number;
      };
    }
  | {
      kind: "llm_response";
      data: {
        feature: LLMFeature;
        turn?: number;
        response_length: number;
        response_text?: string;
        duration_ms: number;
        streamed: boolean;
        first_token_ms?: number;
        token_count_estimate?: number;
      };
    }
  | { kind: "llm_stream_chunk"; data: { feature: LLMFeature; turn?: number; chunk_length: number; cumulative_length: number } }
  | { kind: "llm_stream_abort"; data: { feature: LLMFeature; turn?: number; received_length: number; duration_ms: number; reason?: string } }
  | { kind: "llm_error"; data: { feature: LLMFeature; turn?: number; message: string; duration_ms: number; stage?: "connect" | "stream" | "parse" } }

  // ─── Pointer / focus / idle ─────────────────────────────────────────
  | { kind: "click"; data: { target_role?: string; target_label?: string; widget?: string; href?: string } }
  | { kind: "focus_change"; data: { active: boolean } }
  | { kind: "idle_start"; data: { active_ms_total: number } }
  | { kind: "idle_end"; data: { idle_ms: number } }

  // ─── Rendering failures ─────────────────────────────────────────────
  | { kind: "katex_error"; data: { expression: string; message: string; lesson_slug?: string } }
  | { kind: "mdx_runtime_error"; data: { lesson_slug?: string; message: string; component?: string } }

  // ─── Performance ────────────────────────────────────────────────────
  | { kind: "perf_slow_render"; data: { component?: string; duration_ms: number; lesson_slug?: string } }
  | { kind: "perf_image_load"; data: { src: string; duration_ms: number; size_bytes?: number } }
  | { kind: "perf_widget_first_paint"; data: { widget: string; duration_ms: number } }

  // ─── Generic / catch-all errors ─────────────────────────────────────
  | {
      kind: "error";
      data: {
        source:
          | "window.error"
          | "unhandled_rejection"
          | "console.error"
          | "console.warn"
          | "error_boundary"
          | "katex"
          | "telemetry_flush"
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
