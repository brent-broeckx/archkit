# Arch

Arch is a local-first architecture engine for codebases.

It analyzes TypeScript and JavaScript repositories using deterministic static analysis and produces an architecture graph that can be queried by developers and tools.

## MVP focus

- TypeScript / JavaScript repositories
- deterministic AST-based analysis (no AI dependency)
- local execution
- fast graph generation

## Monorepo packages

- `@archkit/core` — shared types and interfaces
- `@archkit/parser-ts` — TypeScript parser and extraction scaffolding
- `@archkit/graph` — graph storage and traversal scaffolding
- `@archkit/context` — context compilation scaffolding
- `@archkit/cli` — `arch` command scaffolding

## Quick start

```bash
pnpm install
pnpm build
pnpm exec arch
```

## Testing

Arch uses Vitest for unit, integration, and command-level regression tests.

Run tests:

```bash
pnpm test
```

Run in watch mode:

```bash
pnpm run test:watch
```

Run with coverage:

```bash
pnpm run test:coverage
```

Current quality gate:

- global coverage thresholds: `80%` for lines, statements, branches, and functions

## CI and CD

### Pull request validation

GitHub Actions workflow `CI` runs on every pull request to `main` and on pushes to `main`.

GitHub Actions workflow `Changeset Required` runs on pull requests to `main` and fails when package source files change without a `.changeset/*.md` entry.

It enforces:

- dependency install with frozen lockfile
- package build (`pnpm -r build`)
- typecheck (`pnpm typecheck`)
- tests with coverage (`pnpm run test:coverage`)

This workflow is intended to be a required status check before merge.

### Release automation

This repository uses Changesets for lockstep versioning and npm publishing.

Release workflow `Release` runs on `main`:

1. It runs install, build, typecheck, and tests again.
2. If pending changesets exist, it opens or updates a `Version Packages` pull request.
3. When that pull request is merged, it publishes packages to npm and creates release tags.

### Add a changeset

Before merging a package change, run:

```bash
pnpm changeset
```

Commit the generated file in `.changeset/` with your pull request.

### Required GitHub repository setup

1. Add repository secret `NPM_TOKEN` with publish permission for the `@archkit` scope.
2. Enable branch protection on `main`.
3. Require status check `Build and Test` from workflow `CI`.
4. Require status check `Enforce changeset for package source changes` from workflow `Changeset Required`.
5. Require at least one pull request review.
6. Disable direct pushes to `main`.

Testing strategy highlights:

- deterministic assertions only (stable sorting, normalized paths, fixed fixture data)
- core service coverage across parser, graph persistence/querying, and context compilation
- command coverage for `build`, `stats`, `query`, `deps`, `show`, `context`, `feature(s)`, and `knowledge` flows
- CLI wiring coverage through `program` command routing tests
- filesystem-backed integration fixtures for `.arch` graph and knowledge storage behavior

## Commands

- `arch build` (implemented)
- `arch stats` (implemented)
- `arch query` (implemented)
- `arch deps` (implemented)
- `arch show` (implemented)
- `arch context` (implemented)
- `arch features` (implemented)
- `arch features suggest` (implemented)
- `arch feature <name>` (implemented)
- `arch feature assign <feature> <pattern>` (implemented)
- `arch feature unmapped` (implemented)
- `arch knowledge add|list|show|search` (implemented)

### `arch build`

Builds the architecture graph from source files and writes deterministic output under `.arch`.

Examples:

```bash
pnpm arch build
pnpm arch build .
pnpm arch build packages/arch-cli
pnpm arch build . --json
```

Current limitations / notes:

- scans TypeScript/JavaScript files only in MVP
- output reflects code state at build time; run `arch build` again after code changes
- graph location depends on current working directory and `repoPath`

### `arch stats`

Reads `.arch/graph/graph-meta.json` and prints repository architecture summary counts.

Examples:

```bash
pnpm arch stats
pnpm arch stats .
pnpm arch stats packages/arch-parser-ts
pnpm arch stats . --json
```

Current limitations / notes:

- requires an existing build (`arch build`) for the same target directory
- shows aggregate counts only (no per-file/per-symbol breakdown yet)

### `arch query`

Searches indexed symbols and prints deterministic grouped matches.

Examples:

```bash
pnpm arch query TypeScriptParser
pnpm arch query parse
pnpm arch query buildProgram
pnpm arch query parser --json
pnpm arch query parser --format llm
```

Current limitations / notes:

- matching is case-insensitive substring over symbol names
- searches symbol index only (no semantic/fuzzy ranking)
- requires `.arch` data from a prior build in the same working directory

### `arch deps`

Shows direct dependencies for a symbol: `Imports`, `Calls`, and reverse `Callers`.

Examples:

```bash
pnpm arch deps runBuildCommand
pnpm arch deps TypeScriptParser
pnpm arch deps TypeScriptParser.parseRepository
pnpm arch deps method:packages/arch-parser-ts/src/services/type-script-parser.ts#TypeScriptParser.parseRepository
pnpm arch deps TypeScriptParser.parseRepository --json
pnpm arch deps TypeScriptParser.parseRepository --format llm
```

Current limitations / notes:

- direct depth-1 dependencies only (non-transitive)
- class input aggregates method-level dependencies for that class
- call detection is static and deterministic; dynamic/runtime-only dispatch patterns may not resolve
- ambiguous symbol input fails with a deterministic candidate list

### `arch show`

Displays the exact source snippet for a resolved symbol using stored AST line ranges.

Examples:

```bash
pnpm arch show runBuildCommand
pnpm arch show TypeScriptParser.parseRepository
pnpm arch show function:packages/arch-cli/src/commands/build.ts#runBuildCommand
pnpm arch show runBuildCommand --json
pnpm arch show runBuildCommand --format llm
```

Current limitations / notes:

- shows exact node span (`startLine..endLine`) only; no extra context lines yet
- ambiguous symbol input fails with a deterministic candidate list
- snippet extraction depends on source file paths matching the built graph

### `arch context`

Compiles deterministic context bundles for a free-text query or symbol-like input.

Resolution order:

1. If the query exactly matches a configured feature name in `.arch/features.json` (case-insensitive), context is seeded from that feature mapping.
2. Otherwise, Arch falls back to existing symbol/query resolution behavior.

Examples:

```bash
pnpm arch context authentication
pnpm arch context TypeScriptParser.parseRepository
pnpm arch context method:packages/arch-parser-ts/src/services/type-script-parser.ts#TypeScriptParser.parseRepository
pnpm arch context parser --json
pnpm arch context parser --format llm
pnpm arch context command --no-limits
```

Current limitations / notes:

- graph expansion is bounded (depth 3) and deterministic
- context budgets are enforced: max snippets `20`, max files `12`, max lines `1200`
- query scoring is deterministic but intentionally lightweight in MVP
- use `--no-limits` to disable context output limits and return all matched artifacts

### `arch features`

Lists configured features from `.arch/features.json` and matched file counts.

Examples:

```bash
pnpm arch features
pnpm arch features --json
```

Current limitations / notes:

- source of truth is `.arch/features.json`
- file counts are based on persisted files index from a prior `arch build`
- `--format llm` is not supported for this command

### `arch features suggest`

Suggests likely feature mappings from repository file structure. Suggestions are helper-only and do not mutate config.

Examples:

```bash
pnpm arch features suggest
pnpm arch features suggest --json
```

Current limitations / notes:

- suggestions are conservative and deterministic
- suggestions are not authoritative mappings
- requires `.arch` data from a prior `arch build`
- `--format llm` is not supported for this command

### `arch feature <name>`

Shows patterns and matched files for one configured feature.

Examples:

```bash
pnpm arch feature authentication
pnpm arch feature authentication --json
```

Current limitations / notes:

- feature lookup is case-insensitive and normalized internally
- returns only configured feature details (not inferred features)
- requires `.arch` file index from a prior `arch build` for matched files
- `--format llm` is not supported for this command

### `arch feature assign <feature> <pattern>`

Adds or updates feature mappings in `.arch/features.json`.

Examples:

```bash
pnpm arch feature assign authentication src/app/features/auth/**
pnpm arch feature assign billing packages/billing/**
pnpm arch feature assign authentication src/app/features/auth/** --json
```

Current limitations / notes:

- creates `.arch/features.json` if missing
- feature keys are normalized to lowercase slug form
- duplicate patterns are detected and not duplicated
- writes deterministic, stable JSON ordering
- `--format llm` is not supported for this command

### `arch feature unmapped`

Lists source files known to Arch that do not match any configured feature pattern.

Examples:

```bash
pnpm arch feature unmapped
pnpm arch feature unmapped --json
```

Current limitations / notes:

- reports files only (not symbols)
- requires `.arch` data from a prior `arch build`
- `--format llm` is not supported for this command

### Feature mapping config (`.arch/features.json`)

Feature mappings are explicit and user-defined.

Example:

```json
{
	"authentication": [
		"src/app/features/auth/**",
		"libs/auth/**"
	],
	"billing": [
		"src/app/features/billing/**",
		"packages/billing/**"
	]
}
```

Rules:

- top-level keys are feature names
- values are arrays of repository-relative path patterns
- matching is deterministic and local-only
- overlapping matches are allowed (a file can belong to multiple features)

### `arch knowledge`

Stores and retrieves architecture notes as local markdown entries under `.arch/knowledge`.

Examples:

```bash
pnpm arch knowledge add \
	--type workaround \
	--feature authentication \
	--title "OIDC clock skew issue" \
	--body "Allow 2 minute skew because some client machines had incorrect system time." \
	--tags oidc,auth

pnpm arch knowledge list
pnpm arch knowledge show oidc-clock-skew-issue
pnpm arch knowledge search "clock skew"
pnpm arch knowledge show oidc-clock-skew-issue --json
pnpm arch knowledge search authentication --format llm
```

Current limitations / notes:

- supported types: `decision`, `workaround`, `caveat`, `note`, `migration`
- ids are generated deterministically from title (slug format)
- duplicate ids are rejected
- entries are persisted in markdown with frontmatter and indexed in `.arch/knowledge/index.json`
- search is deterministic case-insensitive substring matching over id, title, feature, tags, and body

## Output Modes

Arch supports three output modes:

- default human-readable terminal output
- JSON output with `--json`
- markdown output with `--format llm`

Flag behavior:

- `--json` takes precedence over `--format`
- supported `--format` values are `human` and `llm`
- `llm` format is currently available for `query`, `deps`, `show`, and `context`
- `llm` format is not supported for `build`, `stats`, `features`, and `feature` commands

JSON error shape:

```json
{
	"error": {
		"code": "<ERROR_CODE>",
		"message": "<human-readable message>"
	}
}
```

### Working directory behavior

Use a consistent working directory for `build`, `stats`, `query`, `deps`, `show`, and `context`.

- recommended: run from repository root with `pnpm arch ...`
- using `pnpm --filter @archkit/cli arch ...` runs from `packages/arch-cli` and uses that folder's `.arch` data

For full product requirements, see `MVP.md`.
