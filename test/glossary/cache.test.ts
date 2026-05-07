import { describe, expect, it } from "vitest";
import {
  createDocsGlossaryClient,
  createMemoryGlossaryCache,
  getGlossaryTerm,
} from "../../src/glossary/index.js";

describe("memory glossary cache", () => {
  it("normalizes term and locale cache keys", async () => {
    let fetchCount = 0;
    const cache = createMemoryGlossaryCache({ ttlMs: 1_000, now: () => 1_000 });
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      cache,
      fetch: async () => {
        fetchCount += 1;
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  term: "TRC",
                  locale: "en",
                  definition: "Tonne of Recycled CO2.",
                }),
              },
            ],
          },
        });
      },
    });

    await getGlossaryTerm(client, { term: "TRC", locale: "en" });
    await getGlossaryTerm(client, { term: " trc ", locale: "EN" });

    expect(fetchCount).toBe(1);
  });

  it("expires entries after the configured TTL", async () => {
    let now = 1_000;
    let fetchCount = 0;
    const cache = createMemoryGlossaryCache({ ttlMs: 100, now: () => now });
    const client = createDocsGlossaryClient({
      endpoint: "https://docs.carrot.eco/mcp",
      cache,
      fetch: async () => {
        fetchCount += 1;
        return Response.json({
          jsonrpc: "2.0",
          id: fetchCount,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  term: "TRC",
                  locale: "en",
                  definition: `Definition ${fetchCount}`,
                }),
              },
            ],
          },
        });
      },
    });

    await getGlossaryTerm(client, { term: "TRC", locale: "en" });
    now = 1_101;
    const result = await getGlossaryTerm(client, { term: "TRC", locale: "en" });

    expect(fetchCount).toBe(2);
    expect(result).toMatchObject({ ok: true, definition: "Definition 2" });
  });
});
