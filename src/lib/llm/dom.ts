/**
 * Lesson-context extraction from the rendered DOM.
 *
 * Architecture decision (2026-05-11): LLM-aware widgets do NOT receive
 * lesson context via props or per-lesson constants. They extract it from
 * the rendered DOM at call time. This makes new lessons zero-config —
 * authors just write MDX and the widgets automatically see the rendered
 * content.
 *
 * Tier visibility note: `<Tier>` wrappers always render their children
 * into the DOM and use `display: none` to visually hide content below the
 * active tier threshold. Because `Node.textContent` traverses through
 * `display: none` nodes (it reads the underlying text tree, not the
 * computed visual layout), the extractor automatically picks up every
 * tier's content regardless of what the reader has selected. This is
 * intentional — the LLM always sees the deepest version of the lesson.
 */

const MAX_CHARS = 8000;

/**
 * Extract the full lesson context for LLM grounding. Returns a single
 * normalised string consisting of:
 *
 *   LESSON TITLE: <h1 text>
 *
 *   LESSON CONTENT:
 *   <all body text from the .lesson element, whitespace-collapsed,
 *    including currently-hidden tier sections>
 *
 * Truncated to MAX_CHARS with an ellipsis suffix if longer.
 * Returns an empty string when called outside the browser or before the
 * lesson DOM has mounted.
 */
export function extractLessonContext(): string {
  if (typeof document === "undefined") return "";
  const lesson = document.querySelector(".lesson");
  if (!lesson) return "";

  const h1 = lesson.querySelector("h1");
  const title = (h1?.textContent ?? "").trim();

  // textContent reads through display:none — gives us every tier's content.
  const rawAll = (lesson.textContent ?? "").replace(/\s+/g, " ").trim();

  // The h1 text appears at the start of rawAll; strip it to avoid duplication
  // in the formatted output (we'll prefix the title separately for clarity).
  let body = rawAll;
  if (title && body.startsWith(title)) {
    body = body.slice(title.length).trimStart();
  }

  const combined = title
    ? `LESSON TITLE: ${title}\n\nLESSON CONTENT:\n${body}`
    : `LESSON CONTENT:\n${body}`;

  if (combined.length <= MAX_CHARS) return combined;
  return combined.slice(0, MAX_CHARS) + "…";
}

/**
 * Diagnostic helper. Returns the same string as `extractLessonContext`,
 * but also logs to console so the user can verify what the LLM is being
 * fed via DevTools. Exposed via `window.__tessarixLLMContext` for ad-hoc
 * inspection: in DevTools console, run `__tessarixLLMContext()`.
 */
export function debugExtractLessonContext(): string {
  const text = extractLessonContext();
  if (typeof console !== "undefined") {
    console.info(
      "[tessarix-llm] extracted context",
      { length: text.length, preview: text.slice(0, 200) + "…" },
    );
  }
  return text;
}

// Expose for DevTools-based verification.
if (typeof window !== "undefined") {
  (window as unknown as { __tessarixLLMContext?: () => string })
    .__tessarixLLMContext = extractLessonContext;
}
