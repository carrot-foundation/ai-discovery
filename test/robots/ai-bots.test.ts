import { describe, expect, it } from "vitest";
import { AI_BOTS, type AIBotEntry } from "../../src/robots/ai-bots.js";

describe("AI_BOTS", () => {
  it("includes every canonical AI bot known in May 2026", () => {
    const userAgents = AI_BOTS.map((b) => b.userAgent);
    expect(userAgents).toEqual(
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
        "CCBot",
      ]),
    );
  });

  it("classifies every bot as training, search-index, or user-fetch", () => {
    AI_BOTS.forEach((b: AIBotEntry) => {
      expect(["training", "search-index", "user-fetch"]).toContain(b.kind);
    });
  });
});
