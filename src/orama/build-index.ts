import { create, insertMultiple } from "@orama/orama";
import {
  SEARCH_SCHEMA,
  type BuildSearchIndexOptions,
  type SearchDocument,
  type SearchIndex,
} from "./types.js";

export async function buildSearchIndex(
  docs: readonly SearchDocument[],
  options: BuildSearchIndexOptions = {},
): Promise<SearchIndex> {
  const db =
    options.language === undefined
      ? create({ schema: SEARCH_SCHEMA })
      : create({ schema: SEARCH_SCHEMA, language: options.language });

  await insertMultiple(
    db,
    docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      text: doc.text,
      locale: doc.locale,
      kind: doc.kind,
    })),
  );

  return { db };
}
