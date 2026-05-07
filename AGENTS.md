# AGENTS.md

Guidance for automated coding agents when working in this repository.

## Repo

`@carrot-foundation/ai-discovery` is a public npm package that provides AI and
LLM discovery primitives for the Carrot Network: JSON-LD, llms.txt, robots, and
a Markdown mirror.

This is an independent repo, not part of the Carrot Nx or Turbo monorepos. Use
Node `>=22` (`.nvmrc` currently points at 24.13.1), pnpm 10.29.3, and the
ESM-first package layout with CJS dual output. The package is Apache-2.0.

Phase 0 status: only merge release-triggering changes after Cristiano has
reviewed the package PR and tarball. Release-triggering merges to `main`
publish automatically after CI succeeds.

## Commands

```bash
pnpm install --frozen-lockfile

pnpm test
pnpm test:watch
pnpm vitest run test/jsonld/article.test.ts
pnpm vitest -t "regex"

pnpm build
pnpm type-check
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm spell-check

pnpm fix
pnpm check
pnpm check-types-exports
```

Use `pnpm install --frozen-lockfile` to match CI. Do not use plain
`pnpm install` for reproducible runs.

`pnpm check` is the full local gate and mirrors `.github/workflows/ci.yml`:
format, lint, type-check, spell-check, test, build, exported types, dry-run
pack, and production audit. Run it before opening a PR.

Pre-commit uses Husky plus lint-staged. Staged files run ESLint fix, Prettier,
and cspell. Commit messages are checked with commitlint.

## Architecture

Each top-level domain under `src/<module>/` ships as a separate subpath export
plus the root barrel. When adding a module, keep these public-surface files in
sync:

1. `package.json` `exports` with import and require pairs
2. `tsup.config.ts` `entry`
3. `src/index.ts` namespaced re-export

```text
src/
  index.ts
  jsonld/
  robots/
  llms-txt/
  md-mirror/
```

## Implementation Rules

- Keep builders pure. Modules should return strings or plain objects with no I/O
  and no framework coupling, except `md-mirror`, which returns a
  `Request -> Response` handler.
- Use Zod validation helpers from `src/jsonld/types.ts`. Reuse `isoDate`,
  `url`, `language`, and `schemaId` instead of adding new regexes.
- Use `schemaId(siteOrigin, kind, payload?)` for deterministic JSON-LD `@id`
  values.
- Use `compose(nodes)` for the canonical JSON-LD `{ "@context", "@graph" }`
  output shape.
- Keep robot allow modes aligned with `RobotsAllowMode`: `all-ai-bots`,
  `fetchers-only`, and `block-all-ai`. Add new bots in
  `src/robots/ai-bots.ts` with the correct `kind`.
- Mirror tests under `test/<module>/<file>.test.ts` for source files under
  `src/<module>/<file>.ts`. Vitest only picks up `test/**/*.test.ts`.

## TypeScript

The repo uses strict TypeScript with `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and
`moduleResolution: Bundler`.

- Use `import type` for type-only imports.
- Use `.js` extensions in relative imports.
- Omit optional fields instead of setting them to `undefined`.
- Narrow indexed access results before use.

## Release

Semantic-release runs on `main` through `.github/workflows/release.yml` after
the `Check Code` workflow succeeds for a `main` push. Manual `workflow_dispatch`
is kept only as a recovery path. Do not bump `version` manually; it stays
`0.0.0-development`. The release workflow writes a tarball to `dist-tarball/`,
uploads it to the GitHub release, and publishes through npm trusted publishing.

## Commits

Use Conventional Commits. Commitlint allows the standard types: `feat`, `fix`,
`refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`, `chore`, and
`revert`. Prefer module-aligned scopes such as `jsonld`, `robots`, `llms-txt`,
or `md-mirror` when useful.
