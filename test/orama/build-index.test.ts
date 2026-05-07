import { describe, expect, it } from "vitest";
import { buildSearchIndex, searchIndex } from "../../src/orama/index.js";
import type { SearchDocument } from "../../src/orama/index.js";

const docs: SearchDocument[] = [
  {
    id: "en/blog/a",
    title: "MassID launch",
    url: "https://www.carrot.eco/en/blog/a",
    text: "MassID traceability",
    locale: "en",
    kind: "post",
  },
];

describe("buildSearchIndex", () => {
  it("builds a searchable keyword index from documents", async () => {
    const index = await buildSearchIndex(docs);
    const results = await searchIndex(index, { query: "massid", limit: 5 });

    expect(results).toEqual([
      {
        id: "en/blog/a",
        title: "MassID launch",
        url: "https://www.carrot.eco/en/blog/a",
        locale: "en",
        kind: "post",
        score: expect.any(Number),
      },
    ]);
  });
});
