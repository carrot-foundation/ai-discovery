import { describe, expect, it } from "vitest";
import { website } from "../../src/jsonld/website.js";

describe("website", () => {
  it("returns a Schema.org WebSite node with SearchAction", () => {
    const node = website({
      name: "Carrot Documentation",
      url: "https://docs.carrot.eco",
      searchUrlTemplate: "https://docs.carrot.eco/api/search?q={query}",
      inLanguage: ["en", "pt-BR"],
    });
    expect(node["@type"]).toBe("WebSite");
    expect(node.name).toBe("Carrot Documentation");
    expect(node.inLanguage).toEqual(["en", "pt-BR"]);
    const action = node.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect((action.target as Record<string, unknown>).urlTemplate).toBe(
      "https://docs.carrot.eco/api/search?q={query}",
    );
  });

  it("omits SearchAction when no search URL template provided", () => {
    const node = website({
      name: "Carrot",
      url: "https://carrot.eco",
      inLanguage: ["en"],
    });
    expect(node.potentialAction).toBeUndefined();
  });

  it("rejects search URL templates without the query placeholder", () => {
    expect(() =>
      website({
        name: "Carrot Documentation",
        url: "https://docs.carrot.eco",
        searchUrlTemplate:
          "https://docs.carrot.eco/api/search?q={search_term_string}",
        inLanguage: ["en"],
      }),
    ).toThrow();
  });
});
