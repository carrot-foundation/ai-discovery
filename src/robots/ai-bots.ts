const INTENTS = [
  "training",
  "search-index",
  "user-fetch",
  "agent",
  "ai-browser",
] as const;

/**
 * Why an AI bot reaches a site. One operator usually runs several bots with
 * different intents, so the axis is the request's purpose, not the vendor.
 *
 * - `training`: collects content for model training.
 * - `search-index`: builds the index an AI search or answer engine cites from.
 * - `user-fetch`: fetches a page because a person asked an assistant now.
 * - `agent`: navigates and acts on a site on a person's behalf.
 * - `ai-browser`: a browser with a built-in assistant. Today these send a
 *   stock Chromium user agent, so no request can be attributed to one.
 *
 * New intents may appear in minor releases; give exhaustive handling a
 * default.
 */
export type AIBotIntent = (typeof INTENTS)[number];

/** Every intent, in the order `buildRobots()` emits its groups. */
export const AI_BOT_INTENTS: readonly AIBotIntent[] = Object.freeze([
  ...INTENTS,
]);

/**
 * The classification up to 1.2. `agent` and `ai-browser` fold into
 * `user-fetch`, since both act for a person in real time.
 *
 * @deprecated Use {@link AIBotIntent}.
 */
export type AIBotKind = "training" | "search-index" | "user-fetch";

/**
 * Fields every registry entry carries, whether robots.txt can address it
 * ({@link AIBotEntry}) or not ({@link AIAgentEntry}).
 */
export interface AIRegistryEntryBase {
  /** The bot's name as its operator publishes it. */
  readonly name: string;
  /** Operator (informational). */
  readonly operator: string;
  readonly intent: AIBotIntent;
  /**
   * Case-insensitive substrings that identify the bot in a request's
   * `User-Agent` header. Empty when nothing in the header identifies it:
   * robots-only control tokens such as `Google-Extended` never appear in
   * requests, and some agents send a stock browser user agent.
   */
  readonly userAgentPatterns: readonly string[];
  /**
   * The value Vercel's `bot_name` dimension reports for this bot, when the
   * bot is in Vercel's verified-bots directory
   * (https://vercel.com/docs/bot-management).
   */
  readonly vercelBotName?: string;
  /**
   * Documentation this entry was checked against: the operator's own where it
   * publishes one.
   */
  readonly source: string;
}

/** An AI bot its operator lets robots.txt address, listed in {@link AI_BOTS}. */
export interface AIBotEntry extends AIRegistryEntryBase {
  /** Product token a robots.txt `User-agent` line addresses. */
  readonly robotsToken: string;
  /**
   * The robots.txt token, as in 1.2: always equal to `robotsToken`.
   *
   * @deprecated Use `robotsToken` for robots.txt and `userAgentPatterns` or
   * `vercelBotName` to classify traffic.
   */
  readonly userAgent: string;
  /** @deprecated Use `intent`. */
  readonly kind: AIBotKind;
}

/**
 * An AI agent no robots.txt token addresses, listed in {@link AI_AGENTS}.
 * `buildRobots()` never names one.
 */
export interface AIAgentEntry extends AIRegistryEntryBase {
  /**
   * Always absent. Declared so `robotsToken` reads on an
   * {@link AIRegistryEntry}, and checking it for `undefined` tells a bot from
   * an agent. `"robotsToken" in entry` does not narrow the union.
   */
  readonly robotsToken?: never;
}

/** Any entry of {@link AI_BOTS} or {@link AI_AGENTS}. */
export type AIRegistryEntry = AIBotEntry | AIAgentEntry;

type AIBotDefinition = Omit<AIBotEntry, "userAgent" | "kind">;

const legacyKind = (intent: AIBotIntent): AIBotKind =>
  intent === "agent" || intent === "ai-browser" ? "user-fetch" : intent;

const bot = (definition: AIBotDefinition): AIBotEntry =>
  Object.freeze({
    ...definition,
    userAgentPatterns: Object.freeze([...definition.userAgentPatterns]),
    userAgent: definition.robotsToken,
    kind: legacyKind(definition.intent),
  });

const agent = (definition: AIAgentEntry): AIAgentEntry =>
  Object.freeze({
    ...definition,
    userAgentPatterns: Object.freeze([...definition.userAgentPatterns]),
  });

const OPENAI_BOTS = "https://developers.openai.com/api/docs/bots";
const ANTHROPIC_BOTS =
  "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler";
const PERPLEXITY_BOTS =
  "https://docs.perplexity.ai/docs/resources/perplexity-crawlers";
const GOOGLE_COMMON_CRAWLERS =
  "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers";
const GOOGLE_USER_TRIGGERED_FETCHERS =
  "https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers";
const APPLE_BOTS = "https://support.apple.com/en-us/119829";
const META_BOTS =
  "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/";
const AMAZON_BOTS = "https://developer.amazon.com/amazonbot";
const VERCEL_BOT_DIRECTORY = "https://vercel.com/docs/bot-management";

/**
 * Canonical registry of the AI bots robots.txt can address, ordered by
 * intent. Each entry was checked on 2026-10-19 against its operator's
 * documentation in `source`. A bot that only unverified crawler lists
 * describe stays out: `fetchers-only` would otherwise block it on a claim
 * nobody checked. Agents without a robots.txt token live in
 * {@link AI_AGENTS}.
 *
 * Update with care: every entry changes the output of `buildRobots()` for
 * every consumer, and log classification reads `userAgentPatterns` and
 * `vercelBotName`.
 */
export const AI_BOTS: readonly AIBotEntry[] = Object.freeze([
  bot({
    name: "GPTBot",
    operator: "OpenAI",
    intent: "training",
    robotsToken: "GPTBot",
    userAgentPatterns: ["GPTBot"],
    vercelBotName: "gptbot",
    source: OPENAI_BOTS,
  }),
  bot({
    name: "ClaudeBot",
    operator: "Anthropic",
    intent: "training",
    robotsToken: "ClaudeBot",
    userAgentPatterns: ["ClaudeBot"],
    vercelBotName: "claudebot",
    source: ANTHROPIC_BOTS,
  }),
  bot({
    name: "Google-Extended",
    operator: "Google (Gemini)",
    intent: "training",
    robotsToken: "Google-Extended",
    // Robots-only control token: Google crawls with its regular user agents.
    userAgentPatterns: [],
    vercelBotName: "google-extended",
    source: GOOGLE_COMMON_CRAWLERS,
  }),
  bot({
    name: "Applebot-Extended",
    operator: "Apple Intelligence",
    intent: "training",
    robotsToken: "Applebot-Extended",
    // Robots-only control token: Apple says it does not crawl.
    userAgentPatterns: [],
    source: APPLE_BOTS,
  }),
  bot({
    name: "Meta-ExternalAgent",
    operator: "Meta",
    intent: "training",
    robotsToken: "Meta-ExternalAgent",
    userAgentPatterns: ["meta-externalagent"],
    vercelBotName: "meta-externalagent",
    source: META_BOTS,
  }),
  bot({
    // Amazon's docs say Amazonbot data may train Amazon AI models; search
    // and user fetches have their own bots below.
    name: "Amazonbot",
    operator: "Amazon",
    intent: "training",
    robotsToken: "Amazonbot",
    userAgentPatterns: ["Amazonbot"],
    vercelBotName: "amazonbot",
    source: AMAZON_BOTS,
  }),
  bot({
    name: "CCBot",
    operator: "Common Crawl",
    intent: "training",
    robotsToken: "CCBot",
    userAgentPatterns: ["CCBot"],
    vercelBotName: "ccbot",
    source: "https://commoncrawl.org/ccbot",
  }),
  bot({
    name: "OAI-SearchBot",
    operator: "OpenAI",
    intent: "search-index",
    robotsToken: "OAI-SearchBot",
    userAgentPatterns: ["OAI-SearchBot"],
    vercelBotName: "oai-searchbot",
    source: OPENAI_BOTS,
  }),
  bot({
    name: "Claude-SearchBot",
    operator: "Anthropic",
    intent: "search-index",
    robotsToken: "Claude-SearchBot",
    userAgentPatterns: ["Claude-SearchBot"],
    vercelBotName: "claude-searchbot",
    source: ANTHROPIC_BOTS,
  }),
  bot({
    name: "PerplexityBot",
    operator: "Perplexity",
    intent: "search-index",
    robotsToken: "PerplexityBot",
    userAgentPatterns: ["PerplexityBot"],
    vercelBotName: "perplexitybot",
    source: PERPLEXITY_BOTS,
  }),
  bot({
    name: "Amzn-SearchBot",
    operator: "Amazon",
    intent: "search-index",
    robotsToken: "Amzn-SearchBot",
    userAgentPatterns: ["Amzn-SearchBot"],
    vercelBotName: "amzn-searchbot",
    source: AMAZON_BOTS,
  }),
  bot({
    name: "Meta-WebIndexer",
    operator: "Meta",
    intent: "search-index",
    robotsToken: "Meta-WebIndexer",
    userAgentPatterns: ["meta-webindexer"],
    vercelBotName: "meta-webindexer",
    source: META_BOTS,
  }),
  bot({
    name: "DuckAssistBot",
    operator: "DuckDuckGo",
    intent: "search-index",
    robotsToken: "DuckAssistBot",
    userAgentPatterns: ["DuckAssistBot"],
    vercelBotName: "duckassistbot",
    source:
      "https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot",
  }),
  bot({
    name: "ChatGPT-User",
    operator: "OpenAI",
    intent: "user-fetch",
    robotsToken: "ChatGPT-User",
    userAgentPatterns: ["ChatGPT-User"],
    vercelBotName: "chatgpt-user",
    source: OPENAI_BOTS,
  }),
  bot({
    name: "Claude-User",
    operator: "Anthropic",
    intent: "user-fetch",
    robotsToken: "Claude-User",
    userAgentPatterns: ["Claude-User"],
    vercelBotName: "claude-user",
    source: ANTHROPIC_BOTS,
  }),
  bot({
    name: "Perplexity-User",
    operator: "Perplexity",
    intent: "user-fetch",
    robotsToken: "Perplexity-User",
    userAgentPatterns: ["Perplexity-User"],
    vercelBotName: "perplexity-user",
    source: PERPLEXITY_BOTS,
  }),
  bot({
    name: "Meta-ExternalFetcher",
    operator: "Meta",
    intent: "user-fetch",
    robotsToken: "Meta-ExternalFetcher",
    userAgentPatterns: ["meta-externalfetcher"],
    vercelBotName: "meta-externalfetcher",
    source: META_BOTS,
  }),
  bot({
    name: "Amzn-User",
    operator: "Amazon",
    intent: "user-fetch",
    robotsToken: "Amzn-User",
    userAgentPatterns: ["Amzn-User"],
    source: AMAZON_BOTS,
  }),
]);

/**
 * AI agents that act on a site for a person and that no robots.txt token
 * addresses, so `buildRobots()` never names them; classification reads them
 * alongside {@link AI_BOTS}. Each entry was checked on 2026-10-19 against the
 * documentation in `source`: the operator's own where it publishes one,
 * otherwise the closest primary reference (Vercel's verified-bots directory
 * for Cursor).
 */
export const AI_AGENTS: readonly AIAgentEntry[] = Object.freeze([
  agent({
    // A user-triggered fetcher: Google publishes no robots.txt token for it.
    name: "Google-Agent",
    operator: "Google",
    intent: "agent",
    userAgentPatterns: ["Google-Agent"],
    vercelBotName: "google-agent",
    source: GOOGLE_USER_TRIGGERED_FETCHERS,
  }),
  agent({
    // Sends a browser user agent and signs requests with Web Bot Auth, so
    // only the verifying edge (Vercel's `chatgpt-operator`) can name it.
    name: "ChatGPT agent",
    operator: "OpenAI",
    intent: "agent",
    userAgentPatterns: [],
    vercelBotName: "chatgpt-operator",
    source:
      "https://help.openai.com/en/articles/11845367-chatgpt-agent-allowlisting",
  }),
  agent({
    // Cursor reaching MCP servers for a user's coding agent.
    name: "Cursor",
    operator: "Cursor",
    intent: "agent",
    userAgentPatterns: [],
    vercelBotName: "cursor-server",
    source: VERCEL_BOT_DIRECTORY,
  }),
]);
