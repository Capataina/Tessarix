import { describe, it, expect } from "vitest";
import { linkToSegments, findHits, type LinkOpts } from "./match";

const MATHS: LinkOpts = { activeCategory: "Mathematics", mode: "normal" };
const ML: LinkOpts = { activeCategory: "Machine Learning", mode: "normal" };

function slugs(text: string, opts: LinkOpts): string[] {
  return findHits(text, opts).map((h) => h.target.slug);
}

describe("prose linker — scope gating", () => {
  it("links a strong concept from ANY domain", () => {
    // 'matrix' is strong → links even while the reader is in an ML lesson.
    expect(slugs("Consider a matrix here.", ML)).toContain("linear-algebra-matrices");
  });

  it("links a contextual concept only inside its own domain", () => {
    // 'basis' is contextual (Mathematics only).
    expect(slugs("Pick a basis for the space.", MATHS)).toContain("linear-algebra-basis");
    expect(slugs("Pick a basis for the space.", ML)).not.toContain("linear-algebra-basis");
  });

  it("'all' mode links contextual concepts cross-domain too", () => {
    expect(slugs("Pick a basis.", { activeCategory: "Machine Learning", mode: "all" })).toContain(
      "linear-algebra-basis",
    );
  });

  it("'none' mode links nothing", () => {
    expect(findHits("a matrix and a basis", { activeCategory: "Mathematics", mode: "none" })).toHaveLength(0);
  });
});

describe("prose linker — matching", () => {
  it("folds inflected forms via the lemmatiser", () => {
    expect(slugs("stacking matrices multiplications", MATHS)).toContain(
      "linear-algebra-matrix-operations",
    );
  });

  it("prefers the longest phrase (matrix multiplication over matrix)", () => {
    expect(findHits("the matrix multiplication step", MATHS)[0].target.slug).toBe(
      "linear-algebra-matrix-operations",
    );
  });

  it("self-excludes the lesson being read", () => {
    expect(slugs("A basis here", { ...MATHS, excludeSlug: "linear-algebra-basis" })).not.toContain(
      "linear-algebra-basis",
    );
  });

  it("caps to one link per target per block", () => {
    const s = slugs("matrix then matrix then matrix", MATHS);
    expect(s.filter((x) => x === "linear-algebra-matrices")).toHaveLength(1);
  });

  it("does not mislink the common word 'base' to basis (precision guard)", () => {
    // 'bases' was dropped as a basis alias precisely so noun('bases')='base'
    // can't drag "base case" into the basis lesson.
    expect(slugs("the base case of the induction", MATHS)).not.toContain("linear-algebra-basis");
  });
});

describe("prose linker — segments", () => {
  it("returns a single text segment for concept-free prose", () => {
    expect(linkToSegments("hello there friend", MATHS)).toEqual([
      { kind: "text", text: "hello there friend" },
    ]);
  });

  it("wraps a matched concept in a link segment", () => {
    const link = linkToSegments("a matrix here", MATHS).find((s) => s.kind === "link");
    expect(link).toMatchObject({ slug: "linear-algebra-matrices", text: "matrix" });
  });
});
