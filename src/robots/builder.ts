import { AI_BOT_INTENTS, AI_BOTS, type AIBotIntent } from "./ai-bots.js";

/**
 * - `all-ai-bots`: every AI bot allowed, each one named explicitly.
 * - `fetchers-only`: training crawlers blocked, everything else allowed.
 * - `block-all-ai`: every AI bot blocked; other crawlers stay allowed.
 * - `disallow-all`: the whole site closed to every crawler, for
 *   authenticated apps with nothing to index.
 */
export type RobotsAllowMode =
  | "all-ai-bots"
  | "fetchers-only"
  | "block-all-ai"
  | "disallow-all";

export interface BuildRobotsOptions {
  readonly allow: RobotsAllowMode;
  /** Omit when the site has no sitemap, such as an authenticated app. */
  readonly sitemap?: string;
  readonly disallowPaths?: readonly string[];
  /** Opt out of emitting the universal `User-agent: *` block. */
  readonly omitWildcard?: boolean;
}

const GROUP_COMMENTS: Readonly<Record<AIBotIntent, string>> = {
  training: "AI training crawlers",
  "search-index": "AI search indexes",
  "user-fetch": "AI fetchers acting on a user request",
  agent: "AI agents acting on a user request",
  "ai-browser": "AI browsers",
};

const isAllowedFor = (mode: RobotsAllowMode, intent: AIBotIntent): boolean => {
  switch (mode) {
    case "all-ai-bots":
      return true;
    case "fetchers-only":
      return intent !== "training";
    case "block-all-ai":
    case "disallow-all":
      return false;
  }
};

const rules = (allowed: boolean, disallowPaths: readonly string[]): string[] =>
  allowed
    ? [...disallowPaths.map((path) => `Disallow: ${path}`), "Allow: /"]
    : ["Disallow: /"];

/**
 * Builds robots.txt with one group per bot intent. A crawler obeys only the
 * most specific group naming it, so `disallowPaths` repeat in every allowed
 * group.
 */
export const buildRobots = ({
  allow,
  sitemap,
  disallowPaths = [],
  omitWildcard = false,
}: BuildRobotsOptions): string => {
  const groups: string[][] = [];

  if (!omitWildcard) {
    groups.push([
      "User-agent: *",
      ...rules(allow !== "disallow-all", disallowPaths),
    ]);
  }

  for (const intent of AI_BOT_INTENTS) {
    const tokens = AI_BOTS.flatMap((bot) =>
      bot.intent === intent && bot.robotsToken !== undefined
        ? [bot.robotsToken]
        : [],
    );
    if (tokens.length === 0) continue;
    groups.push([
      `# ${GROUP_COMMENTS[intent]}`,
      ...tokens.map((token) => `User-agent: ${token}`),
      ...rules(isAllowedFor(allow, intent), disallowPaths),
    ]);
  }

  if (sitemap !== undefined) groups.push([`Sitemap: ${sitemap}`]);
  return `${groups.map((group) => group.join("\n")).join("\n\n")}\n`;
};
