# @archkit/cli

Command-line interface for Arch, a local-first architecture engine for TypeScript/JavaScript codebases.

The CLI builds a deterministic architecture graph and lets you inspect symbols, dependencies, snippets, and project knowledge without external services.

## What is Arch CLI

Arch CLI provides the `arch` command and orchestrates all core packages:

- `@archkit/parser-ts` for AST parsing and extraction
- `@archkit/graph` for graph persistence and querying
- `@archkit/context` for query-driven context compilation
- `@archkit/core` for shared graph types

## Requirements

- Node.js 18+
- A TypeScript/JavaScript repository

## Install

Global install:

```bash
pnpm add -g @archkit/cli
# or
npm install -g @archkit/cli
```

Use without global install:

```bash
pnpm dlx @archkit/cli --help
```

In this monorepo during development:

```bash
pnpm install
pnpm build
pnpm arch --help
```

## Quick start

Run these commands from the repository you want to analyze.

```bash
# 1) Build the architecture graph
arch build .

# 2) Inspect high-level stats
arch stats .

# 3) Search for symbols
arch query parser

# 4) Inspect direct dependencies for a symbol
arch deps TypeScriptParser.parseRepository

# 5) Show source snippet for a symbol
arch show TypeScriptParser.parseRepository

# 6) Compile context for a task or feature
arch context "authentication module"

# 7) Configure explicit feature mappings
arch feature assign authentication src/app/features/auth/**

# 8) Inspect configured features
arch features
arch feature authentication
```

Arch stores graph data under `.arch` in the target repository.

## Command reference

### arch

Show banner and version info.

```bash
arch
arch --help
arch --version
```

### arch build [repoPath]

Build the architecture graph for a repository.

- Default `repoPath` is `.`
- Scans TypeScript/JavaScript files
- Writes deterministic data under `.arch`

Options:

- `--json` output machine-readable JSON
- `--format <format>` output format (`human|llm`, default `human`)

Examples:

```bash
arch build
arch build .
arch build packages/arch-cli
arch build . --json
arch build . --format llm
```

### arch stats [repoPath]

Show architecture summary metrics from persisted graph metadata.

Options:

- `--json`
- `--format <format>` (`human|llm`)

Examples:

```bash
arch stats
arch stats .
arch stats . --json
arch stats . --format llm
```

### arch query [term]

Search symbols by deterministic name matching.

Options:

- `--json`
- `--format <format>` (`human|llm`)

Examples:

```bash
arch query parser
arch query TypeScriptParser
arch query parseRepository --json
arch query parse --format llm
```

### arch deps [symbol]

Show direct dependencies and callers for a symbol.

Options:

- `--json`
- `--format <format>` (`human|llm`)

Examples:

```bash
arch deps runBuildCommand
arch deps TypeScriptParser.parseRepository
arch deps TypeScriptParser.parseRepository --json
arch deps TypeScriptParser.parseRepository --format llm
```

### arch show [symbol]

Display the source snippet for a resolved symbol.

Options:

- `--json`
- `--format <format>` (`human|llm`)

Examples:

```bash
arch show runBuildCommand
arch show TypeScriptParser.parseRepository
arch show TypeScriptParser.parseRepository --json
arch show TypeScriptParser.parseRepository --format llm
```

### arch context [query]

Compile a bounded context bundle for a feature request or symbol-oriented query.

Resolution order:

1. Exact feature name match in `.arch/features.json` (case-insensitive)
2. Fallback to existing symbol/query resolution

Options:

- `--json`
- `--format <format>` (`human|llm`)

Examples:

```bash
arch context "authentication"
arch context "ContextCompiler"
arch context "dependency graph" --json
arch context "build pipeline" --format llm
arch context "command" --no-limits
```

### arch features

List configured features with matched file counts.

Options:

- `--json`
- `--format <format>` (`human|llm`) where only `human` is supported currently

Examples:

```bash
arch features
arch features --json
```

### arch features suggest

Suggest likely feature patterns from known repository files. This command does not modify config.

Options:

- `--json`
- `--format <format>` (`human|llm`) where only `human` is supported currently

Examples:

```bash
arch features suggest
arch features suggest --json
```

### arch feature <name>

Show patterns and matched files for one configured feature.

Options:

- `--json`
- `--format <format>` (`human|llm`) where only `human` is supported currently

Examples:

```bash
arch feature authentication
arch feature authentication --json
```

### arch feature assign <feature> <pattern>

Add a feature pattern to `.arch/features.json` (creates file if needed).

Options:

- `--json`
- `--format <format>` (`human|llm`) where only `human` is supported currently

Examples:

```bash
arch feature assign authentication src/app/features/auth/**
arch feature assign billing packages/billing/**
arch feature assign authentication src/app/features/auth/** --json
```

### arch feature unmapped

List source files not mapped to any configured feature.

Options:

- `--json`
- `--format <format>` (`human|llm`) where only `human` is supported currently

Examples:

```bash
arch feature unmapped
arch feature unmapped --json
```

### arch knowledge

Manage architecture knowledge entries persisted locally.

#### arch knowledge add

Add a knowledge entry.

Required options:

- `--type <type>`
- `--title <title>`
- `--body <body>`

Optional:

- `--feature <feature>` (default: `general`)
- `--tags <tags>` comma-separated
- `--json`
- `--format <format>` (`human|llm`)

Example:

```bash
arch knowledge add \
  --type decision \
  --title "Use deterministic sorting" \
  --body "All node and edge outputs are sorted for stable tests." \
  --feature parser \
  --tags deterministic,testing
```

#### arch knowledge list

List all stored knowledge entries.

```bash
arch knowledge list
arch knowledge list --json
arch knowledge list --format llm
```

#### arch knowledge show <id>

Show one knowledge entry by id.

```bash
arch knowledge show use-deterministic-sorting
arch knowledge show use-deterministic-sorting --json
```

#### arch knowledge search <query>

Search knowledge by text query.

```bash
arch knowledge search deterministic
arch knowledge search architecture --format llm
```

## Output modes

Most commands support both output flags:

- `--json` for machine-readable output
- `--format <format>` for explicit output mode (`human|llm`)

Use `human` for terminal readability and `llm` for concise model-oriented context.

Notes:

- `llm` is supported for `query`, `deps`, `show`, `context`, and `knowledge`.
- `llm` is not supported for `build`, `stats`, `features`, and `feature` commands.

## Feature mapping config

Feature mappings are explicit and config-driven via `.arch/features.json`.

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

Behavior:

- feature names are normalized for case-insensitive lookup
- pattern matching is deterministic and repository-relative
- overlaps are allowed (files may match multiple features)
- suggestions never auto-write config; use `arch feature assign` to persist mappings

## Typical workflow

```bash
# build once after pulling code changes
arch build .

# inspect and navigate
arch stats .
arch query <term>
arch deps <symbol>
arch show <symbol>

# prepare context for design, review, or implementation work
arch context "feature description"
```

## Troubleshooting

- If a query command returns no graph data, run `arch build` first for that repository.
- If symbol resolution is ambiguous, use a more specific symbol name.
- Re-run `arch build` after source code changes to refresh `.arch` data.
- If feature commands return no graph/index data, run `arch build` first.
- If `features.json` is invalid, Arch returns an actionable validation error.

## Project links

- Repository: [Github](https://github.com/brent-broeckx/archkit)
- Main docs: [README.md](https://github.com/brent-broeckx/archkit/blob/main/README.md)
- Architecture notes: [Architecture](https://github.com/brent-broeckx/archkit/blob/main/ARCHITECTURE.md)
