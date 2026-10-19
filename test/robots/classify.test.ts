import { describe, expect, it } from "vitest";
import { AI_BOTS } from "../../src/robots/ai-bots.js";
import {
  classifyUserAgent,
  findByVercelBotName,
} from "../../src/robots/classify.js";

// User agent strings as the operators publish them (see each entry's `source`).
const USER_AGENTS = {
  gptBot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot",
  oaiSearchBot:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot",
  chatGptUser:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  perplexityUser:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
  applebot:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
  amazonbot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1) Chrome/119.0.6045.214 Safari/537.36",
  amznSearchBot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.6045.214 Safari/537.36",
  metaExternalAgent:
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  ccBot: "CCBot/2.0 (https://commoncrawl.org/faq/)",
  perplexityBot:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  duckAssistBot:
    "DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)",
  amznUser:
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-User/0.1) Chrome/119.0.6045.214 Safari/537.36",
  googleAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-Agent; +https://developers.google.com/crawling/docs/crawlers-fetchers/google-agent) Chrome/137.0.0.0 Safari/537.36",
  googlebot:
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
} as const;

describe("classifyUserAgent", () => {
  it.each([
    [USER_AGENTS.gptBot, "GPTBot", "training"],
    [USER_AGENTS.oaiSearchBot, "OAI-SearchBot", "search-index"],
    [USER_AGENTS.chatGptUser, "ChatGPT-User", "user-fetch"],
    [USER_AGENTS.perplexityUser, "Perplexity-User", "user-fetch"],
    [USER_AGENTS.applebot, "Applebot", "search-index"],
    [USER_AGENTS.amazonbot, "Amazonbot", "training"],
    [USER_AGENTS.amznSearchBot, "Amzn-SearchBot", "search-index"],
    [USER_AGENTS.metaExternalAgent, "Meta-ExternalAgent", "training"],
    [USER_AGENTS.ccBot, "CCBot", "training"],
    [USER_AGENTS.perplexityBot, "PerplexityBot", "search-index"],
    [USER_AGENTS.duckAssistBot, "DuckAssistBot", "search-index"],
    [USER_AGENTS.amznUser, "Amzn-User", "user-fetch"],
    [USER_AGENTS.googleAgent, "Google-Agent", "agent"],
  ])("classifies %s", (userAgent, name, intent) => {
    const bot = classifyUserAgent(userAgent);
    expect(bot?.name).toBe(name);
    expect(bot?.intent).toBe(intent);
  });

  it("matches patterns regardless of case", () => {
    expect(classifyUserAgent("CLAUDE-USER/1.0")?.name).toBe("Claude-User");
  });

  it("classifies every pattern in the registry back to its own bot", () => {
    for (const bot of AI_BOTS) {
      for (const pattern of bot.userAgentPatterns) {
        const userAgent = `Mozilla/5.0 (compatible; ${pattern}/1.0)`;
        expect(classifyUserAgent(userAgent)?.name).toBe(bot.name);
      }
    }
  });

  it("never attributes a request to a robots-only control token", () => {
    expect(classifyUserAgent(USER_AGENTS.googlebot)).toBeUndefined();
    expect(classifyUserAgent("Google-Extended")).toBeUndefined();
  });

  it("matches by substring, so text containing Applebot reads as Applebot", () => {
    expect(classifyUserAgent("Applebot-Extended")?.name).toBe("Applebot");
  });

  it("returns undefined for browsers, empty and missing headers", () => {
    expect(classifyUserAgent(USER_AGENTS.chrome)).toBeUndefined();
    expect(classifyUserAgent("")).toBeUndefined();
    expect(classifyUserAgent(null)).toBeUndefined();
    expect(classifyUserAgent(undefined)).toBeUndefined();
  });
});

describe("findByVercelBotName", () => {
  it.each([
    ["claude-user", "Claude-User", "user-fetch"],
    ["oai-searchbot", "OAI-SearchBot", "search-index"],
    ["meta-externalfetcher", "Meta-ExternalFetcher", "user-fetch"],
    ["chatgpt-operator", "ChatGPT agent", "agent"],
    ["cursor-server", "Cursor", "agent"],
    ["google-agent", "Google-Agent", "agent"],
    ["ccbot", "CCBot", "training"],
  ])("maps %s", (botName, name, intent) => {
    const bot = findByVercelBotName(botName);
    expect(bot?.name).toBe(name);
    expect(bot?.intent).toBe(intent);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(findByVercelBotName(" GPTBot ")?.name).toBe("GPTBot");
  });

  it("returns undefined for unknown, empty and missing names", () => {
    expect(findByVercelBotName("googlebot")).toBeUndefined();
    expect(findByVercelBotName("")).toBeUndefined();
    expect(findByVercelBotName(null)).toBeUndefined();
    expect(findByVercelBotName(undefined)).toBeUndefined();
  });
});
