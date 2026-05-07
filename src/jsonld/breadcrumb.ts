import { z } from "zod";
import { url } from "./types.js";

const crumbSchema = z.object({ name: z.string().min(1), url });
const inputSchema = z.array(crumbSchema).min(1);

export type Breadcrumb = z.input<typeof crumbSchema>;

export const breadcrumbList = (
  crumbs: readonly Breadcrumb[],
): Record<string, unknown> => {
  const parsed = inputSchema.parse(crumbs);
  return {
    "@type": "BreadcrumbList",
    itemListElement: parsed.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
};
