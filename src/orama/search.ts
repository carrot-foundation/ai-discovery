import { search } from "@orama/orama";
import type {
  SearchDocument,
  SearchIndex,
  SearchIndexRequest,
  SearchResult,
} from "./types.js";

export async function searchIndex(
  index: SearchIndex,
  request: SearchIndexRequest,
): Promise<SearchResult[]> {
  const limit = normalizePositiveInteger(request.limit ?? 10, "limit");
  const offset = normalizePositiveInteger(request.offset ?? 0, "offset");
  const results = await search<typeof index.db, SearchDocument>(index.db, {
    term: request.query,
    properties: ["title", "text"],
    limit: limit + offset,
  });

  return results.hits
    .map((hit) => ({
      id: hit.document.id,
      title: hit.document.title,
      url: hit.document.url,
      locale: hit.document.locale,
      kind: hit.document.kind,
      score: hit.score,
    }))
    .sort(compareSearchResults)
    .slice(offset, offset + limit);
}

function compareSearchResults(left: SearchResult, right: SearchResult): number {
  const score = right.score - left.score;
  if (score !== 0) return score;
  const url = left.url.localeCompare(right.url);
  if (url !== 0) return url;
  return left.title.localeCompare(right.title);
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}
