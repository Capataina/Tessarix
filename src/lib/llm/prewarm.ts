/**
 * Pre-warm the local LLM at app start.
 *
 * Ollama lazy-loads model weights on the first request, which takes several
 * seconds for llama3.2:3b. Without pre-warming, the first WidgetExplainer call
 * on lesson load pays that cost — and because multiple explainers fire on
 * mount, they queue behind the cold-start, making the first few seconds of
 * every session feel broken.
 *
 * The fix: fire one tiny, throwaway request as soon as the app mounts. The
 * model loads while the lesson is rendering; by the time the first real
 * widget commentary fires, Ollama is hot.
 */

import { invoke } from "@tauri-apps/api/core";

let warmed = false;

export async function prewarmLLM(): Promise<void> {
  if (warmed) return;
  warmed = true;
  try {
    await invoke<string>("llm_chat_complete", {
      messages: [
        { role: "system", content: "Reply with the single word OK." },
        { role: "user", content: "ping" },
      ],
      temperature: 0,
      maxTokens: 4,
    });
  } catch {
    // Pre-warm is best-effort. If Ollama isn't running, the real widget
    // call will surface the error in its own UI; we don't want to crash
    // app start.
    warmed = false;
  }
}
