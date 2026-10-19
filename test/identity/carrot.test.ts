import { describe, expect, it } from "vitest";
import {
  CARROT_FOUNDER,
  CARROT_ORGANIZATION,
  carrotFounder,
  carrotOrganization,
} from "../../src/identity/carrot.js";
import { compose } from "../../src/jsonld/compose.js";

const SUBSTACK = "https://ianmckee.substack.com/";

describe("CARROT_ORGANIZATION", () => {
  it("carries the canonical name, alternate name and description", () => {
    expect(CARROT_ORGANIZATION.name).toBe("Carrot");
    expect(CARROT_ORGANIZATION.alternateName).toBe("Carrot Foundation");
    expect(CARROT_ORGANIZATION.description).toBe(
      "Carrot is building digital public infrastructure for the low-carbon circular economy.",
    );
  });

  it("lists only Carrot's own profiles in sameAs", () => {
    expect(CARROT_ORGANIZATION.sameAs).not.toContain(SUBSTACK);
    CARROT_ORGANIZATION.sameAs.forEach((link) => {
      expect(link).toMatch(/^https:\/\//u);
    });
  });
});

describe("carrotOrganization", () => {
  const node = carrotOrganization();

  it("keeps the @id the Carrot sites already publish", () => {
    expect(node["@type"]).toBe("Organization");
    expect(node["@id"]).toBe("https://www.carrot.eco/#org-cede9263");
  });

  it("renders the canonical fields", () => {
    expect(node).toMatchObject({
      name: "Carrot",
      alternateName: "Carrot Foundation",
      url: "https://www.carrot.eco",
      logo: "https://www.carrot.eco/carrot-brand-originalcolor.svg",
      description:
        "Carrot is building digital public infrastructure for the low-carbon circular economy.",
    });
    expect(node.sameAs).toEqual(CARROT_ORGANIZATION.sameAs);
  });

  it("names Ian McKee as founder, carrying his personal Substack", () => {
    expect(node.founder).toEqual(carrotFounder());
    expect(node.founder).toMatchObject({
      "@type": "Person",
      name: "Ian McKee",
      sameAs: [SUBSTACK],
    });
  });

  it("composes into a JSON-LD document", () => {
    const doc = compose([node]);
    expect(doc["@context"]).toBe("https://schema.org");
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe("carrotFounder", () => {
  it("gives the founder a stable @id under carrot.eco", () => {
    const node = carrotFounder();
    expect(node["@id"]).toBe(CARROT_FOUNDER.id);
    expect(node["@id"]).toMatch(/^https:\/\/www\.carrot\.eco\/#person-/u);
    expect(node).toMatchObject({
      name: "Ian McKee",
      jobTitle: "President",
      url: "https://ianmckee.com",
    });
  });
});
