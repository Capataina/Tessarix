/**
 * System prompt templates for each of the three LLM-driven features.
 *
 * Design notes (from empirical testing 2026-05-11):
 * - All three features share a single PERSONA system prompt with hard grounding rules.
 * - User prompts are built from per-feature templates that inject lesson context.
 * - Length constraints in the user prompt are load-bearing — bounded output is what
 *   keeps llama3.2:3b from drifting into invented technical detail.
 */

import type { ChatMessage } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Persona — shared across all three features
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONA = `You are an expert instructor. You explain concepts to students clearly and concisely. Adapt your framing to whatever subject the lesson context is about — image quality, quantitative finance, music theory, distributed systems, anything else — without ever stating which domain it is.

Three absolute rules:
1. Use ONLY information from the lesson context provided. Never invent technical details, formulas, or facts that are not explicitly in the context.
2. Be direct and conversational — speak to the student, not at them.
3. Respect length constraints. If asked for a specific number of sentences, give exactly that many.

If the lesson context lacks information needed to answer, say "the lesson does not cover this" rather than guessing.`;

// ─────────────────────────────────────────────────────────────────────────────
// Answer thread — Turn 1 (auto-fires on every reveal, correct or wrong)
// ─────────────────────────────────────────────────────────────────────────────

interface AnswerThreadTurn1Args {
  sectionContext: string;
  question: string;
  options: { id: string; label: string }[];
  correctId: string;
  pickedId: string;
}

export function buildAnswerThreadTurn1(args: AnswerThreadTurn1Args): ChatMessage[] {
  const correctLabel =
    args.options.find((o) => o.id === args.correctId)?.label ?? args.correctId;
  const pickedLabel =
    args.options.find((o) => o.id === args.pickedId)?.label ?? args.pickedId;
  const isCorrect = args.pickedId === args.correctId;

  const user = isCorrect
    ? `LESSON CONTEXT:
${args.sectionContext}

QUESTION: ${args.question}

The student picked CORRECTLY: "${pickedLabel}"

In exactly 2-3 sentences, briefly affirm and then explain WHY this is the right answer — the mechanism behind it, not just that it's correct. Stay grounded in the lesson context. Do not invent details. End with a short open invitation: "Anything you want to dig into more?"`
    : `LESSON CONTEXT:
${args.sectionContext}

QUESTION: ${args.question}

The student picked (WRONG): "${pickedLabel}"
The correct answer is: "${correctLabel}"

In exactly 2 sentences, explain WHY the student's pick is wrong — focus on the misconception their answer suggests, not just restating the correct answer. Then, in one short sentence, ask the student: "What were you thinking when you picked that?"

Stay grounded in the lesson context above.`;

  return [
    { role: "system", content: PERSONA },
    { role: "user", content: user },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer thread — Turn 3 (after student types their reasoning, wrong path only)
// ─────────────────────────────────────────────────────────────────────────────

interface AnswerThreadCorrectionArgs {
  sectionContext: string;
  question: string;
  correctLabel: string;
  pickedLabel: string;
  studentReasoning: string;
  history: ChatMessage[];
}

export function buildAnswerThreadCorrection(
  args: AnswerThreadCorrectionArgs,
): ChatMessage[] {
  const user = `The student's reasoning for picking "${args.pickedLabel}" over "${args.correctLabel}":

"${args.studentReasoning}"

In exactly 2-3 sentences, address the SPECIFIC misconception in their reasoning above. If they got part of it right, say so explicitly. Don't lecture. Don't repeat the full explanation from the lesson. Meet them where they are.`;

  return [
    { role: "system", content: PERSONA },
    ...args.history,
    { role: "user", content: user },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer thread — Optional follow-up turn (reader asks more)
// ─────────────────────────────────────────────────────────────────────────────

export function buildAnswerThreadFollowup(
  history: ChatMessage[],
  newUserMessage: string,
  sectionContext: string,
): ChatMessage[] {
  const enriched = `LESSON CONTEXT (still in scope):
${sectionContext}

STUDENT FOLLOW-UP: ${newUserMessage}

Answer in 2-3 sentences. Stay grounded in the lesson context.`;

  return [
    { role: "system", content: PERSONA },
    ...history,
    { role: "user", content: enriched },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Right-pane chatbot
// ─────────────────────────────────────────────────────────────────────────────

interface ChatbotArgs {
  sectionContext: string;
  question: string;
  history: ChatMessage[];
}

export function buildChatbotMessages(args: ChatbotArgs): ChatMessage[] {
  const user = `LESSON CONTEXT (the section the reader is currently looking at):
${args.sectionContext}

READER'S QUESTION: ${args.question}

Answer in 2-5 sentences. Use ONLY information from the lesson context above. If the reader's question is outside what the lesson covers, say "the lesson does not cover this" and briefly mention what topic area it would belong to.`;

  return [
    { role: "system", content: PERSONA },
    ...args.history,
    { role: "user", content: user },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiered LLM hints — generates all 3 levels in one call
// ─────────────────────────────────────────────────────────────────────────────

interface TieredHintsArgs {
  sectionContext: string;
  goal: string;
  currentState: string;
  /**
   * Authoritative solution hint — what the right answer is, written by the
   * lesson author. The LLM uses this as ground truth and derives 3 progressively-
   * direct hints toward it. This is what keeps small models from guessing the
   * wrong parameter when the lesson context is ambiguous.
   */
  solutionHint?: string;
}

export function buildTieredHintsMessages(args: TieredHintsArgs): ChatMessage[] {
  const solutionBlock = args.solutionHint
    ? `AUTHORITATIVE SOLUTION (this is the correct answer — your three hints must lead the student toward exactly this, never something different):
${args.solutionHint}

`
    : "";

  const user = `LESSON CONTEXT:
${args.sectionContext}

${solutionBlock}GOAL the student is trying to achieve: ${args.goal}
CURRENT STATE of the student's widget: ${args.currentState}

Generate exactly 3 progressive hints toward the goal:
- Level 1 (subtle): point toward the right area without naming the specific parameter or value. 1 sentence.
- Level 2 (more direct): name the specific parameter, variable, or concept to focus on. 1-2 sentences.
- Level 3 (nearly the answer): say what specific value or action will solve it. 1-2 sentences.

${args.solutionHint ? "All three hints must be consistent with the AUTHORITATIVE SOLUTION above. Never contradict it or suggest a different parameter." : "Stay grounded in the lesson context."} Output ONLY the JSON object matching the provided schema.`;

  return [
    { role: "system", content: PERSONA },
    { role: "user", content: user },
  ];
}

export const TIERED_HINTS_SCHEMA = {
  name: "tiered_hints",
  strict: true,
  schema: {
    type: "object",
    properties: {
      hints: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            level: { type: "integer", minimum: 1, maximum: 3 },
            text: { type: "string" },
          },
          required: ["level", "text"],
          additionalProperties: false,
        },
      },
    },
    required: ["hints"],
    additionalProperties: false,
  },
};

export type TieredHintsResponse = {
  hints: Array<{ level: 1 | 2 | 3; text: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy export aliases — to be removed once all callers migrate
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use buildAnswerThreadTurn1 — handles both correct and wrong picks. */
export const buildWrongAnswerTurn1 = buildAnswerThreadTurn1;

/** @deprecated Use buildAnswerThreadCorrection — same shape, clearer name. */
export const buildWrongAnswerTurn3 = buildAnswerThreadCorrection;

/** @deprecated Use buildAnswerThreadFollowup — same shape, clearer name. */
export const buildWrongAnswerFollowup = buildAnswerThreadFollowup;
