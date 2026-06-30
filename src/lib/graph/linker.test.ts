import { describe, it, expect } from "vitest";
import { linkConceptsToHtml, CONCEPT_INDEX } from "./linker";

describe("concept linker", () => {
  it("links a known concept to its owning lesson", () => {
    const out = linkConceptsToHtml("Here we use the dot product to project.");
    expect(out).toContain('href="#/lesson/linear-algebra-dot-product"');
    expect(out).toContain(">dot product<");
  });

  it("matches an alias", () => {
    const out = linkConceptsToHtml("We multiply matrices here.");
    expect(out).toContain('href="#/lesson/linear-algebra-matrices"');
  });

  it("does not self-link the excluded lesson", () => {
    const out = linkConceptsToHtml("The dot product is the key idea.", {
      excludeSlug: "linear-algebra-dot-product",
    });
    expect(out).not.toContain("concept-link");
  });

  it("caps to one link per target lesson", () => {
    const out = linkConceptsToHtml("dot product, then dot product, then dot product");
    expect((out.match(/concept-link/g) || []).length).toBe(1);
  });

  it("HTML-escapes the input (no injection from generated prose)", () => {
    const out = linkConceptsToHtml("<script>alert(1)</script> uses a vector");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("the concept index is populated", () => {
    expect(CONCEPT_INDEX.length).toBeGreaterThan(15);
  });
});
