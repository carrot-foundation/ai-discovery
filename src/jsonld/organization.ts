import { z } from "zod";
import { schemaId, url } from "./types.js";

const inputSchema = z.object({
  name: z.string().min(1),
  url,
  logo: url,
  description: z.string().optional(),
  sameAs: z.array(url).default([]),
});

export type OrganizationInput = z.input<typeof inputSchema>;

export const organization = (
  input: OrganizationInput,
): Record<string, unknown> => {
  const parsed = inputSchema.parse(input);
  return {
    "@type": "Organization",
    "@id": schemaId(parsed.url, "org"),
    name: parsed.name,
    url: parsed.url,
    logo: parsed.logo,
    ...(parsed.description !== undefined && {
      description: parsed.description,
    }),
    sameAs: parsed.sameAs,
  };
};
