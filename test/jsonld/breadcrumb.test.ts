import { describe, expect, it } from "vitest";
import { breadcrumbList } from "../../src/jsonld/breadcrumb.js";

describe("breadcrumbList", () => {
  it("numbers items starting at 1", () => {
    const node = breadcrumbList([
      { name: "Docs", url: "https://docs.carrot.eco" },
      { name: "Concepts", url: "https://docs.carrot.eco/en/docs/concepts" },
      { name: "TRC", url: "https://docs.carrot.eco/en/docs/concepts/trc" },
    ]);
    expect(node["@type"]).toBe("BreadcrumbList");
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Docs",
      item: "https://docs.carrot.eco",
    });
    expect(items[2]).toMatchObject({ position: 3, name: "TRC" });
  });

  it("rejects empty crumb list", () => {
    expect(() => breadcrumbList([])).toThrow();
  });
});
