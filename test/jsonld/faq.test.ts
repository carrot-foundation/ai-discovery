import { describe, expect, it } from "vitest";
import { faqPage } from "../../src/jsonld/faq.js";

describe("faqPage", () => {
  it("emits FAQPage with Question/Answer pairs", () => {
    const node = faqPage([
      { question: "What is TRC?", answer: "A Tonne of Recycled CO2." },
      {
        question: "Is Carrot a token?",
        answer: "No, Carrot issues credits as NFTs.",
      },
    ]);
    expect(node["@type"]).toBe("FAQPage");
    const items = node.mainEntity as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      "@type": "Question",
      name: "What is TRC?",
      acceptedAnswer: { "@type": "Answer", text: "A Tonne of Recycled CO2." },
    });
  });

  it("rejects empty FAQ", () => {
    expect(() => faqPage([])).toThrow();
  });
});
