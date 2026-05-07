export type IndexNowFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface SubmitIndexNowUrlsOptions {
  readonly host: string;
  readonly key: string;
  readonly keyLocation: string;
  readonly urls: readonly string[];
  readonly fetch: IndexNowFetch;
  readonly endpoint?: string;
}

export type IndexNowSubmitResult =
  | {
      readonly ok: true;
      readonly status: number;
      readonly submittedUrls: readonly string[];
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: "indexnow_http_error" | "indexnow_fetch_error";
      readonly message: string;
      readonly submittedUrls: readonly string[];
    };
