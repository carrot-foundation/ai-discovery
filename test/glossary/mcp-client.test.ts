import { describe, expect, it } from "vitest";
import {
  createDocsGlossaryClient,
  getGlossaryTerm,
} from "../../src/glossary/index.js";

describe("docs glossary MCP client", () => {
  it("calls the public get_glossary_term tool with only term and locale", async () => {
    const requests: Array<{ input: string; init: RequestInit | undefined }> =
      [];
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      fetch: async (input, init) => {
        requests.push({ input: String(input), init });
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  tool: "get_glossary_term",
                  request: { term: "TRC", locale: "en" },
                  resolution: { resolved_locale: "en" },
                  results: {
                    term: {
                      name: "TRC",
                      locale: "en",
                      definition: "Tokenized Recycling Credit.",
                      url: "https://docs.carrot.eco/en/docs/glossary#trc",
                      aliases: ["tokenized recycling credit"],
                    },
                  },
                }),
              },
            ],
          },
        });
      },
    });

    const result = await getGlossaryTerm(client, { term: "TRC", locale: "en" });
    expect(requests).toHaveLength(1);
    const firstRequest = requests[0];
    if (firstRequest === undefined) {
      throw new Error("Expected one captured request");
    }
    if (firstRequest.init === undefined) {
      throw new Error("Expected captured request init");
    }
    if (firstRequest.init.body === undefined) {
      throw new Error("Expected captured request body");
    }
    const headers = new Headers(firstRequest.init.headers);

    expect(result).toMatchObject({
      ok: true,
      term: "TRC",
      locale: "en",
      definition: "Tokenized Recycling Credit.",
      url: "https://docs.carrot.eco/en/docs/glossary#trc",
      aliases: ["tokenized recycling credit"],
    });
    expect(headers.has("authorization")).toBe(false);
    expect(JSON.parse(String(firstRequest.init.body))).toEqual({
      jsonrpc: "2.0",
      id: "get_glossary_term:en:trc",
      method: "tools/call",
      params: {
        name: "get_glossary_term",
        arguments: { term: "TRC", locale: "en" },
      },
    });
  });

  it("keeps parsing the legacy flat term envelope", async () => {
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      fetch: async () =>
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  term: "TRC",
                  locale: "en",
                  definition: "Tokenized Recycling Credit.",
                  url: "https://docs.carrot.eco/en/docs/glossary#trc",
                }),
              },
            ],
          },
        }),
    });

    await expect(
      getGlossaryTerm(client, { term: "TRC", locale: "en" }),
    ).resolves.toEqual({
      ok: true,
      term: "TRC",
      locale: "en",
      definition: "Tokenized Recycling Credit.",
      url: "https://docs.carrot.eco/en/docs/glossary#trc",
    });
  });

  it("returns a typed invalid response when Docs MCP returns term null", async () => {
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      fetch: async () =>
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  tool: "get_glossary_term",
                  request: { term: "unknown", locale: "en" },
                  resolution: { resolved_locale: "en" },
                  results: { term: null },
                }),
              },
            ],
          },
        }),
    });

    await expect(
      getGlossaryTerm(client, { term: "unknown", locale: "en" }),
    ).resolves.toEqual({
      ok: false,
      code: "invalid_response",
      message: "Glossary term envelope did not include a term",
      status: 200,
    });
  });

  it("returns typed HTTP failures", async () => {
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      fetch: async () => new Response("raw secret body", { status: 500 }),
    });

    const result = await getGlossaryTerm(client, { term: "TRC", locale: "en" });

    expect(result).toEqual({
      ok: false,
      code: "http_error",
      message: "Docs glossary request failed with status 500",
      status: 500,
    });
    expect(JSON.stringify(result)).not.toContain("raw secret body");
  });

  it("returns typed JSON-RPC failures", async () => {
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      fetch: async () =>
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32602, message: "Unknown term" },
        }),
    });

    await expect(
      getGlossaryTerm(client, { term: "unknown", locale: "en" }),
    ).resolves.toEqual({
      ok: false,
      code: "mcp_error",
      message: "Unknown term",
      status: 200,
    });
  });
});
