import { describe, expect, it } from "vitest";
import { buildSearchIndex, searchIndex } from "../../src/orama/index.js";

describe("searchIndex", () => {
  it("returns deterministic URL order for equal keyword matches", async () => {
    const index = await buildSearchIndex([
      {
        id: "en/blog/b",
        title: "B MassID",
        url: "https://www.carrot.eco/en/blog/b",
        text: "MassID traceability",
        locale: "en",
        kind: "post",
      },
      {
        id: "en/blog/a",
        title: "A MassID",
        url: "https://www.carrot.eco/en/blog/a",
        text: "MassID traceability",
        locale: "en",
        kind: "post",
      },
    ]);

    const results = await searchIndex(index, { query: "massid", limit: 5 });

    expect(results.map((result) => result.url)).toEqual([
      "https://www.carrot.eco/en/blog/a",
      "https://www.carrot.eco/en/blog/b",
    ]);
  });

  it("applies result limits", async () => {
    const index = await buildSearchIndex([
      {
        id: "en/blog/a",
        title: "MassID A",
        url: "https://www.carrot.eco/en/blog/a",
        text: "MassID traceability",
        locale: "en",
        kind: "post",
      },
      {
        id: "en/blog/b",
        title: "MassID B",
        url: "https://www.carrot.eco/en/blog/b",
        text: "MassID traceability",
        locale: "en",
        kind: "post",
      },
    ]);

    expect(
      await searchIndex(index, { query: "massid", limit: 1 }),
    ).toHaveLength(1);
  });
});
