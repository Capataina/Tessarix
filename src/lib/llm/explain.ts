/**
 * Prompts for "explain here" — the reader selects text in a lesson, right-clicks
 * → Explain here, and gets a grounded explanation in a drawer they can then chat
 * over. Like the widget mini-lesson, generation is separated from linking: the
 * model names concepts in prose and the deterministic linker adds the links.
 */
import type { ChatMessage } from "./types";

const VOICE =
  "Name related concepts in plain prose (for example \"matrix multiplication\", " +
  "\"the dot product\") — do NOT write any links, URLs, or markdown link syntax; " +
  "links are added automatically afterwards.";

export interface ExplainInput {
  selection: string;
  passage: string;
  lessonContext: string;
}

/** The initial explanation of the selected text, in the context of its passage + lesson. */
export function buildExplainMessages(input: ExplainInput): ChatMessage[] {
  const system =
    "You are a patient, expert tutor. A reader has selected a piece of text from " +
    "a lesson and wants it explained IN CONTEXT. Explain what the selected text " +
    "means and how it fits into its passage and the wider lesson — concretely and " +
    "grounded ONLY in the provided context. If the context doesn't support " +
    "something, say so plainly rather than inventing it. Write 2 to 4 short " +
    "paragraphs. " +
    VOICE;
  const user =
    `Lesson context:\n${input.lessonContext}\n\n` +
    `The reader selected this text:\n"${input.selection}"\n\n` +
    `which appears in this passage:\n${input.passage}\n\n` +
    `Explain the selected text and how it relates to the passage and the lesson.`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export interface ExplainFollowupInput {
  selection: string;
  lessonContext: string;
  explanation: string;
  history: ChatMessage[];
  question: string;
}

/** A follow-up turn: the reader asks a question about the selection/explanation. */
export function buildExplainFollowupMessages(input: ExplainFollowupInput): ChatMessage[] {
  const system =
    "You are a patient, expert tutor helping a reader understand a passage they " +
    "selected from a lesson. Answer their follow-up questions concretely and " +
    "grounded in the lesson context and the passage; keep answers short and to " +
    "the point. If something isn't supported by the context, say so. " +
    VOICE;
  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Lesson context:\n${input.lessonContext}\n\nThe reader selected: "${input.selection}"`,
    },
    { role: "assistant", content: input.explanation },
    ...input.history,
    { role: "user", content: input.question },
  ];
}
