#!/usr/bin/env -S node --experimental-strip-types
/**
 * Compare the `widgets_used` array in each lesson's frontmatter against the
 * components actually imported and rendered in the lesson body. Surfaces:
 *   - Declared but never imported  → over-declaration; remove from frontmatter
 *   - Imported but not declared    → under-declaration; add to frontmatter
 *   - Imported but never rendered  → likely a dead import
 *
 * Run with:  pnpm tsx scripts/lint-lesson-frontmatter.ts
 * Exit codes:
 *   0 — clean
 *   1 — at least one lesson has discrepancies
 *
 * Designed to be the cheap interim mechanism for one of the audit dimensions
 * that the future enrich-lesson skill will own. See
 * context/notes/enrich-lesson-skill.md.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const LESSONS_DIR = new URL("../src/lessons/", import.meta.url).pathname;

interface Finding {
  lesson: string;
  kind: "declared-not-imported" | "imported-not-declared" | "imported-not-rendered";
  widget: string;
}

function parseFrontmatterWidgets(source: string): string[] {
  // Match an opening --- followed by anything, looking for widgets_used: array.
  const fmMatch = source.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return [];
  const fm = fmMatch[1];
  const widgetsBlock = fm.match(/widgets_used:\s*\n((?:\s+-\s+\w+\n?)+)/);
  if (!widgetsBlock) return [];
  const items: string[] = [];
  for (const line of widgetsBlock[1].split("\n")) {
    const m = line.match(/^\s+-\s+(\w+)/);
    if (m) items.push(m[1]);
  }
  return items;
}

function parseImports(source: string): string[] {
  // Match { Foo, Bar } from "..." OR import Foo from "..."
  const names: string[] = [];
  const namedRe = /import\s*\{([^}]+)\}\s*from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(source)) !== null) {
    for (const piece of m[1].split(",")) {
      const cleaned = piece.trim().replace(/\s+as\s+\w+$/, "");
      if (cleaned && /^[A-Z]/.test(cleaned)) names.push(cleaned);
    }
  }
  const defaultRe = /import\s+([A-Z]\w+)\s+from\s+["'][^"']+["']/g;
  while ((m = defaultRe.exec(source)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function findRendered(source: string, name: string): boolean {
  // JSX usage: `<Name` or `<Name />`. Skip imports.
  const re = new RegExp(`<${name}[\\s/>]`);
  return re.test(source);
}

async function lintFile(path: string): Promise<Finding[]> {
  const source = await readFile(path, "utf8");
  const declared = new Set(parseFrontmatterWidgets(source));
  const imported = parseImports(source);
  const importedSet = new Set(imported);
  const findings: Finding[] = [];

  // Filter imports to "widget-like" — Pascal-case names that match a render.
  // (We don't want to lint helper imports like `LessonMeta`.)
  const renderedImports = imported.filter((n) => findRendered(source, n));
  const renderedSet = new Set(renderedImports);

  // imported but not rendered → likely dead.
  for (const name of imported) {
    if (!renderedSet.has(name) && !["LessonMeta"].includes(name)) {
      findings.push({ lesson: path, kind: "imported-not-rendered", widget: name });
    }
  }

  // declared but not imported → frontmatter lies.
  for (const name of declared) {
    if (!importedSet.has(name)) {
      findings.push({ lesson: path, kind: "declared-not-imported", widget: name });
    }
  }

  // rendered but not declared → frontmatter incomplete. Ignore helpers.
  const helpers = new Set(["LessonMeta", "Tier"]);
  for (const name of renderedSet) {
    if (!declared.has(name) && !helpers.has(name)) {
      findings.push({ lesson: path, kind: "imported-not-declared", widget: name });
    }
  }
  return findings;
}

async function main() {
  const entries = await readdir(LESSONS_DIR);
  const mdxFiles = entries.filter((f) => f.endsWith(".mdx"));
  const all: Finding[] = [];
  for (const file of mdxFiles) {
    const findings = await lintFile(join(LESSONS_DIR, file));
    all.push(...findings);
  }

  if (all.length === 0) {
    console.log("✓ frontmatter clean across", mdxFiles.length, "lesson(s)");
    process.exit(0);
  }

  console.log("Frontmatter findings:");
  for (const f of all) {
    const tag = {
      "declared-not-imported": "DECLARED-NOT-IMPORTED",
      "imported-not-declared": "IMPORTED-NOT-DECLARED",
      "imported-not-rendered": "IMPORTED-NOT-RENDERED",
    }[f.kind];
    console.log(`  [${tag}] ${f.lesson.split("/").pop()} :: ${f.widget}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
