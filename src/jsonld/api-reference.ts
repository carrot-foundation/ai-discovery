import { z } from "zod";
import { url } from "./types.js";

const inputSchema = z.object({
  name: z.string().min(1),
  url,
  apiName: z.string().min(1),
  apiUrl: url,
  description: z.string().min(1),
});

export type ApiReferenceInput = z.input<typeof inputSchema>;

export const apiReference = (
  input: ApiReferenceInput,
): Record<string, unknown> => {
  const parsed = inputSchema.parse(input);
  return {
    "@type": "APIReference",
    "@id": parsed.url,
    name: parsed.name,
    url: parsed.url,
    description: parsed.description,
    targetApi: { "@type": "WebAPI", name: parsed.apiName, url: parsed.apiUrl },
  };
};
