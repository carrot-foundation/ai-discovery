import type { Orama, RawData } from "@orama/orama";

export const SEARCH_SCHEMA = {
  id: "string",
  title: "string",
  url: "string",
  text: "string",
  locale: "string",
  kind: "string",
} as const;

export type SearchSchema = typeof SEARCH_SCHEMA;
export type SearchDatabase = Orama<SearchSchema>;

export interface SearchDocument {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly text: string;
  readonly locale: string;
  readonly kind: string;
}

export interface SearchIndex {
  readonly db: SearchDatabase;
}

export interface BuildSearchIndexOptions {
  readonly language?: string;
}

export interface SearchIndexRequest {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly locale: string;
  readonly kind: string;
  readonly score: number;
}

export interface SerializedSearchIndex {
  readonly raw: RawData;
}
