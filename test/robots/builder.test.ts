import { describe, expect, it } from "vitest";
import { buildRobots } from "../../src/robots/builder.js";

describe("buildRobots", () => {
  const SITEMAP = "https://docs.carrot.eco/sitemap.xml";

  it("emits a single Sitemap directive at the bottom", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    expect(out.trim().split("\n").at(-1)).toBe(`Sitemap: ${SITEMAP}`);
  });

  it("emits an explicit Allow per AI bot when allow=all-ai-bots", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    expect(out).toContain("User-agent: GPTBot");
    expect(out).toContain("User-agent: ClaudeBot");
    expect(out).toContain("User-agent: PerplexityBot");
    expect(out).toContain("User-agent: Google-Extended");
    const allowMatches = out.match(/^Allow: \/$/gm) ?? [];
    expect(allowMatches.length).toBeGreaterThanOrEqual(11);
  });

  it("still allows the universal * user-agent for ordinary search engines", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    expect(out).toMatch(/^User-agent: \*$/m);
  });

  it("disallows specific paths when given", () => {
    const out = buildRobots({
      allow: "all-ai-bots",
      sitemap: SITEMAP,
      disallowPaths: ["/api/", "/internal/"],
    });
    expect(out).toContain("Disallow: /api/");
    expect(out).toContain("Disallow: /internal/");
  });

  it("blocks training bots when allow=fetchers-only", () => {
    const out = buildRobots({ allow: "fetchers-only", sitemap: SITEMAP });
    expect(out).toMatch(/User-agent: GPTBot\nDisallow: \/$/m);
    expect(out).toMatch(/User-agent: ChatGPT-User\nAllow: \/$/m);
  });
});
