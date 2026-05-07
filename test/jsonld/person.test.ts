import { describe, expect, it } from "vitest";
import { person } from "../../src/jsonld/person.js";

describe("person", () => {
  it("produces a Person node with sameAs links", () => {
    const node = person({
      name: "Cris Santos",
      url: "https://carrot.eco/team/cris",
      jobTitle: "Software Engineer",
      affiliation: "Carrot Foundation",
      sameAs: ["https://www.linkedin.com/in/crissantosdev"],
    });
    expect(node["@type"]).toBe("Person");
    expect(node.name).toBe("Cris Santos");
    expect(node.jobTitle).toBe("Software Engineer");
    expect(node.affiliation).toMatchObject({
      "@type": "Organization",
      name: "Carrot Foundation",
    });
    expect(node.sameAs).toEqual(["https://www.linkedin.com/in/crissantosdev"]);
  });
});
