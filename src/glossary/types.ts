export interface GlossaryTermRequest {
  readonly term: string;
  readonly locale: string;
}

export type GlossaryTermResult =
  | {
      readonly ok: true;
      readonly term: string;
      readonly locale: string;
      readonly definition: string;
      readonly url?: string;
      readonly aliases?: readonly string[];
    }
  | {
      readonly ok: false;
      readonly code:
        | "http_error"
        | "mcp_error"
        | "invalid_response"
        | "fetch_error";
      readonly message: string;
      readonly status?: number;
    };

export interface GlossaryCache {
  get(key: string): GlossaryTermResult | undefined;
  set(key: string, value: GlossaryTermResult): void;
}

export interface MemoryGlossaryCacheOptions {
  readonly ttlMs: number;
  readonly now?: () => number;
}

export type GlossaryFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface DocsGlossaryClient {
  readonly endpoint: string;
  readonly fetch: GlossaryFetch;
  readonly cache?: GlossaryCache;
}

export interface CreateDocsGlossaryClientOptions {
  readonly endpoint: string;
  readonly fetch: GlossaryFetch;
  readonly cache?: GlossaryCache;
}
