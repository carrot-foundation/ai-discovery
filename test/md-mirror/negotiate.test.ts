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
    "text/markdown;q, text/html;q=0.5",
    "text/markdown/x, text/html;q=0.1",
  ])("keeps HTML when any range in %j is malformed", (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  // RFC 9110 §5.6.2 and §5.6.3: a range is validated as sent, with ASCII
  // letters only and optional whitespace limited to SP and HTAB. Unicode case
  // folding (the Kelvin sign lowercases to `k`) and JavaScript's trim() (which
  // strips NBSP and more) must not turn text that is not a legal range into one.
  it.each([
    ["a Kelvin sign in the subtype", "text/mar\u212Adown, text/html;q=0.5"],
    ["an NBSP before a range", "\u00A0text/markdown, text/html;q=0.5"],
    ["an NBSP after a range", "text/markdown\u00A0, text/html;q=0.5"],
    [
      "an NBSP before a semicolon",
      "text/markdown\u00A0;q=0.9, text/html;q=0.5",
    ],
    ["an NBSP after a semicolon", "text/markdown;\u00A0q=0.9, text/html;q=0.5"],
    ["an NBSP after a parameter", "text/markdown;q=0.9\u00A0, text/html;q=0.5"],
    ["an NBSP as a list element", "text/markdown,\u00A0, text/html;q=0.5"],
    ["a form feed after a range", "text/markdown\f, text/html;q=0.5"],
    ["a line feed after a range", "text/markdown\n, text/html;q=0.5"],
    [
      "a byte order mark before a range",
      "\uFEFFtext/markdown, text/html;q=0.5",
    ],
    ["an em space after a range", "text/markdown\u2003, text/html;q=0.5"],
  ])("keeps HTML for %s in %j", (_label, accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  it("trims only SP and HTAB around ranges, parameters and list elements", () => {
    expect(
      prefersMarkdown("\ttext/markdown\t;\tq=0.9\t,\t text/html ;q=0.5\t"),
    ).toBe(true);
    expect(prefersMarkdown("text/markdown,\t, text/html;q=0.5")).toBe(true);
    expect(prefersMarkdown(" \t ")).toBe(false);
  });

  it("matches type and subtype case-insensitively once they are valid", () => {
    expect(prefersMarkdown("TEXT/HTML, Text/Markdown;q=0.5")).toBe(false);
    expect(prefersMarkdown("TEXT/*;q=0.1, TEXT/MarkDown;q=0.5")).toBe(true);
    expect(prefersMarkdown("*/*;q=0.1, TEXT/HTML;q=0.2, TEXT/MARKDOWN")).toBe(
      true,
    );
  });

  // RFC 9110 §5.6.6: parameter = token "=" ( token / quoted-string ), with no
  // whitespace around "=". Only an empty parameter (a stray ";") may omit it.
  it.each([
    ["a bare parameter name", "text/markdown;foo, text/html;q=0.5"],
    ["a bare name after q", "text/markdown;q=0.9;foo, text/html;q=0.5"],
    ["a bare name on text/html", "text/html;foo;q=0.1, text/markdown;q=0.5"],
    ["an empty value", "text/markdown;foo=, text/html;q=0.5"],
    ["an empty name", "text/markdown;=x, text/html;q=0.5"],
    ["a name with a space", "text/markdown;fo o=x, text/html;q=0.5"],
    ["a name with a separator", "text/markdown;f@o=x, text/html;q=0.5"],
    ["an unquoted value with a space", "text/markdown;p=a b, text/html;q=0.5"],
    ["an unquoted value with a slash", "text/markdown;p=a/b, text/html;q=0.5"],
    ["an unquoted value with a quote", 'text/markdown;p=a"b", text/html;q=0.5'],
    ["a second equals sign", "text/markdown;p=a=b, text/html;q=0.5"],
    ["junk after a quoted value", 'text/markdown;p="a"b, text/html;q=0.5'],
    [
      "a control character in a quote",
      'text/markdown;p="a\u0001b", text/html;q=0.5',
    ],
    ["a space before the equals sign", "text/markdown;q =0.9, text/html;q=0.5"],
    ["a space after the equals sign", "text/markdown;q= 0.9, text/html;q=0.5"],
    ["a tab before the equals sign", "text/markdown;q\t=0.9, text/html;q=0.5"],
    ["a Kelvin sign in a name", "text/markdown;\u212A=x, text/html;q=0.5"],
    ["a long s in a value", "text/markdown;p=\u017F, text/html;q=0.5"],
    ["a DEL inside a quote", 'text/markdown;p="a\u007Fb", text/html;q=0.5'],
    [
      "a non-byte character in a quote",
      'text/markdown;p="a\u0100", text/html;q=0.5',
    ],
    [
      "an escaped control character",
      'text/markdown;p="a\\\u0001", text/html;q=0.5',
    ],
    [
      "an unescaped quote inside a quote",
      'text/markdown;p="a""b", text/html;q=0.5',
    ],
  ])("keeps HTML for %s in %j", (_label, accept) => {
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

  it("reads well-formed parameters other than q without letting them change the weight", () => {
    expect(
      prefersMarkdown("text/markdown;charset=utf-8;q=0.9, text/html;q=0.5"),
    ).toBe(true);
    expect(prefersMarkdown("text/markdown;Q=0.9, text/html;q=0.5")).toBe(true);
    expect(
      prefersMarkdown("text/markdown;level=1;q=0.9, text/html;q=0.5"),
    ).toBe(true);
    expect(
      prefersMarkdown('text/markdown;charset="UTF-8", text/html;q=0.5'),
    ).toBe(true);
    expect(prefersMarkdown("text/markdown;f*o_.=a*b~, text/html;q=0.5")).toBe(
      true,
    );
    expect(prefersMarkdown('text/markdown;p="", text/html;q=0.5')).toBe(true);
    expect(
      prefersMarkdown('text/markdown;p="a\\\tb \u00e9", text/html;q=0.5'),
    ).toBe(true);
  });

  it.each([
    "text/markdown;!#$%&'*+-.^_`|~09AZaz=!#$%&'*+-.^_`|~09AZaz, text/html;q=0.5",
    'text/markdown;p="a\tb", text/html;q=0.5',
    'text/markdown;p="\\\u00e9", text/html;q=0.5',
    'text/markdown;p="a\\"", text/html;q=0.5',
    'text/markdown;p="a\\\\", text/html;q=0.5',
  ])("accepts every token character and quoted-string form in %j", (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
  });

  it.each([
    "text/markdown;, text/html;q=0.5",
    "text/markdown;;q=0.9, text/html;q=0.5",
    "text/markdown; ;q=0.9, text/html;q=0.5",
    "text/markdown;q=0.9;, text/html;q=0.5",
  ])("accepts an empty parameter in %j (RFC 9110 §5.6.6)", (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
  });

  it.each([
    [
      "Chrome",
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    ],
    [
      "Firefox",
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
    ],
    [
      "Safari",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ],
    ["axios", "application/json, text/plain, */*"],
    ["curl", "*/*"],
  ])("keeps HTML for the %s Accept header", (_client, accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  it.each([
    "text/markdown;charset=utf-8",
    'text/markdown; charset="UTF-8"',
    "text/markdown;charset=utf-8, text/html;q=0.9, */*;q=0.1",
  ])("serves Markdown for the agent header %j", (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
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
