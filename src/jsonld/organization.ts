import { z } from "zod";
import { schemaId, url } from "./types.js";

// A `Person` node from `person()`, or a `{ "@id" }` reference to one. The
// input stays a plain record so `person()` output passes as is.
const founderSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (node) =>
      (node["@type"] === "Person" && typeof node.name === "string") ||
      (Object.keys(node).length === 1 && url.safeParse(node["@id"]).success),
    'must be a Person node from person() or an { "@id" } reference',
  );

const inputSchema = z.object({
  name: z.string().min(1),
  alternateName: z.string().min(1).optional(),
  url,
  logo: url,
  description: z.string().optional(),
  sameAs: z.array(url).default([]),
  founder: founderSchema.optional(),
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
    ...(parsed.alternateName !== undefined && {
      alternateName: parsed.alternateName,
    }),
    url: parsed.url,
    logo: parsed.logo,
    ...(parsed.description !== undefined && {
      description: parsed.description,
    }),
    sameAs: parsed.sameAs,
    ...(parsed.founder !== undefined && { founder: parsed.founder }),
  };
};
