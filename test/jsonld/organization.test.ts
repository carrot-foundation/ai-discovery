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

  it("emits alternateName and founder only when given", () => {
    const base = {
      name: "Carrot",
      url: "https://carrot.eco",
      logo: "https://carrot.eco/logo.png",
    };
    const founder = {
      "@type": "Person",
      "@id": "https://carrot.eco/#p",
      name: "Jane Doe",
    };
    expect(organization(base)).not.toHaveProperty("alternateName");
    expect(organization(base)).not.toHaveProperty("founder");
    const node = organization({
      ...base,
      alternateName: "Carrot Foundation",
      founder,
    });
    expect(node.alternateName).toBe("Carrot Foundation");
    expect(node.founder).toEqual(founder);
  });

  it("accepts a founder given as an @id reference", () => {
    const node = organization({
      name: "Carrot",
      url: "https://carrot.eco",
      logo: "https://carrot.eco/logo.png",
      founder: { "@id": "https://carrot.eco/#p" },
    });
    expect(node.founder).toEqual({ "@id": "https://carrot.eco/#p" });
  });

  it.each([
    [{}],
    [{ name: "Jane Doe" }],
    [{ "@type": "Organization", name: "Jane Doe" }],
    [{ "@id": "/p" }],
    [{ "@id": "https://carrot.eco/#p", name: "Jane Doe" }],
  ])(
    "rejects a founder that is neither a Person nor a reference: %j",
    (founder) => {
      expect(() =>
        organization({
          name: "Carrot",
          url: "https://carrot.eco",
          logo: "https://carrot.eco/logo.png",
          founder,
        }),
      ).toThrow();
    },
  );

  it("rejects relative URLs", () => {
    expect(() =>
      organization({ name: "X", url: "/x", logo: "/logo.png" }),
    ).toThrow();
  });
});
