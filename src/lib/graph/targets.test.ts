import { describe, it, expect } from "vitest";
import { buildTargetIndex } from "./targets";

describe("target index — header harvesting", () => {
  const index = buildTargetIndex();

  it("enriches an authored concept with its section anchor", () => {
    // 'PSNR' is a teaches concept of afine AND has a '### PSNR — …' header, so
    // the matching surface form deep-links to that section, not the lesson top.
    // (The longer alias 'peak signal-to-noise ratio' has a different key and
    // keeps the lesson-top link — only the header-matching form is enriched.)
    const psnr = index.find((t) => t.slug === "afine" && t.lemmas.join(" ") === "psnr");
    expect(psnr).toBeTruthy();
    expect(psnr?.anchor).toBeTruthy();
  });

  it("adds a header-only concept as a new global (strong) target", () => {
    // '## The naturalness head' is not in afine's `teaches`, so it becomes a new
    // strong target pointing at its section.
    const nat = index.find(
      (t) => t.slug === "afine" && t.lemmas.join(" ") === "naturalness head",
    );
    expect(nat).toBeTruthy();
    expect(nat?.scope).toBe("strong");
    expect(nat?.anchor).toBe("the-naturalness-head");
  });
});
