import { describe, expect, it } from "vitest";
import { apiReference } from "../../src/jsonld/api-reference.js";

describe("apiReference", () => {
  it("builds an APIReference attached to a WebAPI", () => {
    const node = apiReference({
      name: "POST /v1/credit-orders",
      url: "https://docs.carrot.eco/en/docs/integrations/api/authentication",
      apiName: "Carrot API",
      apiUrl: "https://api.carrot.eco/v1",
      description: "Create a new credit order.",
    });
    expect(node["@type"]).toBe("APIReference");
    expect((node.targetApi as Record<string, unknown>)["@type"]).toBe("WebAPI");
    expect((node.targetApi as Record<string, unknown>).name).toBe("Carrot API");
  });
});
