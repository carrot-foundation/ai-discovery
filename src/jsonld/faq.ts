import { z } from "zod";

const itemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});
const inputSchema = z.array(itemSchema).min(1);

export type FaqItem = z.input<typeof itemSchema>;

export const faqPage = (items: readonly FaqItem[]): Record<string, unknown> => {
  const parsed = inputSchema.parse(items);
  return {
    "@type": "FAQPage",
    mainEntity: parsed.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
};
