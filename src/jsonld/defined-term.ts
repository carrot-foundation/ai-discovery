import { z } from "zod";
import { url } from "./types.js";

const termSchema = z.object({
  termCode: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  url,
  inDefinedTermSet: url,
});

export type DefinedTermInput = z.input<typeof termSchema>;

export const definedTerm = (
  input: DefinedTermInput,
): Record<string, unknown> => {
  const parsed = termSchema.parse(input);
  return {
    "@type": "DefinedTerm",
    "@id": parsed.url,
    name: parsed.name,
    termCode: parsed.termCode,
    description: parsed.description,
    url: parsed.url,
    inDefinedTermSet: parsed.inDefinedTermSet,
  };
};

const setSchema = z.object({
  name: z.string().min(1),
  url,
  description: z.string().optional(),
});

export type DefinedTermSetInput = z.input<typeof setSchema>;

export const definedTermSet = (
  input: DefinedTermSetInput,
): Record<string, unknown> => {
  const parsed = setSchema.parse(input);
  return {
    "@type": "DefinedTermSet",
    "@id": parsed.url,
    name: parsed.name,
    url: parsed.url,
    ...(parsed.description !== undefined && {
      description: parsed.description,
    }),
  };
};
