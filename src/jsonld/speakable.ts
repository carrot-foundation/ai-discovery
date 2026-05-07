import { z } from "zod";

const inputSchema = z.object({
  cssSelectors: z.array(z.string().trim().min(1)).min(1),
});

export type SpeakableInput = z.input<typeof inputSchema>;

export const speakable = (input: SpeakableInput): Record<string, unknown> => {
  const parsed = inputSchema.parse(input);
  return {
    "@type": "SpeakableSpecification",
    cssSelector: parsed.cssSelectors,
  };
};
