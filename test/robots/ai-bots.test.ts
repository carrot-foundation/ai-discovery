import { describe, expect, it } from "vitest";
import {
  AI_BOT_INTENTS,
  AI_BOTS,
  type AIBotEntry,
  type AIBotIntent,
} from "../../src/robots/ai-bots.js";

const byName = (name: string): AIBotEntry => {
  const entry = AI_BOTS.find((b) => b.name === name);
  if (entry === undefined) throw new Error(`missing bot ${name}`);
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
        "ChatGPT agent",
        "ClaudeBot",
        "Claude-SearchBot",
        "Claude-User",
        "PerplexityBot",
        "Perplexity-User",
        "Google-Extended",
        "Google-Agent",
        "Applebot",
        "Applebot-Extended",
        "Meta-ExternalAgent",
        "Meta-ExternalFetcher",
        "Amazonbot",
        "CCBot",
        "Bytespider",
      ]),
    );
  });

  it("classifies every bot on the intent axis", () => {
    AI_BOTS.forEach((b) => {
      expect(AI_BOT_INTENTS).toContain(b.intent);
    });
  });

  it.each<[string, AIBotIntent]>([
    ["GPTBot", "training"],
    ["ClaudeBot", "training"],
    ["CCBot", "training"],
    ["Meta-ExternalAgent", "training"],
    ["Bytespider", "training"],
    ["Amazonbot", "training"],
    ["Google-Extended", "training"],
    ["Applebot-Extended", "training"],
    ["OAI-SearchBot", "search-index"],
    ["Claude-SearchBot", "search-index"],
    ["PerplexityBot", "search-index"],
    ["Applebot", "search-index"],
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
    ["Cursor", "agent"],
  ])("classifies %s as %s", (name, intent) => {
    expect(byName(name).intent).toBe(intent);
  });

  it("cites an https source for every bot", () => {
    AI_BOTS.forEach((b) => {
      expect(b.source).toMatch(/^https:\/\//u);
    });
  });

  it("keeps robots tokens, user agent patterns and Vercel names unique", () => {
    const tokens = AI_BOTS.flatMap((b) =>
      b.robotsToken === undefined ? [] : [b.robotsToken.toLowerCase()],
    );
    const patterns = AI_BOTS.flatMap((b) =>
      b.userAgentPatterns.map((p) => p.toLowerCase()),
    );
    const vercelNames = AI_BOTS.flatMap((b) =>
      b.vercelBotName === undefined ? [] : [b.vercelBotName],
    );
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(new Set(patterns).size).toBe(patterns.length);
    expect(new Set(vercelNames).size).toBe(vercelNames.length);
  });

  it("identifies a bot in requests by its own robots token when it has both", () => {
    AI_BOTS.forEach((b) => {
      if (b.robotsToken === undefined || b.userAgentPatterns.length === 0) {
        return;
      }
      expect(b.userAgentPatterns.map((p) => p.toLowerCase())).toContain(
        b.robotsToken.toLowerCase(),
      );
    });
  });

  it("freezes the registry so no consumer can change it for others", () => {
    expect(Object.isFrozen(AI_BOT_INTENTS)).toBe(true);
    expect(Object.isFrozen(AI_BOTS)).toBe(true);
    AI_BOTS.forEach((b) => {
      expect(Object.isFrozen(b)).toBe(true);
      expect(Object.isFrozen(b.userAgentPatterns)).toBe(true);
    });
  });

  it("separates robots-only control tokens from user agent patterns", () => {
    for (const name of ["Google-Extended", "Applebot-Extended"]) {
      const bot = byName(name);
      expect(bot.robotsToken).toBe(name);
      expect(bot.userAgentPatterns).toEqual([]);
    }
  });

  it("leaves robotsToken out for agents that no robots.txt group addresses", () => {
    expect(byName("Google-Agent").robotsToken).toBeUndefined();
    expect(byName("Google-Agent").userAgentPatterns).toEqual(["Google-Agent"]);
    expect(byName("ChatGPT agent").robotsToken).toBeUndefined();
    expect(byName("ChatGPT agent").vercelBotName).toBe("chatgpt-operator");
  });

  it("stores Vercel bot names in the lowercase form the bot_name dimension reports", () => {
    AI_BOTS.forEach((b) => {
      if (b.vercelBotName !== undefined) {
        expect(b.vercelBotName).toBe(b.vercelBotName.toLowerCase());
      }
    });
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

    it("mirrors robotsToken in userAgent, falling back to the name", () => {
      AI_BOTS.forEach((b) => {
        expect(b.userAgent).toBe(b.robotsToken ?? b.name);
      });
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
