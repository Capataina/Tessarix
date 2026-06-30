/**
 * The navigable graph — category ▸ topic ▸ lesson tree with prerequisite
 * ordering, built from the registry + lesson frontmatter + the authored metadata.
 * Imports the registry (and therefore MDX), so it is NOT part of the pure linker;
 * the graph-navigation view consumes it.
 */
import { LESSONS } from "../../lessons/registry";
import { LESSON_META, type Category } from "./meta";

export interface GraphLesson {
  slug: string;
  title: string;
  summary: string;
  category: Category;
  topic: string;
  teaches: string[];
  prerequisites: string[];
}

export interface GraphTopic {
  name: string;
  lessons: GraphLesson[];
}

export interface GraphCategory {
  name: Category;
  topics: GraphTopic[];
  lessonCount: number;
}

/** Build the category ▸ topic ▸ lesson tree, folding in titles + prerequisites. */
export async function buildGraph(): Promise<GraphCategory[]> {
  const lessons: GraphLesson[] = await Promise.all(
    LESSONS.map(async (entry) => {
      const meta = LESSON_META[entry.slug];
      const fm = await entry.frontmatter;
      return {
        slug: entry.slug,
        title: fm.title || entry.slug,
        summary: entry.summary,
        category: meta?.category ?? "Mathematics",
        topic: meta?.topic ?? "Other",
        teaches: meta?.teaches ?? [],
        prerequisites: fm.prerequisites ?? [],
      };
    }),
  );

  const byCategory = new Map<Category, Map<string, GraphLesson[]>>();
  for (const lesson of lessons) {
    if (!byCategory.has(lesson.category)) byCategory.set(lesson.category, new Map());
    const topics = byCategory.get(lesson.category)!;
    if (!topics.has(lesson.topic)) topics.set(lesson.topic, []);
    topics.get(lesson.topic)!.push(lesson);
  }

  return [...byCategory.entries()].map(([name, topics]) => {
    const topicList = [...topics.entries()].map(([tName, ls]) => ({
      name: tName,
      lessons: sortByPrereq(ls),
    }));
    return {
      name,
      topics: topicList,
      lessonCount: topicList.reduce((n, t) => n + t.lessons.length, 0),
    };
  });
}

/** Stable topological sort within a topic (prerequisites before dependents). */
function sortByPrereq(lessons: GraphLesson[]): GraphLesson[] {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  const visited = new Set<string>();
  const out: GraphLesson[] = [];
  const visit = (l: GraphLesson, stack: Set<string>) => {
    if (visited.has(l.slug) || stack.has(l.slug)) return;
    stack.add(l.slug);
    for (const pre of l.prerequisites) {
      const p = bySlug.get(pre);
      if (p) visit(p, stack);
    }
    stack.delete(l.slug);
    visited.add(l.slug);
    out.push(l);
  };
  for (const l of lessons) visit(l, new Set());
  return out;
}
