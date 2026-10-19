import { describe, expect, it } from "vitest";
import {
  AI_AGENTS,
  AI_BOT_INTENTS,
  AI_BOTS,
  type AIBotIntent,
  type AIRegistryEntry,
} from "../../src/robots/ai-bots.js";

const ENTRIES: readonly AIRegistryEntry[] = [...AI_BOTS, ...AI_AGENTS];

const byName = (name: string): AIRegistryEntry => {
  const entry = ENTRIES.find((b) => b.name === name);
  if (entry === undefined) throw new Error(`missing entry ${name}`);
  return entry;
};

describe("AI_BOTS", () => {
  it("includes every bot the analytics taxonomy names", () => {
    const names = AI_BOTS.map((b) => b.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "GPTBot",
        "OAI-SearchBot",
        "ChatGPT-User",
        "ClaudeBot",
        "Claude-SearchBot",
        "Claude-User",
        "PerplexityBot",
        "Perplexity-User",
        "Google-Extended",
        "Applebot-Extended",
        "Meta-ExternalAgent",
        "Meta-ExternalFetcher",
        "Amazonbot",
        "CCBot",
      ]),
    );
  });

  // RFC 9309 §2.2.1: a product token is letters, `-` and `_`.
  it("gives every bot a robots token and mirrors it in userAgent", () => {
    AI_BOTS.forEach((b) => {
      expect(b.robotsToken).toMatch(/^[A-Za-z_-]+$/u);
      expect(b.userAgent).toBe(b.robotsToken);
    });
  });

  // Applebot is Apple's general crawler (Spotlight, Siri, Safari search);
  // Apple's AI training opt-out is the Applebot-Extended token.
  it("carries Applebot-Extended but no entry for Applebot", () => {
    expect(ENTRIES.map((b) => b.name)).not.toContain("Applebot");
    const identifiers = ENTRIES.flatMap((b) => [
      ...(b.robotsToken === undefined ? [] : [b.robotsToken]),
      ...b.userAgentPatterns,
      ...(b.vercelBotName === undefined ? [] : [b.vercelBotName]),
    ]).map((id) => id.toLowerCase());
    expect(identifiers).not.toContain("applebot");
    expect(byName("Applebot-Extended").robotsToken).toBe("Applebot-Extended");
  });

  it("identifies a bot in requests by its own robots token when it has patterns", () => {
    AI_BOTS.forEach((b) => {
      if (b.userAgentPatterns.length === 0) return;
      expect(b.userAgentPatterns.map((p) => p.toLowerCase())).toContain(
        b.robotsToken.toLowerCase(),
      );
    });
  });

  it("separates robots-only control tokens from user agent patterns", () => {
    for (const name of ["Google-Extended", "Applebot-Extended"]) {
      const bot = byName(name);
      expect(bot.robotsToken).toBe(name);
      expect(bot.userAgentPatterns).toEqual([]);
    }
  });

  describe("fields kept from 1.2", () => {
    it("keeps userAgent and kind for every bot 1.2 shipped", () => {
      const legacy: readonly [string, string][] = [
        ["GPTBot", "training"],
        ["OAI-SearchBot", "search-index"],
        ["ChatGPT-User", "user-fetch"],
        ["ClaudeBot", "training"],
        ["Claude-SearchBot", "search-index"],
        ["Claude-User", "user-fetch"],
        ["PerplexityBot", "search-index"],
        ["Perplexity-User", "user-fetch"],
        ["Google-Extended", "training"],
        ["Applebot-Extended", "training"],
        ["CCBot", "training"],
      ];
      for (const [userAgent, kind] of legacy) {
        const bot = AI_BOTS.find((b) => b.userAgent === userAgent);
        expect(bot?.kind).toBe(kind);
      }
    });

    it("keeps AI_BOTS assignable to the 1.2 entry shape", () => {
      // The assignment is the check: type-check fails if a 1.2 field turns
      // optional or `kind` widens past the 1.2 values.
      const legacy: readonly {
        userAgent: string;
        kind: "training" | "search-index" | "user-fetch";
        operator: string;
      }[] = AI_BOTS;
      expect(legacy).toBe(AI_BOTS);
    });

    it("folds agent and ai-browser intents into the user-fetch kind", () => {
      AI_BOTS.forEach((b) => {
        expect(b.kind).toBe(
          b.intent === "agent" || b.intent === "ai-browser"
            ? "user-fetch"
            : b.intent,
        );
      });
    });
  });
});

describe("AI_AGENTS", () => {
  it("lists the agents that no robots.txt token addresses", () => {
    expect(AI_AGENTS.map((a) => a.name)).toEqual([
      "Google-Agent",
      "ChatGPT agent",
    ]);
    AI_AGENTS.forEach((a) => {
      expect(a.intent).toBe("agent");
    });
  });

  it("gives agents no robots token and none of the 1.2 fields", () => {
    AI_AGENTS.forEach((a) => {
      expect("robotsToken" in a).toBe(false);
      expect("userAgent" in a).toBe(false);
      expect("kind" in a).toBe(false);
    });
  });

  it("shares no name with AI_BOTS", () => {
    const bots = new Set(AI_BOTS.map((b) => b.name));
    AI_AGENTS.forEach((a) => {
      expect(bots.has(a.name)).toBe(false);
    });
  });

  it("identifies each agent by its user agent pattern or its Vercel name", () => {
    expect(byName("Google-Agent").userAgentPatterns).toEqual(["Google-Agent"]);
    expect(byName("ChatGPT agent").userAgentPatterns).toEqual([]);
    expect(byName("ChatGPT agent").vercelBotName).toBe("chatgpt-operator");
  });
});

describe("AI_BOTS and AI_AGENTS", () => {
  // AGENTS.md: each entry cites the operator's documentation in `source`.
  // ByteDance publishes none we can reach, and an entry backed only by public
  // crawler directories would let `fetchers-only` block a bot on an unverified
  // claim.
  it("carries no entry for Bytespider until ByteDance documents its crawler", () => {
    const identifiers = ENTRIES.flatMap((b) => [
      b.name,
      b.operator,
      ...(b.robotsToken === undefined ? [] : [b.robotsToken]),
      ...b.userAgentPatterns,
    ]);
    expect(identifiers.join("\n")).not.toMatch(/bytespider|bytedance/iu);
  });

  // Same rule: Cursor documents no agent identifier, and `cursor-server` is
  // described only by Vercel's directory and third-party lists.
  it("carries no entry for Cursor until Cursor documents its agent", () => {
    expect(ENTRIES.map((b) => b.operator)).not.toContain("Cursor");
    expect(ENTRIES.map((b) => b.vercelBotName)).not.toContain("cursor-server");
  });

  it("classifies every bot and agent on the intent axis", () => {
    ENTRIES.forEach((b) => {
      expect(AI_BOT_INTENTS).toContain(b.intent);
    });
  });

  it.each<[string, AIBotIntent]>([
    ["GPTBot", "training"],
    ["ClaudeBot", "training"],
    ["CCBot", "training"],
    ["Meta-ExternalAgent", "training"],
    ["Amazonbot", "training"],
    ["Google-Extended", "training"],
    ["Applebot-Extended", "training"],
    ["OAI-SearchBot", "search-index"],
    ["Claude-SearchBot", "search-index"],
    ["PerplexityBot", "search-index"],
    ["Amzn-SearchBot", "search-index"],
    ["Meta-WebIndexer", "search-index"],
    ["DuckAssistBot", "search-index"],
    ["ChatGPT-User", "user-fetch"],
    ["Claude-User", "user-fetch"],
    ["Perplexity-User", "user-fetch"],
    ["Meta-ExternalFetcher", "user-fetch"],
    ["Amzn-User", "user-fetch"],
    ["Google-Agent", "agent"],
    ["ChatGPT agent", "agent"],
  ])("classifies %s as %s", (name, intent) => {
    expect(byName(name).intent).toBe(intent);
  });

  it("cites an https source for every bot and agent", () => {
    ENTRIES.forEach((b) => {
      expect(b.source).toMatch(/^https:\/\//u);
    });
  });

  it("keeps names, robots tokens, user agent patterns and Vercel names unique", () => {
    const names = ENTRIES.map((b) => b.name.toLowerCase());
    const tokens = AI_BOTS.map((b) => b.robotsToken.toLowerCase());
    const patterns = ENTRIES.flatMap((b) =>
      b.userAgentPatterns.map((p) => p.toLowerCase()),
    );
    const vercelNames = ENTRIES.flatMap((b) =>
      b.vercelBotName === undefined ? [] : [b.vercelBotName],
    );
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(new Set(patterns).size).toBe(patterns.length);
    expect(new Set(vercelNames).size).toBe(vercelNames.length);
  });

  it("freezes both registries so no consumer can change them for others", () => {
    expect(Object.isFrozen(AI_BOT_INTENTS)).toBe(true);
    expect(Object.isFrozen(AI_BOTS)).toBe(true);
    expect(Object.isFrozen(AI_AGENTS)).toBe(true);
    ENTRIES.forEach((b) => {
      expect(Object.isFrozen(b)).toBe(true);
      expect(Object.isFrozen(b.userAgentPatterns)).toBe(true);
    });
  });

  it("stores Vercel bot names in the lowercase form the bot_name dimension reports", () => {
    ENTRIES.forEach((b) => {
      if (b.vercelBotName !== undefined) {
        expect(b.vercelBotName).toBe(b.vercelBotName.toLowerCase());
      }
    });
  });
});
