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
      "- [TRC](<https://docs.carrot.eco/en/docs/concepts/trc>): A Tonne of Recycled CO2.",
    );
  });

  it("renders an optional section description between heading and links", () => {
    const out = buildIndex({
      site: {
        name: "Carrot Documentation",
        url: "https://docs.carrot.eco",
        tagline: "The reference for the Carrot Network.",
      },
      sections: [
        {
          title: "Concepts",
          description: "Core vocabulary used across the network.",
          urls: [
            {
              title: "TRC",
              url: "https://docs.carrot.eco/en/docs/concepts/trc",
            },
          ],
        },
      ],
    });
    expect(out).toContain(
      "## Concepts\n\nCore vocabulary used across the network.\n\n- [TRC](<https://docs.carrot.eco/en/docs/concepts/trc>)",
    );
  });

  it("omits the description block when no section description is provided", () => {
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
            },
          ],
        },
      ],
    });
    expect(out).toContain(
      "## Concepts\n\n- [TRC](<https://docs.carrot.eco/en/docs/concepts/trc>)",
    );
  });

  it("escapes markdown-sensitive link and section text", () => {
    const out = buildIndex({
      site: {
        name: "Carrot Documentation",
        url: "https://docs.carrot.eco",
        tagline: "The reference for the Carrot Network.",
      },
      sections: [
        {
          title: "Concepts [AI]",
          description: "Notes *with* _markdown_ [chars]",
          urls: [
            {
              title: "TRC [core]",
              url: "https://docs.carrot.eco/search?q={query}",
              description: "Line one\nLine [two]",
            },
          ],
        },
      ],
    });

    expect(out).toContain("# Carrot Documentation");
    expect(out).toContain("> The reference for the Carrot Network.");
    expect(out).toContain("<https://docs.carrot.eco>");
    expect(out).toContain("## Concepts \\[AI\\]");
    expect(out).toContain("Notes \\*with\\* \\_markdown\\_ \\[chars\\]");
    expect(out).toContain(
      "- [TRC \\[core\\]](<https://docs.carrot.eco/search?q={query}>): Line one Line \\[two\\]",
    );
  });

  it("treats an empty or whitespace-only description as absent", () => {
    const out = buildIndex({
      site: {
        name: "Carrot Documentation",
        url: "https://docs.carrot.eco",
        tagline: "The reference for the Carrot Network.",
      },
      sections: [
        {
          title: "Concepts",
          description: "   ",
          urls: [
            {
              title: "TRC",
              url: "https://docs.carrot.eco/en/docs/concepts/trc",
            },
          ],
        },
      ],
    });
    expect(out).toContain(
      "## Concepts\n\n- [TRC](<https://docs.carrot.eco/en/docs/concepts/trc>)",
    );
    expect(out).not.toMatch(/## Concepts\n\n\n/u);
  });
});
