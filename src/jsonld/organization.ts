import { z } from "zod";
import { schemaId, url } from "./types.js";

// A `Person` node with a name, or a reference to one: `{ "@id" }`, optionally
// typed `"@type": "Person"`. Any `@id` must be an absolute URL. The input
// stays a plain record so `person()` output passes as is.
const isFounder = (node: Record<string, unknown>): boolean => {
  const { "@id": id, "@type": type, ...rest } = node;
  if (id !== undefined && !url.safeParse(id).success) return false;
  if (type === "Person" && typeof rest.name === "string" && rest.name !== "") {
    return true;
  }
  return (
    id !== undefined &&
    Object.keys(rest).length === 0 &&
    (type === undefined || type === "Person")
  );
};

const founderSchema = z
  .record(z.string(), z.unknown())
  .refine(
    isFounder,
    'must be a Person node from person() or an { "@id" } reference',
  );

const inputSchema = z.object({
  name: z.string().min(1),
  alternateName: z.string().min(1).optional(),
  url,
  logo: url,
  description: z.string().optional(),
  sameAs: z.array(url).default([]),
  /** A `Person` node from `person()`, or an `{ "@id" }` reference to one. */
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
