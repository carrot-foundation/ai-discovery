import { describe, expect, it } from "vitest";
import { speakable } from "../../src/jsonld/speakable.js";

describe("speakable", () => {
  it("builds a SpeakableSpecification with cssSelector", () => {
    const node = speakable({ cssSelectors: [".tldr", ".summary"] });
    expect(node).toEqual({
      "@type": "SpeakableSpecification",
      cssSelector: [".tldr", ".summary"],
    });
  });

  it("rejects empty selectors", () => {
    expect(() => speakable({ cssSelectors: [] })).toThrow();
    expect(() => speakable({ cssSelectors: ["   "] })).toThrow();
  });
});
