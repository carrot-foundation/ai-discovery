import { describe, expect, it } from "vitest";
import { AI_AGENTS, AI_BOTS } from "../../src/robots/ai-bots.js";
import { buildRobots, type RobotsAllowMode } from "../../src/robots/builder.js";

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

const ROBOTS_TOKENS = AI_BOTS.map((b) => b.robotsToken);

const ALLOW_MODES: readonly RobotsAllowMode[] = [
  "all-ai-bots",
  "fetchers-only",
  "block-all-ai",
  "disallow-all",
];

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

  it.each(ALLOW_MODES)("names no Bytespider group when allow=%s", (allow) => {
    expect(buildRobots({ allow })).not.toMatch(/bytespider/iu);
  });

  // Applebot is Apple's general crawler; Applebot-Extended is the AI opt-out.
  it.each(ALLOW_MODES)(
    "names Applebot-Extended but never Applebot when allow=%s",
    (allow) => {
      const userAgents = parseGroups(buildRobots({ allow })).flatMap(
        (g) => g.userAgents,
      );
      expect(userAgents).toContain("Applebot-Extended");
      expect(userAgents).not.toContain("Applebot");
    },
  );

  it("addresses every bot in AI_BOTS, and only those", () => {
    const out = buildRobots({ allow: "all-ai-bots", sitemap: SITEMAP });
    const userAgents = parseGroups(out).flatMap((g) => g.userAgents);
    expect([...userAgents].sort()).toEqual(["*", ...ROBOTS_TOKENS].sort());
  });

  it.each(ALLOW_MODES)(
    "never names an agent from AI_AGENTS when allow=%s",
    (allow) => {
      const out = buildRobots({ allow });
      for (const agent of AI_AGENTS) {
        expect(out).not.toContain(agent.name);
      }
    },
  );

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

  it("renders the docs call shape exactly", () => {
    const rules = ["Disallow: /api/", "Disallow: /internal/", "Disallow: /mcp"];
    const group = (comment: string, tokens: readonly string[]) =>
      [`# ${comment}`, ...tokens.map((t) => `User-agent: ${t}`), ...rules]
        .concat("Allow: /")
        .join("\n");
    const expected = [
      ["User-agent: *", ...rules, "Allow: /"].join("\n"),
      group("AI training crawlers", [
        "GPTBot",
        "ClaudeBot",
        "Google-Extended",
        "Applebot-Extended",
        "Meta-ExternalAgent",
        "Amazonbot",
        "CCBot",
      ]),
      group("AI search indexes", [
        "OAI-SearchBot",
        "Claude-SearchBot",
        "PerplexityBot",
        "Amzn-SearchBot",
        "Meta-WebIndexer",
        "DuckAssistBot",
      ]),
      group("AI fetchers acting on a user request", [
        "ChatGPT-User",
        "Claude-User",
        "Perplexity-User",
        "Meta-ExternalFetcher",
        "Amzn-User",
      ]),
      `Sitemap: ${SITEMAP}`,
    ].join("\n\n");
    expect(
      buildRobots({
        allow: "all-ai-bots",
        sitemap: SITEMAP,
        disallowPaths: ["/api/", "/internal/", "/mcp"],
      }),
    ).toBe(`${expected}\n`);
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

  it("keeps disallowed paths on allowed groups and closes blocked ones when allow=fetchers-only", () => {
    const out = buildRobots({
      allow: "fetchers-only",
      disallowPaths: ["/api/"],
    });
    expect(rulesFor(out, "GPTBot")).toEqual(["Disallow: /"]);
    expect(rulesFor(out, "OAI-SearchBot")).toEqual([
      "Disallow: /api/",
      "Allow: /",
    ]);
    expect(rulesFor(out, "*")).toEqual(["Disallow: /api/", "Allow: /"]);
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

  it("refuses to leave the * group out of disallow-all", () => {
    expect(() =>
      buildRobots({ allow: "disallow-all", omitWildcard: true }),
    ).toThrow(/disallow-all/u);
  });

  it("throws on an unknown mode instead of opening the site", () => {
    const allow = "disallow_all" as unknown as RobotsAllowMode;
    expect(() => buildRobots({ allow })).toThrow(/disallow_all/u);
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
