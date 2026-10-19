import { AI_AGENTS, AI_BOTS, type AIRegistryEntry } from "./ai-bots.js";

const ENTRIES: readonly AIRegistryEntry[] = [...AI_BOTS, ...AI_AGENTS];

const PATTERNS = ENTRIES.flatMap((entry) =>
  entry.userAgentPatterns.map((pattern) => ({
    pattern: pattern.toLowerCase(),
    entry,
  })),
).sort((a, b) => b.pattern.length - a.pattern.length);

/**
 * Finds the AI bot or agent a request's `User-Agent` header identifies, in
 * `AI_BOTS` or `AI_AGENTS`. The longest matching pattern wins. A user agent is
 * self-declared: verify it (published IP ranges, reverse DNS, Web Bot Auth)
 * before trusting it.
 */
export const classifyUserAgent = (
  userAgent: string | null | undefined,
): AIRegistryEntry | undefined => {
  const header = userAgent?.toLowerCase() ?? "";
  if (header.trim() === "") return undefined;
  return PATTERNS.find(({ pattern }) => header.includes(pattern))?.entry;
};

/**
 * Finds the AI bot or agent, in `AI_BOTS` or `AI_AGENTS`, for a value of
 * Vercel's `bot_name` dimension.
 */
export const findByVercelBotName = (
  botName: string | null | undefined,
): AIRegistryEntry | undefined => {
  const name = botName?.trim().toLowerCase() ?? "";
  if (name === "") return undefined;
  return ENTRIES.find((entry) => entry.vercelBotName === name);
};
