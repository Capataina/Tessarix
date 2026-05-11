import { useMemo, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Render a string with embedded math. Math segments are delimited by `$...$`
 * (inline) or `$$...$$` (display). Backslashes inside math are preserved
 * as-is, so authors can write `$\sigma^2_{dr}$` or `$$\beta_1$$` and have
 * KaTeX render them properly.
 *
 * Designed for any place in the app that mixes prose and math:
 *   - widget captions ("The asymmetry equals $k \cdot |s_{nat,d} - s_{nat,r}|$.")
 *   - WidgetExplainer LLM output (the system prompt now requests LaTeX
 *     delimiters for math)
 *   - slider labels with subscripts
 *   - readouts ("$\sigma_d^2$ = 0.123")
 *
 * Non-math segments are rendered as-is into a React fragment. Use `<Math>`
 * directly when you only have math and no surrounding prose.
 */

interface RichTextProps {
  text: string;
  /** Treat the entire string as block-level math (forced display mode). */
  displayMode?: boolean;
  /** Optional extra className on the wrapping span. */
  className?: string;
}

interface Segment {
  kind: "prose" | "math";
  content: string;
  display: boolean;
}

/**
 * Split `text` into prose + math segments. Recognises `$$...$$` (display)
 * and `$...$` (inline). Display math is scanned first so a `$$...$$` block
 * isn't mistaken for two inline math segments.
 */
function tokenise(text: string): Segment[] {
  const segments: Segment[] = [];
  // Combined regex: `$$...$$` OR `$...$` (non-greedy, no nested dollars).
  // Escaped dollars `\$` are preserved as literal dollar signs.
  const re = /\$\$([\s\S]+?)\$\$|(?<!\\)\$([^\$\n]+?)\$/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({
        kind: "prose",
        content: text.slice(lastIndex, m.index),
        display: false,
      });
    }
    const isDisplay = m[1] !== undefined;
    const inner = isDisplay ? m[1] : m[2];
    segments.push({
      kind: "math",
      content: inner.trim(),
      display: isDisplay,
    });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({
      kind: "prose",
      content: text.slice(lastIndex),
      display: false,
    });
  }
  return segments;
}

function renderMath(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return latex;
  }
}

export function RichText({ text, displayMode, className }: RichTextProps) {
  const nodes: ReactNode[] = useMemo(() => {
    if (displayMode) {
      // Whole-string-as-math mode — no tokenisation, render the entire input.
      const html = renderMath(text, true);
      return [
        <span
          key="math"
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      ];
    }
    const segments = tokenise(text);
    return segments.map((s, i) => {
      if (s.kind === "prose") {
        return <span key={i}>{unescapeDollars(s.content)}</span>;
      }
      const html = renderMath(s.content, s.display);
      return (
        <span
          key={i}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  }, [text, displayMode]);

  return <span className={className}>{nodes}</span>;
}

/** Convenience: a math-only renderer for short symbol-only strings. */
export function Math({
  tex,
  display = false,
  className,
}: {
  tex: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(() => renderMath(tex, display), [tex, display]);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** `\$` → `$` for prose segments. */
function unescapeDollars(s: string): string {
  return s.replace(/\\\$/g, "$");
}
