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
| Root namespace  | `@carrot-foundation/ai-discovery`            | Namespaced exports for all modules.                             |

## Quick Start

### Add JSON-LD to a page

```typescript
import {
  article,
  compose,
  organization,
  website,
} from "@carrot-foundation/ai-discovery/jsonld";

const graph = compose([
  organization({
    name: "Carrot Foundation",
    url: "https://carrot.eco",
    logo: "https://carrot.eco/logo.png",
    description: "Public infrastructure for environmental assets.",
  }),
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
      name: "Carrot Foundation",
      sameAs: ["https://carrot.eco"],
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

`allow` supports three modes:

| Mode            | Behavior                                                     |
| --------------- | ------------------------------------------------------------ |
| `all-ai-bots`   | Allows known AI training, search-index, and user-fetch bots. |
| `fetchers-only` | Allows search and user-fetch bots, blocks training bots.     |
| `block-all-ai`  | Blocks all known AI bots listed by this package.             |

The canonical bot list lives in `AI_BOTS`, with each entry classified as
`training`, `search-index`, or `user-fetch`.

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

for (const batch of chunkIndexNowUrls(urls)) {
  const result = await submitIndexNowUrls({
    host: "www.carrot.eco",
    key: process.env.INDEXNOW_KEY ?? "",
    keyLocation: "https://www.carrot.eco/indexnow-key.txt",
    urls: batch,
    fetch,
  });

  console.log(formatGitHubActionsSummary(result));
}
```

`normalizeIndexNowUrls()` keeps only unique HTTPS URLs under the configured host.
Non-2xx responses return typed failures without including raw response bodies.

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

| Builder            | Schema.org node                                      |
| ------------------ | ---------------------------------------------------- |
| `apiReference()`   | `APIReference` with a `WebAPI` target.               |
| `article()`        | `BlogPosting`, `Article`, `TechArticle`, or `HowTo`. |
| `breadcrumbList()` | `BreadcrumbList`.                                    |
| `definedTerm()`    | `DefinedTerm`.                                       |
| `definedTermSet()` | `DefinedTermSet`.                                    |
| `faqPage()`        | `FAQPage`.                                           |
| `organization()`   | `Organization`.                                      |
| `person()`         | `Person`.                                            |
| `speakable()`      | `SpeakableSpecification`.                            |
| `website()`        | `WebSite`, with optional `SearchAction`.             |

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
test/
  jsonld/
  robots/
  llms-txt/
  md-mirror/
  mcp-server/
  orama/
  index-now/
  glossary/
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
