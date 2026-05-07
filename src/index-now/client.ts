import type {
  IndexNowSubmitResult,
  SubmitIndexNowUrlsOptions,
} from "./types.js";

const DEFAULT_INDEX_NOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

export function normalizeIndexNowUrls(
  input: readonly string[],
  host: string,
): string[] {
  const expectedHost = host.toLowerCase();
  const urls = new Set<string>();

  for (const value of input) {
    const parsed = parseUrl(value);
    if (!parsed) continue;
    if (parsed.protocol !== "https:") continue;
    if (parsed.hostname.toLowerCase() !== expectedHost) continue;

    parsed.hash = "";
    urls.add(parsed.href);
  }

  return [...urls];
}

export async function submitIndexNowUrls(
  options: SubmitIndexNowUrlsOptions,
): Promise<IndexNowSubmitResult> {
  const submittedUrls = normalizeIndexNowUrls(options.urls, options.host);
  const endpoint = options.endpoint ?? DEFAULT_INDEX_NOW_ENDPOINT;

  try {
    const response = await options.fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: options.host,
        key: options.key,
        keyLocation: options.keyLocation,
        urlList: submittedUrls,
      }),
    });

    if (response.status === 200 || response.status === 202) {
      return { ok: true, status: response.status, submittedUrls };
    }

    return {
      ok: false,
      status: response.status,
      code: "indexnow_http_error",
      message: `IndexNow request failed with status ${response.status}`,
      submittedUrls,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "indexnow_fetch_error",
      message: "IndexNow request failed before receiving a response",
      submittedUrls,
    };
  }
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}
