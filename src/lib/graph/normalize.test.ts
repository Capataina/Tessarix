import { describe, it, expect } from "vitest";
import { normalizeToken, normalizePhrase } from "./normalize";

describe("normalize", () => {
  it("folds regular plurals to their singular", () => {
    expect(normalizeToken("matrices")).toBe("matrix");
    expect(normalizeToken("vectors")).toBe("vector");
    expect(normalizeToken("multiplications")).toBe("multiplication");
  });

  it("lowercases and strips edge punctuation", () => {
    expect(normalizeToken("Matrix,")).toBe("matrix");
    expect(normalizeToken("(vector)")).toBe("vector");
  });

  it("lemmatises a multiword phrase consistently on both sides", () => {
    // The whole point: an inflected mention folds to the same lemma sequence
    // as the canonical concept name, so they match.
    expect(normalizePhrase("matrices multiplications")).toEqual(["matrix", "multiplication"]);
    expect(normalizePhrase("Matrix Multiplication")).toEqual(["matrix", "multiplication"]);
  });
});
