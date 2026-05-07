import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };

describe("package exports", () => {
  it("exports Phase 1 modules", () => {
    expect(packageJson.exports).toHaveProperty("./mcp-server");
    expect(packageJson.exports).toHaveProperty("./orama");
    expect(packageJson.exports).toHaveProperty("./index-now");
    expect(packageJson.exports).toHaveProperty("./glossary");
  });
});
