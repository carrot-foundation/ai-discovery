import { describe, expect, it } from "vitest";
import { prefersMarkdown } from "../../src/md-mirror/negotiate.js";

describe("prefersMarkdown", () => {
  it.each([
    ["text/markdown", true],
    ["text/markdown, text/html;q=0.9", true],
    ["text/html;q=0.5, text/markdown", true],
    ["text/markdown, */*;q=0.1", true],
    ["text/markdown;q=0.8, text/html;q=0.7, */*;q=0.1", true],
    ["TEXT/MARKDOWN", true],
    [" text/markdown ; q=1.000 , text/html ; q=0.999 ", true],
  ])("serves Markdown for %j", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });

  it.each([
    ["text/html", false],
    ["text/html, text/markdown", false],
    ["text/markdown;q=0.9, text/html;q=0.9", false],
    ["text/markdown;q=0.5, text/html", false],
    ["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", false],
  ])("keeps HTML for %j (q-values, ties go to HTML)", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });

  it.each([
    ["*/*", false],
    ["text/*", false],
    ["text/markdown;q=0.5, text/*", false],
    ["text/*;q=0.5, text/markdown", true],
    ["*/*;q=0.9, text/markdown;q=0.2", false],
  ])("lets the most specific range win for %j", (accept, expected) => {
    expect(prefersMarkdown(accept)).toBe(expected);
  });

  it.each([
    ["text/markdown;q=0", false],
    ["text/markdown, text/html;q=0", true],
    ["text/plain", false],
  ])(
    "treats a type with q=0 or no match as unacceptable for %j",
    (accept, expected) => {
      expect(prefersMarkdown(accept)).toBe(expected);
    },
  );

  it("keeps HTML when the header is absent or empty", () => {
    expect(prefersMarkdown(undefined)).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("")).toBe(false);
    expect(prefersMarkdown("   ")).toBe(false);
  });

  it("ignores malformed ranges instead of trusting them", () => {
    expect(prefersMarkdown("text/markdown;q=abc")).toBe(false);
    expect(prefersMarkdown("text/markdown;q=1.5")).toBe(false);
    expect(prefersMarkdown("markdown, text/html;q=0.1")).toBe(false);
    expect(prefersMarkdown("text/markdown;q=abc, text/markdown;q=0.4")).toBe(
      true,
    );
  });

  it("takes the highest q when the same range repeats", () => {
    expect(
      prefersMarkdown(
        "text/markdown;q=0.2, text/markdown;q=0.9, text/html;q=0.5",
      ),
    ).toBe(true);
  });
});
