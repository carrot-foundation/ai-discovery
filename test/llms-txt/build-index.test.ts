import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/llms-txt/build-index.js";

describe("buildIndex", () => {
  it("emits a header, intro, and one section per group", () => {
    const out = buildIndex({
      site: {
        name: "Carrot Documentation",
        url: "https://docs.carrot.eco",
        tagline: "The reference for the Carrot Network.",
      },
      sections: [
        {
          title: "Concepts",
          urls: [
            {
              title: "TRC",
              url: "https://docs.carrot.eco/en/docs/concepts/trc",
              description: "A Tonne of Recycled CO2.",
            },
            {
              title: "TCC",
              url: "https://docs.carrot.eco/en/docs/concepts/tcc",
              description: "A Tonne of Captured CO2.",
            },
          ],
        },
      ],
    });
    expect(out).toMatch(/^# Carrot Documentation\n/u);
    expect(out).toContain("> The reference for the Carrot Network.");
    expect(out).toContain("## Concepts");
    expect(out).toContain(
      "- [TRC](https://docs.carrot.eco/en/docs/concepts/trc): A Tonne of Recycled CO2.",
    );
  });
});
