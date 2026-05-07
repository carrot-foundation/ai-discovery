import { describe, expect, it } from "vitest";
import { buildFull } from "../../src/llms-txt/build-full.js";

describe("buildFull", () => {
  it("joins pages with H1 source URLs", () => {
    const out = buildFull({
      pages: [
        { url: "https://docs.carrot.eco/x", title: "X", markdown: "# X\nbody" },
        { url: "https://docs.carrot.eco/y", title: "Y", markdown: "# Y\nbody" },
      ],
    });
    expect(out).toContain("<!-- source: https://docs.carrot.eco/x -->");
    expect(out).toContain("<!-- source: https://docs.carrot.eco/y -->");
    expect(out.indexOf("X")).toBeLessThan(out.indexOf("Y"));
  });
});
