import { describe, expect, it } from "vitest";
import { isoDate, language, schemaId, url } from "../../src/jsonld/types.js";

describe("isoDate", () => {
  it("accepts a valid ISO-8601 date", () => {
    expect(isoDate.parse("2026-05-06")).toBe("2026-05-06");
  });

  it("accepts a valid ISO-8601 datetime", () => {
    expect(isoDate.parse("2026-05-06T12:30:00Z")).toBe("2026-05-06T12:30:00Z");
  });

  it("rejects non-ISO strings", () => {
    expect(() => isoDate.parse("not-a-date")).toThrow();
  });

  it("rejects impossible calendar dates", () => {
    expect(() => isoDate.parse("2026-02-31")).toThrow();
    expect(() => isoDate.parse("2026-13-01")).toThrow();
  });
});

describe("url", () => {
  it("accepts a valid https URL", () => {
    expect(url.parse("https://carrot.eco/x")).toBe("https://carrot.eco/x");
  });

  it("rejects relative URLs", () => {
    expect(() => url.parse("/x")).toThrow();
  });
});

describe("language", () => {
  it("accepts BCP-47 language tags", () => {
    expect(language.parse("en")).toBe("en");
    expect(language.parse("pt-BR")).toBe("pt-BR");
  });

  it("rejects garbage", () => {
    expect(() => language.parse("english")).toThrow();
  });
});

describe("schemaId", () => {
  it("produces a stable @id by hashing the input", () => {
    const a = schemaId("https://carrot.eco", "org");
    const b = schemaId("https://carrot.eco", "org");
    expect(a).toBe(b);
    expect(a.startsWith("https://carrot.eco/#org-")).toBe(true);
  });

  it("normalizes and encodes the @id kind fragment", () => {
    const id = schemaId("https://carrot.eco/", " blog post ");
    expect(id.startsWith("https://carrot.eco/#blog%20post-")).toBe(true);
    expect(() => schemaId("https://carrot.eco", "   ")).toThrow(
      "kind must be non-empty",
    );
  });
});
