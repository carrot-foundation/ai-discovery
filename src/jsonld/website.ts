import { z } from "zod";
import { language, schemaId, url } from "./types.js";

const inputSchema = z.object({
  name: z.string().min(1),
  url,
  inLanguage: z.array(language).min(1),
  searchUrlTemplate: z.string().optional(),
});

export type WebSiteInput = z.input<typeof inputSchema>;

export const website = (input: WebSiteInput): Record<string, unknown> => {
  const parsed = inputSchema.parse(input);
  const node: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": schemaId(parsed.url, "website"),
    name: parsed.name,
    url: parsed.url,
    inLanguage: parsed.inLanguage,
  };
  if (parsed.searchUrlTemplate !== undefined) {
    node.potentialAction = {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: parsed.searchUrlTemplate },
      "query-input": "required name=query",
    };
  }
  return node;
};
