import { z } from "zod";
import { isoDate, language, url } from "./types.js";

const authorSchema = z.object({
  name: z.string().min(1),
  url: url.optional(),
  sameAs: z.array(url).default([]),
});

const stepSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
});

const baseSchema = z.object({
  url,
  headline: z.string().min(1).max(110),
  description: z.string().min(1),
  datePublished: isoDate,
  dateModified: isoDate,
  author: authorSchema,
  inLanguage: language,
  image: url,
});

const blogPostingSchema = baseSchema.extend({
  type: z.literal("blog-posting"),
});
const articleSchema = baseSchema.extend({ type: z.literal("article") });
const techArticleSchema = baseSchema.extend({
  type: z.literal("tech-article"),
});
const howToSchema = baseSchema.extend({
  type: z.literal("how-to"),
  steps: z.array(stepSchema).min(1),
});

const discriminatedArticleSchema = z.discriminatedUnion("type", [
  blogPostingSchema,
  articleSchema,
  techArticleSchema,
  howToSchema,
]);

type BlogPostingInput = z.input<typeof blogPostingSchema>;
type BlogPostingInputWithDefault = Omit<BlogPostingInput, "type"> & {
  readonly type?: undefined;
};

export type ArticleInput =
  | z.input<typeof discriminatedArticleSchema>
  | BlogPostingInputWithDefault;

const withDefaultArticleType = (input: unknown): unknown => {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return input;
  if ("type" in input) return input;
  return { ...input, type: "blog-posting" };
};

const TYPE_MAP = {
  "blog-posting": "BlogPosting",
  article: "Article",
  "tech-article": "TechArticle",
  "how-to": "HowTo",
} as const;

export const article = (input: ArticleInput): Record<string, unknown> => {
  const parsed = discriminatedArticleSchema.parse(
    withDefaultArticleType(input),
  );
  const node: Record<string, unknown> = {
    "@type": TYPE_MAP[parsed.type],
    "@id": parsed.url,
    headline: parsed.headline,
    description: parsed.description,
    url: parsed.url,
    datePublished: parsed.datePublished,
    dateModified: parsed.dateModified,
    inLanguage: parsed.inLanguage,
    image: parsed.image,
    author: {
      "@type": "Person",
      name: parsed.author.name,
      ...(parsed.author.url !== undefined && { url: parsed.author.url }),
      ...(parsed.author.sameAs.length > 0 && { sameAs: parsed.author.sameAs }),
    },
  };
  if (parsed.type === "how-to") {
    node.step = parsed.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    }));
  }
  return node;
};
