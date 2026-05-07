import { create, load, save } from "@orama/orama";
import {
  SEARCH_SCHEMA,
  type SearchIndex,
  type SerializedSearchIndex,
} from "./types.js";

export function serializeSearchIndex(
  index: SearchIndex,
): SerializedSearchIndex {
  return { raw: save(index.db) };
}

export function deserializeSearchIndex(
  serialized: SerializedSearchIndex,
): SearchIndex {
  const db = create({ schema: SEARCH_SCHEMA });
  load(db, serialized.raw);
  return { db };
}
