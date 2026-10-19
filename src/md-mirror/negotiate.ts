interface MediaRange {
  readonly type: string;
  readonly subtype: string;
  readonly q: number;
}

// RFC 9110 §5.6.2 token characters except `*`: RFC 6838 §4.2 names never
// contain one, so a wildcard is only ever a whole component (see isMediaRange).
// Checked on the text as sent, before lowercasing, with no `i` flag: Unicode
// case folding would let the Kelvin sign through as `k`.
const NAME = /^[!#$%&'+.^_`|~0-9A-Za-z-]+$/u;

// RFC 9110 §5.6.2 token: a parameter name, or an unquoted parameter value.
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

// RFC 9110 §5.6.4 quoted-string: printable text, `\` escaping the next character.
const QUOTED_STRING =
  /^"(?:[\t \u0021\u0023-\u005B\u005D-\u007E\u0080-\u00FF]|\\[\t \u0021-\u007E\u0080-\u00FF])*"$/u;

// RFC 9110 §12.4.2: a weight is 0 to 1 with at most three decimals.
const Q_VALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u;

// RFC 9110 §5.6.3: optional whitespace is SP and HTAB only. String.trim() also
// strips NBSP, line terminators and other Unicode spaces, which are not OWS.
const isOws = (char: string | undefined): boolean =>
  char === " " || char === "\t";

const trimOws = (text: string): string => {
  let start = 0;
  let end = text.length;
  while (start < end && isOws(text[start])) start += 1;
  while (end > start && isOws(text[end - 1])) end -= 1;
  return text.slice(start, end);
};

// RFC 9110 §12.5.1: `*/*`, `type/*` or `type/subtype`.
const isMediaRange = (type: string, subtype: string): boolean =>
  (type === "*" && subtype === "*") ||
  (NAME.test(type) && (subtype === "*" || NAME.test(subtype)));

// RFC 9110 §5.6.4: a quoted-string may hold `,` and `;`, so a separator only
// counts outside one. An unterminated quote leaves the text unreadable.
const splitOutsideQuotes = (
  input: string,
  separator: string,
): string[] | undefined => {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === "\\") i += 1;
      else if (char === '"') quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      parts.push(input.slice(start, i));
      start = i + 1;
    }
  }
  if (quoted) return undefined;
  parts.push(input.slice(start));
  return parts;
};

// RFC 9110 §5.6.6: `token=value` with a token or quoted-string value and no
// whitespace around `=`. Only the first `=` splits, so `q=0.9=x` has the value
// `0.9=x`, which is not a token.
const parseParameter = (
  text: string,
): { name: string; value: string } | undefined => {
  const separator = text.indexOf("=");
  if (separator === -1) return undefined;
  const name = text.slice(0, separator);
  const value = text.slice(separator + 1);
  const wellFormed =
    TOKEN.test(name) && (TOKEN.test(value) || QUOTED_STRING.test(value));
  return wellFormed ? { name, value } : undefined;
};

const parseRange = (part: string): MediaRange | undefined => {
  // Quotes are balanced by now, so the fallback only keeps the type total.
  const [range = "", ...params] = splitOutsideQuotes(part, ";") ?? [];
  const [type = "", subtype = "", extra] = trimOws(range).split("/");
  if (!isMediaRange(type, subtype) || extra !== undefined) return undefined;
  let q = 1;
  for (const raw of params) {
    const text = trimOws(raw);
    // RFC 9110 §5.6.6 lets a parameter be empty, as after a trailing `;`.
    if (text === "") continue;
    const param = parseParameter(text);
    if (param === undefined) return undefined;
    if (param.name.toLowerCase() !== "q") continue;
    if (!Q_VALUE.test(param.value)) return undefined;
    q = Number(param.value);
  }
  // Both are ASCII by now, so lowercasing only folds A-Z.
  return { type: type.toLowerCase(), subtype: subtype.toLowerCase(), q };
};

const EXPLICIT = 3;

const specificity = (range: MediaRange, type: string, subtype: string) => {
  if (range.type === type && range.subtype === subtype) return EXPLICIT;
  if (range.type === type && range.subtype === "*") return 2;
  if (range.type === "*" && range.subtype === "*") return 1;
  return 0;
};

interface Weight {
  /** Specificity of the range that set `q`; 0 when no range matches. */
  readonly specificity: number;
  readonly q: number;
}

// The most specific matching range sets the weight; a repeated range keeps
// its highest weight. A type no range matches is not acceptable (0).
const weightOf = (ranges: readonly MediaRange[], mediaType: string): Weight => {
  const [type = "", subtype = ""] = mediaType.split("/");
  let best: Weight = { specificity: 0, q: 0 };
  for (const range of ranges) {
    const s = specificity(range, type, subtype);
    if (s === 0 || s < best.specificity) continue;
    best =
      s > best.specificity
        ? { specificity: s, q: range.q }
        : { specificity: s, q: Math.max(best.q, range.q) };
  }
  return best;
};

/**
 * Decides from a request's `Accept` header whether the canonical URL should
 * answer with the page's Markdown instead of its HTML (RFC 9110 §12.5.1).
 *
 * Markdown wins when the client weighs `text/markdown` strictly above
 * `text/html`. At equal weight above 0, a range that names `text/markdown`
 * beats `text/html` matched only through a wildcard (`text/*`, or the range
 * for all media types), so an agent that names `text/markdown` next to a
 * catch-all gets Markdown. Equal weight keeps HTML when both are named, or
 * when both match through wildcards alone. A Markdown weight of 0, a
 * malformed header or no header keeps HTML too, so browsers never get
 * Markdown by accident. Ranges match on type and subtype alone: media-type
 * parameters other than `q` are ignored, so `text/markdown;profile=x` counts
 * as `text/markdown`. They are still parsed, though: a parameter that is not
 * `name=value` (RFC 9110 §5.6.6) makes the header malformed. Ranges are read
 * as sent: type and subtype take ASCII token characters only and match
 * case-insensitively on A-Z, and only SP and HTAB count as whitespace
 * (RFC 9110 §5.6.3), so an NBSP or a Kelvin sign makes the header malformed.
 * A response that varies on this must send `Vary: Accept`.
 */
export const prefersMarkdown = (accept: string | null | undefined): boolean => {
  if (accept === null || accept === undefined || trimOws(accept) === "") {
    return false;
  }
  const parts = splitOutsideQuotes(accept, ",");
  if (parts === undefined) return false;
  const ranges: MediaRange[] = [];
  for (const part of parts) {
    if (trimOws(part) === "") continue;
    const range = parseRange(part);
    // Dropping one bad range could zero out text/html and flip the answer,
    // so a header we cannot fully read never asks for Markdown.
    if (range === undefined) return false;
    ranges.push(range);
  }
  const markdown = weightOf(ranges, "text/markdown");
  const html = weightOf(ranges, "text/html");
  // Without this, `text/markdown;q=0, */*;q=0` would win the tie-break below.
  if (markdown.q === 0) return false;
  if (markdown.q !== html.q) return markdown.q > html.q;
  // RFC 9110 leaves equal weights to the server. Naming Markdown while
  // reaching HTML only through a catch-all is an explicit ask for Markdown.
  return markdown.specificity === EXPLICIT && html.specificity < EXPLICIT;
};
