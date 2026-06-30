/**
 * Minimal, safe markdown → HTML for LLM mini-lesson output. The model emits
 * markdown (bold, paragraphs, bullet/numbered lists, the odd heading); rendered
 * raw it shows literal `**` and collapses into one blob. This converts it to
 * structured HTML.
 *
 * Order matters: escape → (optionally) inject concept links → structure. Escaping
 * first means LLM text can never inject markup; links are injected into the
 * already-escaped flat text (so generation stays separated from linking); the
 * block/inline transforms then wrap that text — their regexes are line-anchored
 * or `*`/backtick-based and don't touch the injected `<a …>` tags. Math ($…$) is
 * left as-is (the mini-lesson prompt is prose; the widget itself carries formulae).
 */
import { escapeHtml, injectLinks, type LinkOptions } from "../graph/linker";

function inlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderBlock(block: string): string {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  if (lines.every((l) => /^[-*]\s+/.test(l))) {
    return (
      "<ul>" +
      lines.map((l) => `<li>${inlineMarkdown(l.replace(/^[-*]\s+/, ""))}</li>`).join("") +
      "</ul>"
    );
  }
  if (lines.every((l) => /^\d+\.\s+/.test(l))) {
    return (
      "<ol>" +
      lines.map((l) => `<li>${inlineMarkdown(l.replace(/^\d+\.\s+/, ""))}</li>`).join("") +
      "</ol>"
    );
  }
  if (lines.length === 1 && /^#{1,4}\s+/.test(lines[0])) {
    return `<h4>${inlineMarkdown(lines[0].replace(/^#{1,4}\s+/, ""))}</h4>`;
  }
  return `<p>${inlineMarkdown(lines.join(" "))}</p>`;
}

export interface RenderMiniOptions extends LinkOptions {
  /** Inject concept links. Do this only on the final, complete text. */
  link?: boolean;
}

export function renderMiniLessonHtml(raw: string, opts: RenderMiniOptions = {}): string {
  let s = escapeHtml(raw);
  if (opts.link) s = injectLinks(s, opts);
  return s
    .trim()
    .split(/\n\s*\n/)
    .map(renderBlock)
    .filter(Boolean)
    .join("\n");
}
