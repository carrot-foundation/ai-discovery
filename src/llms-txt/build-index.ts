import type { IndexInput, IndexLink, IndexSection } from "./types.js";

const escapeMarkdown = (value: string): string =>
  value
    .trim()
    .replace(/\r?\n+/gu, " ")
    .replace(/\\/gu, "\\\\")
    .replace(/([[\]()`*_~>#+\-=|{}])/gu, "\\$1");

const formatUrl = (value: string): string =>
  `<${value
    .trim()
    .replace(/\r?\n+/gu, "")
    .replace(/</gu, "%3C")
    .replace(/>/gu, "%3E")}>`;

const formatLink = (l: IndexLink): string =>
  l.description !== undefined
    ? `- [${escapeMarkdown(l.title)}](${formatUrl(l.url)}): ${escapeMarkdown(l.description)}`
    : `- [${escapeMarkdown(l.title)}](${formatUrl(l.url)})`;

const formatSection = (s: IndexSection): string =>
  [`## ${escapeMarkdown(s.title)}`, "", ...s.urls.map(formatLink)].join("\n");

export const buildIndex = (input: IndexInput): string => {
  const lines: string[] = [];
  lines.push(`# ${input.site.name}`);
  lines.push("");
  lines.push(`> ${input.site.tagline}`);
  lines.push("");
  lines.push(input.site.url);
  lines.push("");
  for (const section of input.sections) {
    lines.push(formatSection(section));
    lines.push("");
  }
  return lines.join("\n");
};
