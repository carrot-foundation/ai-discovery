interface MediaRange {
  readonly type: string;
  readonly subtype: string;
  /** Media-type parameters other than `q`, names and values lowercased. */
  readonly params: ReadonlyMap<string, string>;
  readonly q: number;
}

// RFC 9110 §5.6.2 token characters. Input is lowercased first.
const TOKEN = /^[!#$%&'*+.^_`|~0-9a-z-]+$/u;

// RFC 9110 §12.4.2: a weight is 0 to 1 with at most three decimals.
const Q_VALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u;

// Both representations are served as UTF-8 with no other parameters, so a
// range naming any other parameter value does not apply to them.
const SERVED_PARAMS: ReadonlyMap<string, string> = new Map([
  ["charset", "utf-8"],
]);

const parseRange = (part: string): MediaRange | undefined => {
  const [range = "", ...rawParams] = part.split(";");
  const [type = "", subtype = "", extra] = range
    .trim()
    .toLowerCase()
    .split("/");
  if (!TOKEN.test(type) || !TOKEN.test(subtype) || extra !== undefined) {
    return undefined;
  }
  let q = 1;
  const params = new Map<string, string>();
  for (const param of rawParams) {
    const separator = param.indexOf("=");
    if (separator === -1) return undefined;
    const name = param.slice(0, separator).trim().toLowerCase();
    const value = param.slice(separator + 1).trim();
    if (!TOKEN.test(name)) return undefined;
    if (name === "q") {
      if (!Q_VALUE.test(value)) return undefined;
      q = Number(value);
    } else {
      params.set(name, value.replace(/^"(.*)"$/u, "$1").toLowerCase());
    }
  }
  return { type, subtype, params, q };
};

// RFC 9110 §12.5.1: a more specific range overrides a less specific one, and
// parameters make a range more specific. 0 means the range does not apply.
const specificity = (
  range: MediaRange,
  type: string,
  subtype: string,
): number => {
  for (const [name, value] of range.params) {
    if (SERVED_PARAMS.get(name) !== value) return 0;
  }
  const withParams = range.params.size > 0 ? 1 : 0;
  if (range.type === type && range.subtype === subtype) return 6 + withParams;
  if (range.type === type && range.subtype === "*") return 4 + withParams;
  if (range.type === "*" && range.subtype === "*") return 2 + withParams;
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
 * keeps HTML, so browsers never get Markdown by accident. Both
 * representations count as UTF-8 with no other parameters: a range such as
 * `text/markdown;profile=x` does not apply to them. A response that varies
 * on this must send `Vary: Accept`.
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
