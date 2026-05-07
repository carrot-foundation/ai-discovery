import { AI_BOTS, type AIBotKind } from "./ai-bots.js";

export type RobotsAllowMode = "all-ai-bots" | "fetchers-only" | "block-all-ai";

export interface BuildRobotsOptions {
  readonly allow: RobotsAllowMode;
  readonly sitemap: string;
  readonly disallowPaths?: readonly string[];
  /** Opt out of emitting the universal `User-agent: *` block. */
  readonly omitWildcard?: boolean;
}

const FETCHER_KINDS: readonly AIBotKind[] = ["search-index", "user-fetch"];

const isAllowedFor = (mode: RobotsAllowMode, kind: AIBotKind): boolean => {
  if (mode === "block-all-ai") return false;
  if (mode === "all-ai-bots") return true;
  return FETCHER_KINDS.includes(kind);
};

export const buildRobots = ({
  allow,
  sitemap,
  disallowPaths = [],
  omitWildcard = false,
}: BuildRobotsOptions): string => {
  const lines: string[] = [];

  if (!omitWildcard) {
    lines.push("User-agent: *");
    for (const path of disallowPaths) lines.push(`Disallow: ${path}`);
    lines.push("Allow: /");
    lines.push("");
  }

  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot.userAgent}`);
    for (const path of disallowPaths) lines.push(`Disallow: ${path}`);
    lines.push(isAllowedFor(allow, bot.kind) ? "Allow: /" : "Disallow: /");
    lines.push("");
  }

  lines.push(`Sitemap: ${sitemap}`);
  return `${lines.join("\n")}\n`;
};
