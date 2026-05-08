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

    const shared = parseSharedDocsEnvelope(envelope, status);
    if (shared !== null) return shared;

    return parseFlatTermPayload(envelope, status);
  } catch {
    return invalidResponse("Glossary term envelope was not valid JSON", status);
  }
}

function parseSharedDocsEnvelope(
  envelope: Record<string, unknown>,
  status: number,
): GlossaryTermResult | null {
  if (envelope.success !== true || !isRecord(envelope.results)) return null;

  const term = envelope.results.term;
  if (term === null) {
    return invalidResponse(
      "Glossary term envelope did not include a term",
      status,
    );
  }
  if (!isRecord(term)) {
    return invalidResponse("Glossary term envelope was incomplete", status);
  }

  return parseTermPayload(term, status, "name");
}

function parseFlatTermPayload(
  envelope: Record<string, unknown>,
  status: number,
): GlossaryTermResult {
  return parseTermPayload(envelope, status, "term");
}

function parseTermPayload(
  payload: Record<string, unknown>,
  status: number,
  nameField: "name" | "term",
): GlossaryTermResult {
  const termValue = payload[nameField];
  if (
    typeof termValue !== "string" ||
    typeof payload.locale !== "string" ||
    typeof payload.definition !== "string"
  ) {
    return invalidResponse("Glossary term envelope was incomplete", status);
  }

  const baseResult = {
    ok: true,
    term: termValue,
    locale: payload.locale,
    definition: payload.definition,
  } as const;
  const url = typeof payload.url === "string" ? payload.url : undefined;
  const aliases =
    Array.isArray(payload.aliases) &&
    payload.aliases.every((alias) => typeof alias === "string")
      ? payload.aliases
      : undefined;

  if (url !== undefined && aliases !== undefined) {
    return { ...baseResult, url, aliases };
  }
  if (url !== undefined) return { ...baseResult, url };
  if (aliases !== undefined) return { ...baseResult, aliases };
  return baseResult;
}

function invalidResponse(message: string, status: number): GlossaryTermResult {
  return { ok: false, code: "invalid_response", message, status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
