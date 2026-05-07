import type { FullPage } from "./types.js";

export interface BuildFullInput {
  readonly pages: readonly FullPage[];
}

export const buildFull = ({ pages }: BuildFullInput): string => {
  const blocks: string[] = [];
  for (const page of pages) {
    blocks.push(`<!-- source: ${page.url} -->`);
    blocks.push("");
    blocks.push(page.markdown.trim());
    blocks.push("");
    blocks.push("---");
    blocks.push("");
  }
  return blocks.join("\n");
};
