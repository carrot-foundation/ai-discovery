interface MediaRange {
  readonly type: string;
  readonly subtype: string;
  readonly q: number;
}

// RFC 9110 §5.6.2 token characters except `*`: RFC 6838 §4.2 names never
// contain one, so a wildcard is only ever a whole component (see isMediaRange).
// Input is lowercased first.
const NAME = /^[!#$%&'+.^_`|~0-9a-z-]+$/u;

// RFC 9110 §12.4.2: a weight is 0 to 1 with at most three decimals.
const Q_VALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u;

// RFC 9110 §12.5.1: `*/*`, `type/*` or `type/subtype`.
const isMediaRange = (type: string, subtype: string): boolean =>
  (type === "*" && subtype === "*") ||
  (NAME.test(type) && (subtype === "*" || NAME.test(subtype)));

const parseRange = (part: string): MediaRange | undefined => {
  const [range = "", ...params] = part.split(";");
  const [type = "", subtype = "", extra] = range
    .trim()
    .toLowerCase()
    .split("/");
  if (!isMediaRange(type, subtype) || extra !== undefined) return undefined;
  let q = 1;
  for (const param of params) {
    const [name = "", value = ""] = param.split("=");
    if (name.trim().toLowerCase() !== "q") continue;
    if (!Q_VALUE.test(value.trim())) return undefined;
    q = Number(value.trim());
  }
  return { type, subtype, q };
};

const specificity = (range: MediaRange, type: string, subtype: string) => {
  if (range.type === type && range.subtype === subtype) return 3;
  if (range.type === type && range.subtype === "*") return 2;
  if (range.type === "*" && range.subtype === "*") return 1;
  return 0;
};

// The most specific matching range sets the weight; a repeated range keeps
// its highest weight. A type no range matches is not acceptable (0).
const weightOf = (ranges: readonly MediaRange[], mediaType: string): number => {
  const [type = "", subtype = ""] = mediaType.split("/");
  let best = { specificity: 0, q: 0 };
  for (const range of ranges) {
    const s = specificity(range, type, subtype);
    if (s === 0 || s < best.specificity) continue;
    best =
      s > best.specificity
        ? { specificity: s, q: range.q }
        : { specificity: s, q: Math.max(best.q, range.q) };
  }
  return best.q;
};

/**
 * Decides from a request's `Accept` header whether the canonical URL should
 * answer with the page's Markdown instead of its HTML (RFC 9110 §12.5.1).
 *
 * Markdown wins only when the client weighs `text/markdown` strictly above
 * `text/html`. A tie, a wildcard alone, a malformed header or no header
 * keeps HTML, so browsers never get Markdown by accident. Ranges match on
 * type and subtype alone: media-type parameters other than `q` are ignored,
 * so `text/markdown;profile=x` counts as `text/markdown`. A response that
 * varies on this must send `Vary: Accept`.
 */
export const prefersMarkdown = (accept: string | null | undefined): boolean => {
  if (accept === null || accept === undefined || accept.trim() === "") {
    return false;
  }
  const ranges: MediaRange[] = [];
  for (const part of accept.split(",")) {
    if (part.trim() === "") continue;
    const range = parseRange(part);
    // Dropping one bad range could zero out text/html and flip the answer,
    // so a header we cannot fully read never asks for Markdown.
    if (range === undefined) return false;
    ranges.push(range);
  }
  return weightOf(ranges, "text/markdown") > weightOf(ranges, "text/html");
};
