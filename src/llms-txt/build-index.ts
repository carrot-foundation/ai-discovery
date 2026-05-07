import type { IndexInput, IndexLink, IndexSection } from "./types.js";

const formatLink = (l: IndexLink): string =>
  l.description !== undefined
    ? `- [${l.title}](${l.url}): ${l.description}`
    : `- [${l.title}](${l.url})`;

const formatSection = (s: IndexSection): string =>
  [`## ${s.title}`, "", ...s.urls.map(formatLink)].join("\n");

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
