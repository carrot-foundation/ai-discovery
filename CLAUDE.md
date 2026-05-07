# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Repo

`@carrot-foundation/ai-discovery` — public npm package providing AI/LLM discovery primitives (JSON-LD, llms.txt, robots, Markdown mirror) for the Carrot Network. Phase 0: do not publish until the package PR and tarball are reviewed.

Independent repo (not part of Carrot Nx/Turbo monorepos). Node `>=22` (`.nvmrc` 24.13.1), pnpm 10.29.3, ESM-first with CJS dual output. Apache-2.0.

## Commands

```bash
pnpm install --frozen-lockfile   # match CI; never use plain `pnpm install` for reproducible runs

pnpm test                        # vitest run --passWithNoTests
pnpm test:watch
pnpm vitest run test/jsonld/article.test.ts   # single file
pnpm vitest -t "regex"                         # filter by test name

pnpm build                       # tsup → ESM + CJS + d.ts/d.cts, clean dist/
pnpm type-check                  # tsc --noEmit (includes src/** and test/**)
pnpm lint                        # eslint, cached at .cache/eslint
pnpm lint:fix
pnpm format                      # prettier --write .
pnpm format:check                # prettier --check . (CI gate)
pnpm spell-check                 # cspell — add new project terms to cspell.config.cjs `words`

pnpm fix                         # lint:fix + format (run after a failing `check`)
pnpm check                       # full CI gate: format → lint → type → spell → test → build → check-types-exports → pack:dry-run → audit:prod
pnpm check-types-exports         # @arethetypeswrong/cli, profile node16 — must pass for dual-publish
```

`pnpm check` mirrors `.github/workflows/ci.yml`. Run it before opening a PR.

Pre-commit (Husky + lint-staged, see `lint-staged.config.js`): runs `eslint --fix`, `prettier --write`, and `cspell` on staged files. `commit-msg` runs commitlint.

## Architecture

Each top-level domain under `src/<module>/` ships as a separate subpath export plus the root barrel. The public surface is defined in three places that must stay in sync — adding a module requires updating all three:

1. `package.json` `exports` (and the `import`/`require` pairs)
2. `tsup.config.ts` `entry`
3. `src/index.ts` (namespaced re-export)

```
src/
  index.ts             # barrel: namespaced re-exports (jsonld, robots, llmsTxt, mdMirror)
  jsonld/              # Schema.org node builders + compose() → @graph document
  robots/              # buildRobots() + AI_BOTS catalog (kind: search-index | user-fetch | training | …)
  llms-txt/            # buildIndex() / buildFull() generators
  md-mirror/           # createMdMirrorRoute() — Next.js App Router handler factory
```

Conventions:

- **Pure builders.** Modules export pure functions returning strings or plain objects. No I/O, no framework coupling except `md-mirror` (returns a `Request → Response` handler).
- **Zod for validation.** Shared primitives (`isoDate`, `url`, `language`, `schemaId`) live in `src/jsonld/types.ts`. Reuse them; don't re-derive ISO/URL regexes.
- **`schemaId(siteOrigin, kind, payload?)`** produces stable `@id` URIs (`<origin>/#<kind>-<sha1[0:8]>`). Use for any node that needs a deterministic identity.
- **`compose(nodes)`** wraps node builders into a single `{ "@context", "@graph" }` document — that's the canonical JSON-LD output shape.
- **`robots` `RobotsAllowMode`**: `all-ai-bots` | `fetchers-only` | `block-all-ai`. `fetchers-only` allows kinds in `FETCHER_KINDS` (`search-index`, `user-fetch`); training-only crawlers get `Disallow: /`. Add new bots in `src/robots/ai-bots.ts` with the correct `kind`.
- **Tests mirror source** — `test/<module>/<file>.test.ts` for every `src/<module>/<file>.ts`. Vitest only picks up `test/**/*.test.ts`.

## TypeScript

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: Bundler`. Implications:

- Use `import type` for type-only imports (verbatim module syntax enforces it).
- Relative imports use `.js` extensions (NodeNext-compatible).
- Optional fields must be **omitted**, not set to `undefined`.
- Indexed access (`arr[i]`, `obj[key]`) is `T | undefined` — narrow before use.

## Release

Semantic-release on `main` via the manual `release` workflow (`workflow_dispatch`, see `.releaserc.json`). Conventional Commits drive versions. `@semantic-release/npm` writes a tarball to `dist-tarball/` and publishes via npm trusted publishing (id-token). Do not bump `version` manually — it stays `0.0.0-development`.

## Commits

Conventional Commits enforced by commitlint + Husky `commit-msg`. Standard types only (`feat fix refactor docs test style perf build ci chore revert`); no project-specific scope rules — keep scopes module-aligned (`jsonld`, `robots`, `llms-txt`, `md-mirror`) when useful.
