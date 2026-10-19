import { AI_BOT_INTENTS, AI_BOTS, type AIBotIntent } from "./ai-bots.js";

const ALLOW_MODES = [
  "all-ai-bots",
  "fetchers-only",
  "block-all-ai",
  "disallow-all",
] as const;

/**
 * - `all-ai-bots`: every AI bot allowed, each one named explicitly.
 * - `fetchers-only`: training crawlers blocked, everything else allowed.
 * - `block-all-ai`: every AI bot with a robots.txt token blocked; other
 *   crawlers stay allowed.
 * - `disallow-all`: the whole site closed to every crawler, for
 *   authenticated apps with nothing to index.
 *
 * User-triggered fetchers and agents act for a person in real time and may
 * not honor robots.txt; agents without a token are never named.
 */
export type RobotsAllowMode = (typeof ALLOW_MODES)[number];

export interface BuildRobotsOptions {
  readonly allow: RobotsAllowMode;
  /** Omit when the site has no sitemap, such as an authenticated app. */
  readonly sitemap?: string;
  readonly disallowPaths?: readonly string[];
  /**
   * Opt out of emitting the universal `User-agent: *` block. Not allowed with
   * `disallow-all`, which must close the site to every crawler.
   */
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
 *
 * @throws When `allow` is not a known mode, or when `disallow-all` is combined
 * with `omitWildcard`.
 */
export const buildRobots = ({
  allow,
  sitemap,
  disallowPaths = [],
  omitWildcard = false,
}: BuildRobotsOptions): string => {
  // Untyped callers can pass anything; an unknown mode must not open the site.
  if (!(ALLOW_MODES as readonly string[]).includes(allow)) {
    throw new Error(`Unknown robots allow mode: ${String(allow)}`);
  }
  if (allow === "disallow-all" && omitWildcard) {
    throw new Error(
      "disallow-all closes the site to every crawler and needs the User-agent: * group",
    );
  }

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
