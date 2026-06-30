/**
 * The fullscreen widget mini-lesson generator. Distinct from <WidgetExplainer>'s
 * live state caption: this produces a short *lesson* about the widget — what it
 * is, how to read it, the background to understand it — woven with links to
 * related lessons.
 *
 * Generation is separated from linking (see context/notes/content-architecture.md):
 * the model is instructed to name related concepts in plain prose and NOT to emit
 * links; the deterministic concept-linker adds the correct links to the output
 * afterward. So the model can't hallucinate a lesson reference.
 */
import type { ChatMessage } from "./types";
import { llmComplete } from "./client";

export interface MiniLessonInput {
  widgetName: string;
  widgetDescription: string;
  howToRead?: string;
  teaches?: string[];
  lessonContext: string;
  stateSummary?: string;
}

export function buildWidgetMiniLessonMessages(input: MiniLessonInput): ChatMessage[] {
  const system =
    "You are an expert instructor in computer science, mathematics, and machine " +
    "learning. You write short, vivid mini-lessons that explain an interactive " +
    "teaching widget: what it is, how to read it, and the background needed to " +
    "understand it. Use ONLY the lesson context provided; never invent technical " +
    "details, formulas, or facts not in the context. If the context lacks " +
    "something, say so plainly. Write 3 to 5 short paragraphs. Refer to related " +
    "concepts by name in plain prose (for example \"matrix multiplication\", " +
    "\"the dot product\") — do NOT write any links, URLs, or markdown link syntax; " +
    "links are added automatically afterwards.";

  const concepts = input.teaches?.length
    ? `\nConcepts this widget teaches: ${input.teaches.join(", ")}.`
    : "";
  const howTo = input.howToRead ? `\nHow to read it (author note): ${input.howToRead}` : "";
  const state = input.stateSummary ? `\nCurrent state: ${input.stateSummary}` : "";

  const user =
    `Widget: ${input.widgetName}\n` +
    `What it is: ${input.widgetDescription}${concepts}${howTo}${state}\n\n` +
    `Lesson context:\n${input.lessonContext}\n\n` +
    `Write the mini-lesson now: what this widget is, how to read it, and the ` +
    `background needed to understand it.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export async function generateWidgetMiniLesson(input: MiniLessonInput): Promise<string> {
  return llmComplete(buildWidgetMiniLessonMessages(input), {
    temperature: 0.3,
    maxTokens: 700,
  });
}
