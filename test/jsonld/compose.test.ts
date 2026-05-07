import { describe, expect, it } from "vitest";
import { compose } from "../../src/jsonld/compose.js";
import { faqPage } from "../../src/jsonld/faq.js";
import { organization } from "../../src/jsonld/organization.js";

describe("compose", () => {
  it("wraps nodes in a single @graph with @context", () => {
    const graph = compose([
      organization({
        name: "Carrot Foundation",
        url: "https://carrot.eco",
        logo: "https://carrot.eco/logo.png",
      }),
      faqPage([
        { question: "What is TRC?", answer: "A Tonne of Recycled CO2." },
      ]),
    ]);
    expect(graph["@context"]).toBe("https://schema.org");
    const arr = graph["@graph"] as Array<Record<string, unknown>>;
    expect(arr).toHaveLength(2);
    expect(arr[0]?.["@type"]).toBe("Organization");
    expect(arr[1]?.["@type"]).toBe("FAQPage");
  });

  it("rejects empty input", () => {
    expect(() => compose([])).toThrow();
  });
});
