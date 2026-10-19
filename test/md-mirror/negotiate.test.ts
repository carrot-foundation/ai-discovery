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
    ["text/*;q=0.1, */*;q=0.9, text/markdown;q=0.5", true],
    ["text/html;q=0, */*;q=0.5, text/markdown;q=0.3", true],
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

  it.each([
    "text/markdown;q=abc",
    "text/markdown;q=1.5",
    "markdown, text/html;q=0.1",
    "text/markdown;q=abc, text/markdown;q=0.4",
    "text/html;q=abc, text/markdown",
    "text/html;q=.9, text/markdown",
    "text/html@;q=1, text/markdown;q=0.5",
    "text/markdown, text/ht ml;q=1",
    "text/ht(ml;q=1, text/markdown",
    "te@xt/html, text/markdown",
    "*/html;q=1, text/markdown;q=0.5",
    "te*xt/html;q=1, text/markdown;q=0.5",
    "text/ht*ml;q=1, text/markdown;q=0.5",
    'text/markdown;profile="a, text/html;q=0.5',
    'text/markdown;profile="a\\',
    "text/markdown;q=0.9=x, text/html;q=0.5",
  ])("keeps HTML when any range in %j is malformed", (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  it.each([
    ['text/markdown;profile="a,b";q=0.9, text/html;q=0.5', true],
    ['text/markdown;profile="a\\"b,c";q=0.9, text/html;q=0.5', true],
    ['text/html;profile="a,b";q=0.4, text/markdown;q=0.5', true],
    ['text/markdown;q=0.1;profile="a;q=0.9;b", text/html;q=0.5', false],
    ['text/html;q=0.5;profile="a,text/markdown;q=1;b"', false],
  ])(
    "keeps a comma or semicolon inside a quoted parameter value in %j",
    (accept, expected) => {
      expect(prefersMarkdown(accept)).toBe(expected);
    },
  );

  it("skips empty list elements", () => {
    expect(prefersMarkdown("text/markdown,, text/html;q=0.5,")).toBe(true);
  });

  it("reads parameters other than q without letting them change the weight", () => {
    expect(
      prefersMarkdown("text/markdown;charset=utf-8;q=0.9, text/html;q=0.5"),
    ).toBe(true);
    expect(prefersMarkdown("text/markdown;Q=0.9, text/html;q=0.5")).toBe(true);
  });

  it.each([
    ["text/markdown;q=0.2, text/markdown;q=0.9, text/html;q=0.5", true],
    ["text/markdown;q=0.9, text/markdown;q=0.2, text/html;q=0.5", true],
    ["text/html;q=0.1, text/html;q=0.8, text/markdown;q=0.5", false],
  ])(
    "takes the highest q when the same range repeats in %j",
    (accept, expected) => {
      expect(prefersMarkdown(accept)).toBe(expected);
    },
  );
});
