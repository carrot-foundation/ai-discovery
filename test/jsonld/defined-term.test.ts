import { describe, expect, it } from "vitest";
import { definedTerm, definedTermSet } from "../../src/jsonld/defined-term.js";

describe("definedTerm", () => {
  it("builds a DefinedTerm with termCode and partOf", () => {
    const node = definedTerm({
      termCode: "TRC",
      name: "TRC",
      description: "A Tonne of Recycled CO2.",
      url: "https://docs.carrot.eco/en/docs/glossary#trc",
      inDefinedTermSet: "https://docs.carrot.eco/en/docs/glossary",
    });
    expect(node["@type"]).toBe("DefinedTerm");
    expect(node.termCode).toBe("TRC");
    expect(node.inDefinedTermSet).toBe(
      "https://docs.carrot.eco/en/docs/glossary",
    );
  });
});

describe("definedTermSet", () => {
  it("builds a DefinedTermSet with @id", () => {
    const node = definedTermSet({
      name: "Carrot Glossary",
      url: "https://docs.carrot.eco/en/docs/glossary",
    });
    expect(node["@type"]).toBe("DefinedTermSet");
    expect(node["@id"]).toBe("https://docs.carrot.eco/en/docs/glossary");
  });
});
