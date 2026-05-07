import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  deserializeSearchIndex,
  searchIndex,
  serializeSearchIndex,
} from "../../src/orama/index.js";

describe("search index serialization", () => {
  it("round-trips a search index", async () => {
    const index = await buildSearchIndex([
      {
        id: "en/blog/a",
        title: "MassID launch",
        url: "https://www.carrot.eco/en/blog/a",
        text: "MassID traceability",
        locale: "en",
        kind: "post",
      },
    ]);

    const restored = deserializeSearchIndex(serializeSearchIndex(index));
    const results = await searchIndex(restored, { query: "traceability" });

    expect(results).toHaveLength(1);
    const firstResult = results[0];
    if (firstResult === undefined) {
      throw new Error("Expected one search result");
    }
    expect(firstResult).toMatchObject({
      id: "en/blog/a",
      title: "MassID launch",
      url: "https://www.carrot.eco/en/blog/a",
      locale: "en",
      kind: "post",
    });
  });
});
