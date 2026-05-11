/**
 * Lesson registry. Every shipping lesson is registered here with its
 * frontmatter metadata so the catalog (main menu) can present it without
 * actually loading the lesson's component bundle.
 *
 * Adding a new lesson:
 *   1. Author `src/lessons/<slug>.mdx` with proper frontmatter
 *      (title, tag, tags, last_updated, estimated_time, widgets_used).
 *   2. Add an entry to LESSONS below pointing at the slug.
 *   3. Add a dynamic-import-style component loader in the catalog/router.
 *
 * Domain is a coarse top-level grouping (the topic this lesson belongs to);
 * tags are finer-grained labels that may overlap across domains.
 */

import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

export interface LessonFrontmatter {
  title: string;
  tag: string;
  tags: string[];
  last_updated: string;
  estimated_time: string;
  widgets_used?: string[];
  prerequisites?: string[];
}

export interface LessonRegistryEntry {
  /** Slug used in URL routing (`#/lesson/<slug>`). */
  slug: string;
  /** Coarse top-level domain — used in the catalog filter sidebar. */
  domain: "Image Quality" | "Mathematics" | "Computer Science" | "Other";
  /** One-line summary shown on the catalog card. Author this; don't auto-derive. */
  summary: string;
  /** The dynamically-imported MDX component (loaded only when the reader opens the lesson). */
  Component: LazyExoticComponent<ComponentType>;
  /** Frontmatter pulled at load time. */
  frontmatter: Promise<LessonFrontmatter>;
}

/**
 * Resolve the lesson's frontmatter eagerly so the catalog can render its card
 * without waiting for the full component bundle.
 *
 * The MDX module's `frontmatter` is typed as `Record<string, unknown>` by the
 * MDX plugin. We trust the lesson author's frontmatter shape and cast once at
 * the boundary; downstream consumers see the strongly-typed
 * `LessonFrontmatter`.
 */
function loadFrontmatter(
  importer: () => Promise<{ frontmatter?: Record<string, unknown> }>,
): Promise<LessonFrontmatter> {
  return importer().then((m) => {
    const fm = (m.frontmatter ?? {}) as Partial<LessonFrontmatter>;
    return {
      title: fm.title ?? "Untitled",
      tag: fm.tag ?? "",
      tags: fm.tags ?? [],
      last_updated: fm.last_updated ?? "",
      estimated_time: fm.estimated_time ?? "",
      widgets_used: fm.widgets_used,
      prerequisites: fm.prerequisites,
    };
  });
}

// Use a function so Vite's tree-shaking picks up the static imports for
// frontmatter while still allowing the component-side `lazy()` to defer the
// runtime JSX bundle.
const afineImport = () => import("./afine.mdx");
const linAlgImport = () => import("./linear-algebra.mdx");

export const LESSONS: LessonRegistryEntry[] = [
  {
    slug: "afine",
    domain: "Image Quality",
    summary:
      "Build up A-FINE end-to-end: classical baselines (PSNR, SSIM), the CNN-feature family, and A-FINE's CLIP-backed adaptive metric with all five computational components.",
    Component: lazy(afineImport),
    frontmatter: loadFrontmatter(afineImport),
  },
  {
    slug: "linear-algebra-foundations",
    domain: "Mathematics",
    summary:
      "Elementary linear algebra anchored on interactive plots: scalars, vectors as drag-able arrows, vector addition by head-to-tail composition, scalar multiplication as stacked copies, and 2×2 matrices as transformations of the plane.",
    Component: lazy(linAlgImport),
    frontmatter: loadFrontmatter(linAlgImport),
  },
];

export function findLesson(slug: string): LessonRegistryEntry | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
