import { AI_BOTS, type AIBotEntry } from "./ai-bots.js";

const PATTERNS = AI_BOTS.flatMap((bot) =>
  bot.userAgentPatterns.map((pattern) => ({
    pattern: pattern.toLowerCase(),
    bot,
  })),
).sort((a, b) => b.pattern.length - a.pattern.length);

/**
 * Finds the AI bot a request's `User-Agent` header identifies. The longest
 * matching pattern wins. A user agent is self-declared: verify it (published
 * IP ranges, reverse DNS, Web Bot Auth) before trusting it.
 */
export const classifyUserAgent = (
  userAgent: string | null | undefined,
): AIBotEntry | undefined => {
  const header = userAgent?.toLowerCase() ?? "";
  if (header.trim() === "") return undefined;
  return PATTERNS.find(({ pattern }) => header.includes(pattern))?.bot;
};

/** Finds the AI bot for a value of Vercel's `bot_name` dimension. */
export const findByVercelBotName = (
  botName: string | null | undefined,
): AIBotEntry | undefined => {
  const name = botName?.trim().toLowerCase() ?? "";
  if (name === "") return undefined;
  return AI_BOTS.find((bot) => bot.vercelBotName === name);
};
