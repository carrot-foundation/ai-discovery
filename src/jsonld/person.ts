import { z } from "zod";
import { url } from "./types.js";

const inputSchema = z.object({
  name: z.string().min(1),
  url: url.optional(),
  jobTitle: z.string().optional(),
  affiliation: z.string().optional(),
  sameAs: z.array(url).default([]),
});

export type PersonInput = z.input<typeof inputSchema>;

export const person = (input: PersonInput): Record<string, unknown> => {
  const parsed = inputSchema.parse(input);
  const node: Record<string, unknown> = {
    "@type": "Person",
    name: parsed.name,
  };
  if (parsed.url !== undefined) {
    node["@id"] = parsed.url;
    node.url = parsed.url;
  }
  if (parsed.jobTitle !== undefined) node.jobTitle = parsed.jobTitle;
  if (parsed.affiliation !== undefined) {
    node.affiliation = { "@type": "Organization", name: parsed.affiliation };
  }
  if (parsed.sameAs.length > 0) node.sameAs = parsed.sameAs;
  return node;
};
