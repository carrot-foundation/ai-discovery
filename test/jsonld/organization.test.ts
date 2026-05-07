import { describe, expect, it } from "vitest";
import { organization } from "../../src/jsonld/organization.js";

describe("organization", () => {
  it("returns a Schema.org Organization graph node", () => {
    const node = organization({
      name: "Carrot Foundation",
      url: "https://carrot.eco",
      logo: "https://carrot.eco/logo.png",
      sameAs: [
        "https://github.com/carrot-foundation",
        "https://www.linkedin.com/company/carrot-foundation",
      ],
    });
    expect(node["@type"]).toBe("Organization");
    expect(node["@id"]).toMatch(/^https:\/\/carrot\.eco\/#org-/u);
    expect(node.name).toBe("Carrot Foundation");
    expect(node.url).toBe("https://carrot.eco");
    expect(node.logo).toBe("https://carrot.eco/logo.png");
    expect(node.sameAs).toHaveLength(2);
  });

  it("rejects relative URLs", () => {
    expect(() =>
      organization({ name: "X", url: "/x", logo: "/logo.png" }),
    ).toThrow();
  });
});
