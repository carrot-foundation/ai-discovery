import { describe, expect, it } from "vitest";
import { article } from "../../src/jsonld/article.js";

const BASE = {
  url: "https://carrot.eco/posts/regenerative-finance-101",
  headline: "Regenerative Finance 101",
  description:
    "A primer on the regenerative-finance category and how Carrot fits.",
  datePublished: "2026-04-15",
  dateModified: "2026-05-01",
  author: {
    name: "Cris Santos",
    url: "https://carrot.eco/team/cris",
    sameAs: [],
  },
  inLanguage: "en",
  image: "https://carrot.eco/og/posts/regenerative-finance-101.png",
};

describe("article", () => {
  it("emits a BlogPosting by default", () => {
    expect(article(BASE)["@type"]).toBe("BlogPosting");
  });

  it("emits TechArticle when type=tech-article", () => {
    expect(article({ ...BASE, type: "tech-article" })["@type"]).toBe(
      "TechArticle",
    );
  });

  it("emits HowTo when type=how-to with steps", () => {
    const node = article({
      ...BASE,
      type: "how-to",
      steps: [
        { name: "Step one", text: "Do the first thing." },
        { name: "Step two", text: "Do the second thing." },
      ],
    });
    expect(node["@type"]).toBe("HowTo");
    expect(Array.isArray(node.step)).toBe(true);
  });

  it("rejects how-to without steps", () => {
    expect(() => article({ ...BASE, type: "how-to" })).toThrow();
  });

  it("embeds dateModified and inLanguage", () => {
    const node = article(BASE);
    expect(node.dateModified).toBe("2026-05-01");
    expect(node.inLanguage).toBe("en");
  });
});
