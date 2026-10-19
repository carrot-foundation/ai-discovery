import { describe, expect, it } from "vitest";
import { AI_BOTS } from "../../src/robots/ai-bots.js";
import { buildRobots } from "../../src/robots/builder.js";

interface Group {
  readonly comment?: string;
  readonly userAgents: readonly string[];
  readonly rules: readonly string[];
}

// Splits robots.txt output into its groups so tests can assert the rules a
// given user agent receives, the way a crawler resolves them.
const parseGroups = (robots: string): Group[] =>
  robots
    .trim()
    .split(/\n{2,}/u)
    .map((block) => block.split("\n"))
    .filter((lines) => lines.some((l) => l.startsWith("User-agent: ")))
    .map((lines) => {
      const comment = lines.find((l) => l.startsWith("# "))?.slice(2);
      return {
        ...(comment !== undefined && { comment }),
        userAgents: lines
          .filter((l) => l.startsWith("User-agent: "))
          .map((l) => l.slice("User-agent: ".length)),
        rules: lines.filter(
          (l) => l.startsWith("Allow: ") || l.startsWith("Disallow: "),
        ),
      };
    });

const rulesFor = (robots: string, userAgent: string): readonly string[] => {
  const group = parseGroups(robots).find((g) =>
    g.userAgents.includes(userAgent),
  );
  if (group === undefined) throw new Error(`no group for ${userAgent}`);
  return group.rules;
};

const ROBOTS_TOKENS = AI_BOTS.flatMap((b) =>
  b.robotsToken === undefined ? [] : [b.robotsToken],
);

describe("buildRobots", () => {
  const SITEMAP = "https://docs.carrot.eco/sitemap.xml";

  it("emits a single Sitemap directive at the bottom", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    expect(out.trim().split("\n").at(-1)).toBe(`Sitemap: ${SITEMAP}`);
    expect(out.match(/^Sitemap: /gmu)).toHaveLength(1);
  });

  it("omits the Sitemap directive when no sitemap is given", () => {
    const out = buildRobots({ allow: "all-ai-bots" });
    expect(out).not.toContain("Sitemap:");
  });

  it("still allows the universal * user-agent for ordinary search engines", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    expect(rulesFor(out, "*")).toEqual(["Allow: /"]);
  });

  it("groups AI bots by intent, one commented group per intent", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    const comments = parseGroups(out).flatMap((g) =>
      g.comment === undefined ? [] : [g.comment],
    );
    expect(comments).toEqual([
      "AI training crawlers",
      "AI search indexes",
      "AI fetchers acting on a user request",
    ]);
    const training = parseGroups(out).find(
      (g) => g.comment === "AI training crawlers",
    );
    expect(training?.userAgents).toEqual(
      expect.arrayContaining(["GPTBot", "ClaudeBot", "CCBot"]),
    );
  });

  it("addresses every bot that has a robots token, and only those", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    const userAgents = parseGroups(out).flatMap((g) => g.userAgents);
    expect(userAgents).toEqual(["*", ...ROBOTS_TOKENS]);
    expect(out).not.toContain("Google-Agent");
  });

  describe("D2 policy for content sites (all-ai-bots)", () => {
    const out = buildRobots({
      allow: "all-ai-bots",
      sitemap: SITEMAP,
      disallowPaths: ["/api/"],
    });

    it.each(["OAI-SearchBot", "Claude-SearchBot", "Amzn-SearchBot"])(
      "explicitly allows %s",
      (token) => {
        expect(rulesFor(out, token)).toEqual(["Disallow: /api/", "Allow: /"]);
      },
    );

    it("keeps training crawlers open too", () => {
      for (const token of ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"]) {
        expect(rulesFor(out, token)).toEqual(["Disallow: /api/", "Allow: /"]);
      }
    });

    it("never emits a site-wide Disallow", () => {
      expect(out).not.toMatch(/^Disallow: \/$/mu);
    });
  });

  it("keeps the docs call shape working with its disallowed paths on every group", () => {
    const out = buildRobots({
      allow: "all-ai-bots",
      sitemap: SITEMAP,
      disallowPaths: ["/api/", "/internal/", "/mcp"],
    });
    for (const group of parseGroups(out)) {
      expect(group.rules).toEqual([
        "Disallow: /api/",
        "Disallow: /internal/",
        "Disallow: /mcp",
        "Allow: /",
      ]);
    }
  });

  it("blocks training bots when allow=fetchers-only", () => {
    const out = buildRobots({ allow: "fetchers-only", sitemap: SITEMAP });
    expect(rulesFor(out, "GPTBot")).toEqual(["Disallow: /"]);
    expect(rulesFor(out, "Amazonbot")).toEqual(["Disallow: /"]);
    expect(rulesFor(out, "OAI-SearchBot")).toEqual(["Allow: /"]);
    expect(rulesFor(out, "ChatGPT-User")).toEqual(["Allow: /"]);
    expect(rulesFor(out, "*")).toEqual(["Allow: /"]);
  });

  it("blocks every AI bot but keeps * open when allow=block-all-ai", () => {
    const out = buildRobots({ allow: "block-all-ai", sitemap: SITEMAP });
    for (const token of ROBOTS_TOKENS) {
      expect(rulesFor(out, token)).toEqual(["Disallow: /"]);
    }
    expect(rulesFor(out, "*")).toEqual(["Allow: /"]);
  });

  it("closes the whole site for authenticated apps when allow=disallow-all", () => {
    const out = buildRobots({ allow: "disallow-all" });
    expect(rulesFor(out, "*")).toEqual(["Disallow: /"]);
    for (const token of ROBOTS_TOKENS) {
      expect(rulesFor(out, token)).toEqual(["Disallow: /"]);
    }
    expect(out).not.toContain("Allow: /");
    expect(out).not.toContain("Sitemap:");
  });

  it("omits the * group when omitWildcard is set", () => {
    const out = buildRobots({
      allow: "all-ai-bots",
      sitemap: SITEMAP,
      omitWildcard: true,
    });
    expect(out).not.toMatch(/^User-agent: \*$/mu);
    expect(out.startsWith("# AI training crawlers\n")).toBe(true);
  });
});
