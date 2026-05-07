export type AIBotKind = "training" | "search-index" | "user-fetch";

export interface AIBotEntry {
  /** User-Agent string that appears in robots.txt and incoming requests. */
  readonly userAgent: string;
  /** What this bot is for. */
  readonly kind: AIBotKind;
  /** Operator (informational). */
  readonly operator: string;
}

/**
 * Canonical list of AI bots as of May 2026. Update with care: removing an
 * entry will silently change the output of `buildRobots()` for every consumer.
 * Last reviewed: 2026-05-06.
 */
export const AI_BOTS: readonly AIBotEntry[] = [
  { userAgent: "GPTBot", kind: "training", operator: "OpenAI" },
  { userAgent: "OAI-SearchBot", kind: "search-index", operator: "OpenAI" },
  { userAgent: "ChatGPT-User", kind: "user-fetch", operator: "OpenAI" },
  { userAgent: "ClaudeBot", kind: "training", operator: "Anthropic" },
  {
    userAgent: "Claude-SearchBot",
    kind: "search-index",
    operator: "Anthropic",
  },
  { userAgent: "Claude-User", kind: "user-fetch", operator: "Anthropic" },
  { userAgent: "PerplexityBot", kind: "search-index", operator: "Perplexity" },
  { userAgent: "Perplexity-User", kind: "user-fetch", operator: "Perplexity" },
  {
    userAgent: "Google-Extended",
    kind: "training",
    operator: "Google (Gemini)",
  },
  {
    userAgent: "Applebot-Extended",
    kind: "training",
    operator: "Apple Intelligence",
  },
  { userAgent: "CCBot", kind: "training", operator: "Common Crawl" },
] as const;
