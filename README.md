# @carrot-foundation/ai-discovery

[![npm version](https://img.shields.io/npm/v/@carrot-foundation/ai-discovery)](https://www.npmjs.com/package/@carrot-foundation/ai-discovery)
[![CI](https://img.shields.io/github/actions/workflow/status/carrot-foundation/ai-discovery/ci.yml?branch=main)](https://github.com/carrot-foundation/ai-discovery/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

AI discovery primitives for the Carrot Network: Schema.org JSON-LD builders,
`llms.txt` generators, AI-aware `robots.txt` helpers, Markdown mirror routes,
read-only MCP scaffolding, keyword search, IndexNow submission helpers, and a
public docs glossary client.

Use this package when a public Carrot site or compatible ecosystem tool needs
to expose the same content clearly to search engines, AI crawlers, LLM clients,
and human developers.

## Status

Release-triggering merges to `main` publish automatically after CI succeeds, so
only merge them after Cristiano has reviewed the package PR and tarball.

## Installation

```bash
pnpm add @carrot-foundation/ai-discovery
# or
npm install @carrot-foundation/ai-discovery
```

Requires Node.js `>=22`. The package is ESM-first and ships CommonJS dual
output for consumers that still use `require()`.

## What It Provides

| Module          | Import path                                  | Purpose                                                         |
| --------------- | -------------------------------------------- | --------------------------------------------------------------- |
| JSON-LD         | `@carrot-foundation/ai-discovery/jsonld`     | Build validated Schema.org graph nodes for public pages.        |
| Robots          | `@carrot-foundation/ai-discovery/robots`     | Generate `robots.txt` policies for known AI bots.               |
| llms.txt        | `@carrot-foundation/ai-discovery/llms-txt`   | Generate `/llms.txt` and `/llms-full.txt` style Markdown files. |
| Markdown mirror | `@carrot-foundation/ai-discovery/md-mirror`  | Create a `Request -> Response` Markdown route handler.          |
| MCP server      | `@carrot-foundation/ai-discovery/mcp-server` | Register read-only tools and handle Streamable HTTP lifecycle.  |
| Orama search    | `@carrot-foundation/ai-discovery/orama`      | Build, search, serialize, and restore keyword-only indexes.     |
| IndexNow        | `@carrot-foundation/ai-discovery/index-now`  | Normalize, chunk, submit, and summarize IndexNow URL batches.   |
| Glossary client | `@carrot-foundation/ai-discovery/glossary`   | Query the public Carrot Docs MCP glossary tool with cache.      |
| Identity        | `@carrot-foundation/ai-discovery/identity`   | The canonical Carrot `Organization` and founder `Person`.       |
| Root namespace  | `@carrot-foundation/ai-discovery`            | Namespaced exports for all modules.                             |

## Quick Start

### Add JSON-LD to a page

```typescript
import { carrotOrganization } from "@carrot-foundation/ai-discovery/identity";
import {
  article,
  compose,
  website,
} from "@carrot-foundation/ai-discovery/jsonld";

const graph = compose([
  carrotOrganization(),
  website({
    name: "Carrot Documentation",
    url: "https://docs.carrot.eco",
    inLanguage: ["en", "pt-BR"],
    searchUrlTemplate: "https://docs.carrot.eco/search?q={query}",
  }),
  article({
    url: "https://docs.carrot.eco/docs/concepts/dmrv",
    headline: "Digital Measurement, Reporting and Verification",
    description:
      "How Carrot structures source data, evidence, and verification.",
    datePublished: "2026-04-15",
    dateModified: "2026-05-01",
    author: {
      name: "Jane Doe",
      url: "https://example.com/jane",
    },
    inLanguage: "en",
    image: "https://docs.carrot.eco/og/docs/concepts/dmrv.png",
  }),
]);

const jsonLd = JSON.stringify(graph);
```

Render `jsonLd` in an `application/ld+json` script tag. Builders validate input
with Zod before returning plain objects, so invalid URLs, dates, language tags,
or missing required fields fail early.

### Generate an AI-aware robots.txt

```typescript
import { buildRobots } from "@carrot-foundation/ai-discovery/robots";

export function GET() {
  return new Response(
    buildRobots({
      allow: "fetchers-only",
      sitemap: "https://docs.carrot.eco/sitemap.xml",
      disallowPaths: ["/api/", "/internal/"],
    }),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
}
```

`allow` supports four modes:

| Mode            | Behavior                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `all-ai-bots`   | Allows every known AI bot, each named explicitly. The policy for content sites. |
| `fetchers-only` | Blocks training crawlers and allows search indexes and user fetchers.           |
| `block-all-ai`  | Blocks every bot in `AI_BOTS`; other crawlers stay allowed.                     |
| `disallow-all`  | Closes the whole site to every crawler, for authenticated apps.                 |

The output has one group per bot intent, each headed by a comment, after the
`User-agent: *` group. A crawler obeys only the most specific group naming it,
so `disallowPaths` repeat in every allowed group. `sitemap` is optional; omit it
for sites with nothing to index:

```typescript
buildRobots({ allow: "disallow-all" });
// User-agent: *
// Disallow: /
// ...one `Disallow: /` group per AI bot intent
```

No mode names `Applebot`, Apple's general crawler behind Spotlight, Siri and
Safari search: it is not an AI bot. Apple's AI training opt-out is the
`Applebot-Extended` token, which every mode names.

robots.txt only binds crawlers that honor it. Fetchers and agents acting on a
user's request may not, and the agents in `AI_AGENTS` (Google-Agent, ChatGPT
agent, Cursor) have no robots token, so no mode names them. `disallow-all`
cannot be combined with `omitWildcard`, and an unknown `allow` value throws.

### Classify AI bot traffic

`AI_BOTS` lists the AI bots robots.txt can address, and `AI_AGENTS` the AI
agents it cannot. Entries in both carry:

| Field               | Meaning                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `name`, `operator`  | The bot as its operator names it.                                                           |
| `intent`            | `training`, `search-index`, `user-fetch`, `agent`, or `ai-browser` (`AI_BOT_INTENTS`).      |
| `robotsToken`       | The robots.txt `User-agent` token. `AI_BOTS` entries only.                                  |
| `userAgentPatterns` | Case-insensitive substrings that identify the bot in a request's `User-Agent` header.       |
| `vercelBotName`     | The value of Vercel's `bot_name` dimension, when Vercel's verified-bots directory lists it. |
| `source`            | The documentation the entry was checked against: the operator's own where it publishes one. |

Robots-only control tokens such as `Google-Extended` and `Applebot-Extended`
have a `robotsToken` but no `userAgentPatterns`: they never appear in requests.
Agents that send a stock browser user agent, such as ChatGPT agent, are known
only by `vercelBotName`. AI browsers such as ChatGPT Atlas and Perplexity Comet
send a stock Chromium user agent, so no entry can identify them.

```typescript
import {
  classifyUserAgent,
  findByVercelBotName,
} from "@carrot-foundation/ai-discovery/robots";

classifyUserAgent(request.headers.get("user-agent"))?.intent;
// "user-fetch" for ChatGPT-User, undefined for a browser

findByVercelBotName("chatgpt-operator")?.intent; // "agent"
```

Both search `AI_BOTS` and `AI_AGENTS` and return an `AIRegistryEntry`: an
`AIBotEntry` when `robotsToken` is set, an `AIAgentEntry` otherwise. A user
agent is self-declared. Verify it (published IP ranges, reverse DNS, Web Bot
Auth) before trusting it.

The fields from 1.2 remain on every `AI_BOTS` entry and are deprecated:
`userAgent` equals `robotsToken`, and `kind` folds `agent` and `ai-browser`
into `user-fetch`. `AI_AGENTS` entries carry neither.

### Migrating from 1.x

Version 2 changes the robots module:

- `buildRobots()` emits one group per bot intent instead of one block per bot.
  Each group opens with a `#` comment line and lists several `User-agent` lines
  before its rules, as RFC 9309 allows:

  ```text
  # AI training crawlers
  User-agent: GPTBot
  User-agent: ClaudeBot
  ...
  Disallow: /
  ```

  Code that splits the output on blank lines and reads one `User-agent` per
  block breaks. A test that maps each block's first line to the rule on its
  second line now reads `# AI training crawlers` as the user agent and
  `User-agent: GPTBot` as its rule. Parse groups instead: every `User-agent`
  line in a block shares the rules that follow them.

- `AIBotEntry` has new required fields: `name`, `intent`, `robotsToken`,
  `userAgentPatterns` and `source`. Code that builds its own entries must set
  them.

- The registry adds Amazonbot and Meta-ExternalAgent (training),
  Amzn-SearchBot, Meta-WebIndexer and DuckAssistBot (search index), and
  Meta-ExternalFetcher and Amzn-User (user fetch). `fetchers-only` now blocks
  the two new training crawlers, and `block-all-ai` blocks all seven.

- `buildRobots()` throws on an unknown `allow` value, and on `disallow-all`
  combined with `omitWildcard`. `RobotsAllowMode` gains `disallow-all`, so an
  exhaustive `switch` over it needs the new case.

- Agents without a robots.txt token (Google-Agent, ChatGPT agent, Cursor) live
  in `AI_AGENTS`, not `AI_BOTS`.

- `userAgent` and `kind` remain on `AIBotEntry`, deprecated in favor of
  `robotsToken` and `intent`.

### Build llms.txt files

```typescript
import {
  buildFull,
  buildIndex,
} from "@carrot-foundation/ai-discovery/llms-txt";

const index = buildIndex({
  site: {
    name: "Carrot Documentation",
    url: "https://docs.carrot.eco",
    tagline: "The public reference for the Carrot Network.",
  },
  sections: [
    {
      title: "Concepts",
      urls: [
        {
          title: "dMRV",
          url: "https://docs.carrot.eco/docs/concepts/dmrv",
          description:
            "Digital Measurement, Reporting and Verification in Carrot.",
        },
      ],
    },
  ],
});

const full = buildFull({
  pages: [
    {
      title: "dMRV",
      url: "https://docs.carrot.eco/docs/concepts/dmrv",
      markdown: "# dMRV\n\nDigital Measurement, Reporting and Verification.",
    },
  ],
});
```

`buildIndex()` escapes Markdown-sensitive text and formats URLs for a compact
index file. `buildFull()` concatenates page Markdown with source URL comments
so LLM clients can trace each block back to its canonical page.

### Expose a Markdown mirror route

```typescript
import { createMdMirrorRoute } from "@carrot-foundation/ai-discovery/md-mirror";

export const GET = createMdMirrorRoute<{ slug?: string[] }>({
  async load({ params }) {
    const slug = params.slug?.join("/") ?? "index";
    const page = await loadPageAsMarkdown(slug);

    if (page === null) return null;

    return {
      markdown: page.markdown,
      sourceUrl: `https://docs.carrot.eco/docs/${slug}`,
    };
  },
});
```

The route helper returns `404` when `load()` returns `null`, otherwise it serves
`text/markdown; charset=utf-8`, sets `x-source-url`, and applies a cache-control
header. The default cache policy is `public, max-age=300, s-maxage=86400`.

### Serve Markdown on the canonical URL

`prefersMarkdown(accept)` reads a request's `Accept` header and decides whether
the canonical URL should answer with the page's Markdown instead of its HTML:

```typescript
import { prefersMarkdown } from "@carrot-foundation/ai-discovery/md-mirror";

prefersMarkdown("text/markdown"); // true
prefersMarkdown("text/markdown, text/html;q=0.9"); // true
prefersMarkdown("text/markdown, */*"); // true: named beats a wildcard
prefersMarkdown("text/html, text/markdown"); // false: a named tie keeps HTML
prefersMarkdown("*/*"); // false
prefersMarkdown(null); // false
```

It respects q-values and lets the most specific media range win. Markdown wins
when `text/markdown` weighs strictly more than `text/html`. At equal weight
above 0, a range that names `text/markdown` beats `text/html` matched only
through `text/*` or `*/*`, so `text/markdown, */*` gets Markdown. Equal weight
keeps HTML when both are named, or when both match through wildcards alone. A
Markdown weight of 0, a header with any malformed range or a missing header
keeps HTML too. Ranges match on type and subtype alone: parameters other than
`q` are ignored, so `text/markdown;profile=x` counts as `text/markdown`. They must
still be well-formed `name=value` pairs, so `text/markdown;foo` is malformed
and keeps HTML. The header is read as sent: type and subtype take ASCII token
characters only and match case-insensitively on A-Z, and only space and tab
count as whitespace, so a non-breaking space or a Kelvin sign is malformed and
keeps HTML. Send `Vary: Accept` on any response that depends on it.

### Describe Carrot the same way everywhere

The `identity` module holds the one Carrot entity every Carrot site asserts:

```typescript
import {
  CARROT_ORGANIZATION,
  carrotOrganization,
} from "@carrot-foundation/ai-discovery/identity";
import { compose, website } from "@carrot-foundation/ai-discovery/jsonld";
import { buildIndex } from "@carrot-foundation/ai-discovery/llms-txt";

const graph = compose([
  carrotOrganization(),
  website({
    name: "Carrot Documentation",
    url: "https://docs.carrot.eco",
    inLanguage: ["en", "pt-BR"],
  }),
]);

const index = buildIndex({
  site: {
    name: CARROT_ORGANIZATION.name,
    url: "https://docs.carrot.eco",
    tagline: CARROT_ORGANIZATION.description,
  },
  sections: [],
});
```

`carrotOrganization()` returns the `Organization` node: name `Carrot`, alternate
name `Carrot Foundation`, one logo, Carrot's own profiles in `sameAs`, and the
`@id` the Carrot sites already publish. Its founder, Ian McKee, is embedded as a
`Person` (`carrotFounder()`), which carries his personal profiles.

### Register read-only MCP tools

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerReadOnlyTool } from "@carrot-foundation/ai-discovery/mcp-server";

const server = new McpServer({ name: "carrot-docs", version: "1.0.0" });

registerReadOnlyTool(server, {
  name: "search_docs",
  title: "Search docs",
  description: "Search public Carrot documentation.",
  inputSchema: {
    query: z.string(),
  },
  handler: (input) => ({
    results: searchPublicDocs(input.query),
  }),
});
```

`registerReadOnlyTool()` applies the same safe annotations to each tool:
`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and
`openWorldHint: false`. `createMcpHttpHandler()` provides a generic Streamable
HTTP request lifecycle with app-provided rate keys, host-gated telemetry, and
tool-name allowlists so raw bodies, raw IP-derived keys, headers, and prompt text
are not emitted by the library.

### Build a keyword search index

```typescript
import {
  buildSearchIndex,
  searchIndex,
  serializeSearchIndex,
} from "@carrot-foundation/ai-discovery/orama";

const index = await buildSearchIndex([
  {
    id: "en/blog/massid",
    title: "MassID launch",
    url: "https://www.carrot.eco/en/blog/massid",
    text: "MassID traceability for circular economy data.",
    locale: "en",
    kind: "post",
  },
]);

const results = await searchIndex(index, { query: "massid", limit: 5 });
const serialized = serializeSearchIndex(index);
```

The Orama wrapper is keyword-only in `1.1.0`. Embeddings and cross-property
federation are intentionally left to later phases.

### Submit IndexNow URL batches

```typescript
import {
  chunkIndexNowUrls,
  formatGitHubActionsSummary,
  submitIndexNowUrls,
} from "@carrot-foundation/ai-discovery/index-now";

const urls = [
  "https://www.carrot.eco/en",
  "https://www.carrot.eco/en/blog/massid",
];

const indexNowKey = process.env.INDEXNOW_KEY;
if (!indexNowKey) {
  throw new Error("INDEXNOW_KEY is required");
}

for (const batch of chunkIndexNowUrls(urls)) {
  const result = await submitIndexNowUrls({
    host: "www.carrot.eco",
    key: indexNowKey,
    keyLocation: "https://www.carrot.eco/indexnow-key.txt",
    urls: batch,
    fetch,
  });

  console.log(formatGitHubActionsSummary(result));
}
```

`normalizeIndexNowUrls()` keeps only unique HTTPS URLs under the configured host.
Non-2xx responses return typed failures without including raw response bodies.
Set `INDEXNOW_KEY` before calling `submitIndexNowUrls()`.

### Query the public docs glossary MCP

```typescript
import {
  createDocsGlossaryClient,
  createMemoryGlossaryCache,
  getGlossaryTerm,
} from "@carrot-foundation/ai-discovery/glossary";

const glossary = createDocsGlossaryClient({
  endpoint: "https://docs.carrot.eco/mcp",
  fetch,
  cache: createMemoryGlossaryCache({ ttlMs: 60_000 }),
});

const trc = await getGlossaryTerm(glossary, { term: "TRC", locale: "en" });
```

The glossary client is scoped to the public `get_glossary_term` tool. It sends no
`Authorization` header by default and caches normalized term-locale lookups when
a cache is provided.

## JSON-LD Builders

The JSON-LD module exports builders for the public page types Carrot sites use
most often:

| Builder            | Schema.org node                                              |
| ------------------ | ------------------------------------------------------------ |
| `apiReference()`   | `APIReference` with a `WebAPI` target.                       |
| `article()`        | `BlogPosting`, `Article`, `TechArticle`, or `HowTo`.         |
| `breadcrumbList()` | `BreadcrumbList`.                                            |
| `definedTerm()`    | `DefinedTerm`.                                               |
| `definedTermSet()` | `DefinedTermSet`.                                            |
| `faqPage()`        | `FAQPage`.                                                   |
| `organization()`   | `Organization`, with optional `alternateName` and `founder`. |
| `person()`         | `Person`, with an optional stable `id`.                      |
| `podcastEpisode()` | `PodcastEpisode`, with optional media and platform links.    |
| `podcastSeries()`  | `PodcastSeries`, with optional web feed and platform links.  |
| `speakable()`      | `SpeakableSpecification`.                                    |
| `website()`        | `WebSite`, with optional `SearchAction`.                     |

Use `compose(nodes)` for the canonical output shape:

```json
{
  "@context": "https://schema.org",
  "@graph": []
}
```

Use `schemaId(siteOrigin, kind, payload?)` when you need deterministic `@id`
values for custom nodes.

## Design Principles

- Builders are pure. They return strings or plain objects and do not perform
  I/O.
- Validation happens at the boundary through Zod schemas.
- Optional fields are omitted when absent instead of being set to `undefined`.
- AI bot policy is explicit and generated from a reviewed list.
- Markdown outputs preserve canonical source URLs for traceability.
- Each top-level module is available as a subpath export for smaller consumer
  bundles.

## Project Structure

```text
src/
  index.ts          # Root namespaced exports
  jsonld/           # Schema.org JSON-LD builders and validation helpers
  robots/           # AI bot registry and robots.txt builder
  llms-txt/         # llms.txt index and full-content builders
  md-mirror/        # Request -> Response Markdown route helper
  mcp-server/       # Read-only MCP registration and HTTP lifecycle helpers
  orama/            # Keyword search index helpers
  index-now/        # IndexNow URL normalization and submission helpers
  glossary/         # Carrot Docs glossary MCP client
  identity/         # Canonical Carrot Organization and founder
test/
  jsonld/
  robots/
  llms-txt/
  md-mirror/
  mcp-server/
  orama/
  index-now/
  glossary/
  identity/
```

When adding a new top-level module, keep the public surface in sync:

1. Add import and require pairs to `package.json` `exports`.
2. Add the module entry to `tsup.config.ts`.
3. Add a namespaced re-export to `src/index.ts`.
4. Mirror tests under `test/<module>/`.

## Development

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm type-check
pnpm lint
pnpm format:check
pnpm spell-check
pnpm check
```

`pnpm check` is the full local gate and mirrors CI: format, lint, type-check,
spell-check, tests, build, exported type checks, dry-run packing, and production
audit.

Useful focused commands:

```bash
pnpm vitest run test/jsonld/article.test.ts
pnpm vitest -t "robots"
pnpm check-types-exports
pnpm pack --dry-run
```

## Release

Releases are automated with semantic-release from `main` after the `Check Code`
workflow succeeds for a push. Manual `workflow_dispatch` is kept as a recovery
path.

Do not bump `version` manually. It stays `0.0.0-development`; semantic-release
determines the published version from Conventional Commits.

## Related Carrot Projects

- [`@carrot-foundation/schemas`](https://github.com/carrot-foundation/schemas)
  provides Zod validation schemas and generated JSON Schemas for Carrot
  metadata.
- [`carrot-foundation/methodology-rules`](https://github.com/carrot-foundation/methodology-rules)
  provides open-source rule processors for the Carrot dMRV pipeline.
- [Carrot Documentation](https://docs.carrot.eco) is the public reference for
  Carrot concepts, methodologies, and integration guides.

## License

[Apache License 2.0](./LICENSE). See [NOTICE](./NOTICE) for attribution,
trademark, and warranty notes.
