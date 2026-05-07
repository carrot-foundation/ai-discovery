import { normalizeGlossaryCacheKey } from "./cache.js";
import type {
  CreateDocsGlossaryClientOptions,
  DocsGlossaryClient,
  GlossaryTermRequest,
  GlossaryTermResult,
} from "./types.js";

export function createDocsGlossaryClient(
  options: CreateDocsGlossaryClientOptions,
): DocsGlossaryClient {
  const client: DocsGlossaryClient = {
    endpoint: options.endpoint,
    fetch: options.fetch,
  };
  if (options.cache !== undefined) return { ...client, cache: options.cache };
  return client;
}

export async function getGlossaryTerm(
  client: DocsGlossaryClient,
  request: GlossaryTermRequest,
): Promise<GlossaryTermResult> {
  const term = request.term.trim();
  const locale = request.locale.trim().toLowerCase();
  const cacheKey = normalizeGlossaryCacheKey(term, locale);
  const cached = client.cache?.get(cacheKey);
  if (cached) return cached;

  const id = `get_glossary_term:${locale}:${term.toLowerCase()}`;

  try {
    const response = await client.fetch(client.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name: "get_glossary_term",
          arguments: { term, locale },
        },
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        code: "http_error",
        message: `Docs glossary request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const body = (await response.json()) as unknown;
    const result = parseJsonRpcResult(body, response.status);
    if (result.ok) client.cache?.set(cacheKey, result);
    return result;
  } catch {
    return {
      ok: false,
      code: "fetch_error",
      message: "Docs glossary request failed before receiving a response",
    };
  }
}

function parseJsonRpcResult(body: unknown, status: number): GlossaryTermResult {
  if (!isRecord(body)) {
    return invalidResponse(
      "Docs glossary response was not a JSON object",
      status,
    );
  }

  const error = body.error;
  if (isRecord(error)) {
    const message =
      typeof error.message === "string" ? error.message : "MCP request failed";
    return { ok: false, code: "mcp_error", message, status };
  }

  const result = body.result;
  if (!isRecord(result) || !Array.isArray(result.content)) {
    return invalidResponse(
      "Docs glossary response did not include content",
      status,
    );
  }

  const textItem = result.content.find(
    (item): item is { type: "text"; text: string } =>
      isRecord(item) && item.type === "text" && typeof item.text === "string",
  );
  if (!textItem) {
    return invalidResponse(
      "Docs glossary response did not include text",
      status,
    );
  }

  return parseTermEnvelope(textItem.text, status);
}

function parseTermEnvelope(text: string, status: number): GlossaryTermResult {
  try {
    const envelope = JSON.parse(text) as unknown;
    if (!isRecord(envelope)) {
      return invalidResponse(
        "Glossary term envelope was not an object",
        status,
      );
    }
    if (
      typeof envelope.term !== "string" ||
      typeof envelope.locale !== "string" ||
      typeof envelope.definition !== "string"
    ) {
      return invalidResponse("Glossary term envelope was incomplete", status);
    }

    const baseResult = {
      ok: true,
      term: envelope.term,
      locale: envelope.locale,
      definition: envelope.definition,
    } as const;
    const url = typeof envelope.url === "string" ? envelope.url : undefined;
    const aliases =
      Array.isArray(envelope.aliases) &&
      envelope.aliases.every((alias) => typeof alias === "string")
        ? envelope.aliases
        : undefined;

    if (url !== undefined && aliases !== undefined) {
      return { ...baseResult, url, aliases };
    }
    if (url !== undefined) return { ...baseResult, url };
    if (aliases !== undefined) return { ...baseResult, aliases };
    return baseResult;
  } catch {
    return invalidResponse("Glossary term envelope was not valid JSON", status);
  }
}

function invalidResponse(message: string, status: number): GlossaryTermResult {
  return { ok: false, code: "invalid_response", message, status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
